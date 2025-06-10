import { Socket } from "socket.io";
import { sockets } from "..";
import messageSchema from "../schemas/message";
import logout from "./logout";

export default async (socket: Socket, message: String) => {
    const command = message.slice(1).trim().split(" ")[0].toLowerCase();

    console.log(`💻 ${socket.data.username} issued command: ${message.slice(1).trim().toLowerCase()}`);

    if(command === "help") {
        socket.emit("private_message", {
            message: "Available commands: /help, /logout, /join <room>, /whereami, /online, /whisper <username> <message>, /loadhistory <number of messages>",
            sender: "SERVER",
            timestamp: new Date()
        });
    } 
    
    else if(command === "logout") {
        logout(socket);
    } 
    
    else if(command === "join") {
        const roomName = message.slice(6).trim();
        if(!roomName) {
            socket.emit("private_message", {
                message: "Please specify a room name to join.",
                sender: "SERVER",
                timestamp: new Date()
            });
            return;
        }

        console.log(`🚪 ${socket.data.username} left ${socket.data.room}`);

        for(let i = 0; i < sockets.length; i++) {
            if(sockets[i].data.room == socket.data.room) {
                sockets[i].emit("message", {
                    message: `${socket.data.username} has left the room ${socket.data.room}.`,
                    sender: "SERVER",
                    timestamp: new Date()
                });
            }
        }

        try {
            const newMessage = new messageSchema({
                sender: "SERVER",
                message: `${socket.data.username} has left the room ${socket.data.room}.`,
                room: socket.data.room
            });
            await newMessage.save();
        } catch (error) {
            console.error("⚠️ Error saving message to DB:", error);
        }

        socket.data.room = roomName;
        
        for(let i = 0; i < sockets.length; i++) {
            if(sockets[i].data.room == socket.data.room) {
                sockets[i].emit("message", {
                    message: `${socket.data.username} has joined the room ${socket.data.room}.`,
                    sender: "SERVER",
                    timestamp: new Date()
                });
            }
        }

        try {
            const newMessage = new messageSchema({
                sender: "SERVER",
                message: `${socket.data.username} has joined the room ${socket.data.room}.`,
                room: socket.data.room
            });
            await newMessage.save();
        } catch (error) {
            console.error("⚠️ Error saving message to DB:", error);
        }

        console.log(`🛋️ ${socket.data.username} joined room ${roomName}`);
    } 
    
    else if(command === "whereami") {
        if(!socket.data.room) {
            socket.emit("private_message", {
                message: "You are not in any room. Use /join <room> to join a room.",
                sender: "SERVER",
                timestamp: new Date()
            });
        } else {
            socket.emit("private_message", {
                message: "You are currently in the room: " + socket.data.room,
                sender: "SERVER",
                timestamp: new Date()
            }); 
        }
    } 
    
    else if(command === "online") {
        const onlineUsers = sockets.filter(s => s.data.room === socket.data.room && s.data.loggedIn);
        if(onlineUsers.length === 0) {
            socket.emit("private_message", {
                message: "No users are currently online in this room.",
                sender: "SERVER",
                timestamp: new Date()
            });
        } else {
            const userList = onlineUsers.map(s => s.data.username).join(", ");
            socket.emit("private_message", {
                message: `${onlineUsers.length} online in this room: ${userList}`,
                sender: "SERVER",
                timestamp: new Date()
            });
        }
    }
    
    else if(command === "whisper") {
        const parts = message.slice(9).trim().split(" ");
        const targetUsername = parts[0];
        const whisperMessage = parts.slice(1).join(" ");
        if(!targetUsername || !whisperMessage) {
            socket.emit("private_message", {
                message: "Usage: /whisper <username> <message>",
                sender: "SERVER",
                timestamp: new Date()
            });
            return;
        }

        if(targetUsername === socket.data.username) {
            socket.emit("private_message", {
                message: "You cannot whisper to yourself!",
                sender: "SERVER",
                timestamp: new Date()
            });
            return;
        }

        const targetSocket = sockets.find(s => s.data.username === targetUsername && s.data.loggedIn);
        if(!targetSocket) {
            socket.emit("private_message", {
                message: `User ${targetUsername} is not online.`,
                sender: "SERVER",
                timestamp: new Date()
            });
            return;
        }
        targetSocket.emit("private_message", {
            message: whisperMessage,
            sender: socket.data.username,
            timestamp: new Date()
        });

        socket.emit("raw_message", {
            message: `You whispered to ${targetUsername}: ${whisperMessage}`,
        });
    }

    else if(command === "loadhistory") {
        const parts = message.split(" ");

        if(!parts[1] || isNaN(parseInt(parts[1]))) {
            socket.emit("private_message", {
                message: "Usage: /loadhistory <number of messages>",
                sender: "SERVER",
                timestamp: new Date()
            });
            return;
        }

        try {
            const messages = await messageSchema.find({ room: "lobby" }).sort({ timestamp: -1 }).limit(parseInt(parts[1]));
            messages.reverse(); // Show latest messages at the bottom
            socket.emit("message_history", messages);
        } catch(error) {
            console.error("⚠️ Error fetching message history:", error);
        }
    }

    else {
        socket.emit("private_message", {
            message: "Unknown command. Type /help for a list of commands.",
            sender: "SERVER",
            timestamp: new Date()
        });
        return;
    }
}