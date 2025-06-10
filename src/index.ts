import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { Server, Socket } from "socket.io";
import login from "./auth/login";
import register from "./auth/register";
import forgot_password from "./auth/forgot_password";
import dbConnect from "./dbConnect";
import http from "http";
import validator from "validator";

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

	socket.on("typing", (data) => {
		if (!socket.data.loggedIn || !socket.data.room) {
			socket.emit("alert", {
				type: "error",
				message: "You must be logged in to send messages.",
				changeState: "login"
			});
			return;
		} else {
			if(!rooms_typing[socket.data.room]) {
				rooms_typing[socket.data.room] = new Set();
			}

			rooms_typing[socket.data.room].add(socket.data.username);
		}
	});

	socket.on("logout", () => {
		if (!socket.data.loggedIn) 
			return;

		console.log("👋 User logged out:", socket.data.username);
		socket.data.loggedIn = false;
		socket.data.username = "";
		socket.emit("alert", {
			type: "success",
			message: "You have been logged out.",
			changeState: "menu"
		});
	});

	socket.on("send_message", (data) => {
		if (!socket.data.loggedIn || !socket.data.room) {
			socket.emit("alert", {
				type: "error",
				message: "You must be logged in to send messages.",
				changeState: "login"
			});
			return;
		}

		const message = validator.trim(data.message || "");

		if(message[0] === "/") {
			const command = message.slice(1).trim().split(" ")[0].toLowerCase();
			if(command === "help") {
				socket.emit("private_message", {
					message: "Available commands: /help, /logout, /join <room>, /whereami, /online",
				});
			} else if(command === "logout") {
				socket.emit("alert", {
					type: "success",
					message: "You have been logged out.",
					changeState: "menu"
				});
				socket.data.loggedIn = false;
				socket.data.username = "";
				console.log("👋 User logged out:", socket.data.username);
			} else if(command === "join") {
				const roomName = message.slice(6).trim();
				if(!roomName) {
					socket.emit("private_message", {
						message: "Please specify a room name to join.",
					});
					return;
				}
				socket.data.room = roomName;
				socket.emit("private_message", {
					message: "You have joined the room: " + roomName
				});
				console.log(`🛋️ ${socket.data.username} joined room ${roomName}`);
			} else if(command === "whereami") {
				if(!socket.data.room) {
					socket.emit("private_message", {
						message: "You are not in any room. Use /join <room> to join a room.",
					});
				} else {
					socket.emit("private_message", {
						message: "You are currently in the room: " + socket.data.room
					}); 
				}
			} else if(command === "online") {
				const onlineUsers = sockets.filter(s => s.data.room === socket.data.room && s.data.loggedIn);
				if(onlineUsers.length === 0) {
					socket.emit("private_message", {
						message: "No users are currently online in this room."
					});
				} else {
					const userList = onlineUsers.map(s => s.data.username).join(", ");
					socket.emit("private_message", {
						message: `${onlineUsers.length} online in this room: ${userList}`
					});
				}
			}
			else {
				socket.emit("private_message", {
					message: "Unknown command. Type /help for a list of commands."
				});
				return;
			}
			console.log(`💻 ${socket.data.username} issued command: ${message.slice(1).trim().toLowerCase()}`);
			return;
		}

		if(!message || message.length > 500) {
			socket.emit("alert", {
				type: "error",
				message: "Message cannot be empty or exceed 500 characters.",
				changeState: "chat"
			});
			return;
		}

		for (let i = 0; i < sockets.length; i++) {
			if (sockets[i].data.room === socket.data.room) {
				const now = new Date();
				const date = now.toISOString().replace(/T/, ' ').replace(/\..+/, '+UTC');
				const [y, m, d] = now.toISOString().slice(0, 10).split('-');
				const time = now.toISOString().slice(11, 19);
				const formatted = `${d}/${m}/${y} ${time}+UTC`;

				sockets[i].emit("message", {
					message: `[${socket.data.username} ${formatted}] ${message}`
				});
			}
		}

		console.log(`💬 ${socket.data.username} in ${socket.data.room}: ${message}`);
	});

	socket.on("disconnect", () => {
		if(socket.data.room) {
			console.log(`🚪 ${socket.data.username} left ${socket.data.room}`);

			for(let i = 0; i < sockets.length; i++) {
				if(sockets[i].data.room === socket.data.room) {
					sockets[i].emit("message", {
						message: `[SERVER] ${socket.data.username} has left the ${socket.data.room}.`
					});
				}
			}
		}

		if(socket.data.loggedIn) {
			console.log("👋 User logged out:", socket.data.username);
			socket.data.loggedIn = false;
			socket.data.username = "";
		}

		console.log("❌ A user disconnected, ID: " + socket.id);
		for(let i = 0; i < sockets.length; i++) {
			if(sockets[i].id === socket.id) {
				sockets.splice(i, 1);
				break;
			}
		}
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

export { sockets };