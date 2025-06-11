import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { Server, Socket } from "socket.io";
import dbConnect from "./dbConnect";
import http from "http";

import login from "./auth/login";
import register from "./auth/register";
import forgot_password from "./auth/forgot_password";
import reset_password from "./auth/reset_password";

import typing from "./functions/typing";
import logout from "./functions/logout";
import message from "./functions/message";
import disconnect from "./functions/disconnect";

const { xss } = require("express-xss-sanitizer");

dotenv.config();

const app = express();
const server = http.createServer(app);
const port = process.env.PORT ?? "2000";

const sockets: Socket[] = [];
let rooms_typing: {[id: string] : Set<string>} = {};

app.use(xss());
app.use(cors()); // Allowing cross-origin requests 

app.get("/", (req: express.Request, res: express.Response) => {
	res.sendFile(__dirname + "/client/index.html");
});
app.use("/client", express.static(__dirname + "/client"));

app.use(express.urlencoded({ extended: true }));
// app.use(express.json());

app.get("/reset-password", (req: express.Request, res: express.Response) => {
	/* req.body.token = req.query.token as string || "";
	req.body.email = req.query.email as string || ""; */

	res.sendFile(__dirname + "/client/reset-password.html");
});

app.post("/reset-password", (req: express.Request, res: express.Response) => {
	reset_password(req, res);
});

server.listen(port, () => {
	console.log("✅ Server started on port " + port);
});

// Connect to MongoDB
dbConnect();

// Socket.io config
const io = new Server(server);

// Rate limiting stuff

const ipRateLimits: { [ip: string]: { lastRegister?: number; 
	registerAttempts?: number; 
	lastLogin?: number; 
	loginAttempts?: number;
	lastForgotPassword?: number;
	lastTyping?: number;
	lastMessage?: number;}
} = {};

const REGISTER_WINDOW = 10; // 10 minutes
const REGISTER_MAX = 3;
const LOGIN_WINDOW = 2; // 2 minutes
const LOGIN_MAX = 10;
const LAST_FORGOT_WINDOW = 3; // 3 minutes

const TYPING_COOLDOWN = 0.5; // 0.5 seconds
const MESSAGES_COOLDOWN = 0.5; // 0.5 seconds

// Password reset

const passwordResetTokens: { [email: string]: { token: string; expires: number; } } = {};

io.on("connection", (socket) => {
	console.log("↩️ A user connected, ID: " + socket.id);
	sockets.push(socket);

	socket.data.loggedIn = false;
	socket.data.ip = socket.handshake.address;

	socket.on("login", (data) => {
		const now = Date.now();
		const entry = ipRateLimits[socket.data.ip] || {};

		if(!entry.lastLogin || now - entry.lastLogin > LOGIN_WINDOW * 60 * 1000) {
			entry.lastLogin = now;
			entry.loginAttempts = 1;
		} else {
			entry.loginAttempts = (entry.loginAttempts ?? 0) + 1;
		}

		if (entry.loginAttempts > LOGIN_MAX) {
			socket.emit("alert", {
				type: "error",
				message: "Too many login attempts. Please try again later.",
				changeState: "login"
			});
			return;
		}

		ipRateLimits[socket.data.ip] = entry;
		login(socket, data);
	});

	socket.on("register", (data) => {
		const now = Date.now();
		const entry = ipRateLimits[socket.data.ip] || {};

		if(!entry.lastRegister || now - entry.lastRegister > REGISTER_WINDOW * 60 * 1000) {
			entry.lastRegister = now;
			entry.registerAttempts = 1;
		} else {
			entry.registerAttempts = (entry.registerAttempts ?? 0) + 1;
		}

		if (entry.registerAttempts > REGISTER_MAX) {
			socket.emit("alert", {
				type: "error",
				message: "Too many registration attempts. Please try again later.",
				changeState: "register"
			});
			return;
		}

		ipRateLimits[socket.data.ip] = entry;
		register(socket, data);
	});

	socket.on("forgot_password", (data) => {
		const now = Date.now();
		const entry = ipRateLimits[socket.data.ip] || {};

		if(!entry.lastForgotPassword || now - entry.lastForgotPassword > LAST_FORGOT_WINDOW * 60 * 1000) {
			entry.lastForgotPassword = now;
		} else {
			socket.emit("alert", {
				type: "error",
				message: `You can only request a password reset once every ${LAST_FORGOT_WINDOW} minutes.`,
				changeState: "forgot_password"
			});
			return;
		}

		ipRateLimits[socket.data.ip] = entry;
		forgot_password(socket, data);
	});

	socket.on("typing", () => {
		const now = Date.now();
		const entry = ipRateLimits[socket.data.ip] || {};

		if(!entry.lastTyping || now - entry.lastTyping > TYPING_COOLDOWN * 1000) { // 0.5 seconds cooldown
			entry.lastTyping = now;
		} else {
			socket.emit("alert", {
				type: "error",
				message: "You are typing too fast. Please slow down.",
				changeState: "chat"
			});
			return;
		}

		ipRateLimits[socket.data.ip] = entry;
		typing(socket);
	});

	socket.on("logout", () => {
		logout(socket);
	});

	socket.on("send_message", (data) => {
		const now = Date.now();
		const entry = ipRateLimits[socket.data.ip] || {};

		if(!entry.lastMessage || now - entry.lastMessage > MESSAGES_COOLDOWN * 1000) { // 0.5 seconds cooldown
			entry.lastMessage = now;
		} else {
			socket.emit("alert", {
				type: "error",
				message: "You are sending messages too fast. Please slow down.",
				changeState: "chat"
			});
			return;
		}

		ipRateLimits[socket.data.ip] = entry;
		message(socket, data);
	});

	socket.on("disconnect", () => {
		disconnect(socket);
	});
});

setInterval(() => {
	for (let i = 0; i < sockets.length; i++) {
		if(!sockets[i].data.room || !sockets[i].data.loggedIn) {
			continue;
		}
		sockets[i].emit("typing_status", Array.from(rooms_typing[sockets[i].data.room] || []));
	}

	rooms_typing = {};
}, 1000);

export { sockets, rooms_typing, passwordResetTokens };