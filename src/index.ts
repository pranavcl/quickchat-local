import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { Server, Socket } from "socket.io";
import dbConnect from "./dbConnect";
import http from "http";

import login from "./auth/login";
import register from "./auth/register";
import forgot_password from "./auth/forgot_password";

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

server.listen(port, () => {
	console.log("✅ Server started on port " + port);
});

// Connect to MongoDB
dbConnect();

// Socket.io config
const io = new Server(server);

io.on("connection", (socket) => {
	console.log("↩️ A user connected, ID: " + socket.id);
	sockets.push(socket);

	socket.data.loggedIn = false;

	socket.on("login", (data) => {
		login(socket, data);
	});

	socket.on("register", (data) => {
		register(socket, data);
	});

	socket.on("forgot_password", (data) => {
		forgot_password(socket, data);
	});

	socket.on("typing", () => {
		typing(socket);
	});

	socket.on("logout", () => {
		logout(socket);
	});

	socket.on("send_message", (data) => {
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

export { sockets, rooms_typing };