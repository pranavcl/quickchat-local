import { Socket } from "socket.io";
import { sockets } from "..";
import messageSchema from "../schemas/message";
import logout from "./logout";

const broadcastToRoom = async (room: string, message: string) => {
    for(let i = 0; i < sockets.length; i++) {
        if(sockets[i].data.room == room) {
            sockets[i].emit("message", {
                message: message,
                sender: "SERVER",
                timestamp: new Date()
            });
        }
    }

    try {
        const newMessage = new messageSchema({
            sender: "SERVER",
            message: message,
            room: room
        });
        await newMessage.save();
    } catch (error) {
        console.error("⚠️ Error saving message to DB:", error);
    }
}

export default async (socket: Socket, message: string) => {
    const command = message.slice(1).trim().split(" ")[0].toLowerCase();

    console.log(`💻 ${socket.data.username} issued command: ${message.slice(1).trim().toLowerCase()}`);

    if(command === "help") {
        socket.emit("private_message", {
            message: "Available commands: /help, /logout, /join <room>, /whereami, /online, /whisper <username> <message>, /loadhistory <number of messages>, /delete <substring in message>",
            sender: "SERVER"
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
                sender: "SERVER"
            });
            return;
        }

        console.log(`🚪 ${socket.data.username} left ${socket.data.room}`);

        broadcastToRoom(socket.data.room, `${socket.data.username} has left the room ${socket.data.room}.`);

        socket.data.room = roomName;
        
        broadcastToRoom(roomName, `${socket.data.username} has joined the room ${socket.data.room}.`);

        console.log(`🛋️ ${socket.data.username} joined room ${roomName}`);
    } 
    
    else if(command === "whereami") {
        if(!socket.data.room) {
            socket.emit("private_message", {
                message: "You are not in any room. Use /join <room> to join a room.",
                sender: "SERVER"
            });
        } else {
            socket.emit("private_message", {
                message: "You are currently in the room: " + socket.data.room,
                sender: "SERVER"
            }); 
        }
    } 
    
    else if(command === "online") {
        const onlineUsers = sockets.filter(s => s.data.room === socket.data.room && s.data.loggedIn);
        if(onlineUsers.length === 0) {
            socket.emit("private_message", {
                message: "No users are currently online in this room.",
                sender: "SERVER"
            });
        } else {
            const userList = onlineUsers.map(s => s.data.username).join(", ");
            socket.emit("private_message", {
                message: `${onlineUsers.length} online in this room: ${userList}`,
                sender: "SERVER"
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
                sender: "SERVER"
            });
            return;
        }

        if(targetUsername === socket.data.username) {
            socket.emit("private_message", {
                message: "You cannot whisper to yourself!",
                sender: "SERVER"
            });
            return;
        }

        const targetSocket = sockets.find(s => s.data.username === targetUsername && s.data.loggedIn);
        if(!targetSocket) {
            socket.emit("private_message", {
                message: `User ${targetUsername} is not online.`,
                sender: "SERVER"
            });
            return;
        }
        targetSocket.emit("private_message", {
            message: whisperMessage,
            sender: socket.data.username
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
                sender: "SERVER"
            });
            return;
        }

        try {
            const messages = await messageSchema.find({ room: socket.data.room }).sort({ timestamp: -1 }).limit(parseInt(parts[1]));
            messages.reverse(); // Show latest messages at the bottom
            socket.emit("message_history", messages);
        } catch(error) {
            console.error("⚠️ Error fetching message history:", error);
        }
    }

    else if(command === "delete") {
        const substring = message.slice(8).trim();
        if(!substring) {
            socket.emit("private_message", {
                message: "Usage: /delete <substring in message>",
                sender: "SERVER"
            });
            return;
        }

        try {
            const message = await messageSchema.findOne({ room: socket.data.room, sender: socket.data.username, message: { $regex: substring, $options: 'i' } });
            if(!message) {
                socket.emit("private_message", {
                    message: `No message found containing "${substring}" in room ${socket.data.room}.`,
                    sender: "SERVER"
                });
                return;
            }

            console.log(`🗑️ Message deleted by ${socket.data.username}: ${message.message}`);

            for(let i = 0; i < sockets.length; i++) { 
                if(sockets[i].data.room != socket.data.room) continue;
                sockets[i].emit("request_message_deletion", {
                    sender: message.sender,
                    room: message.room,
                    message: message.message,
                    timestamp: message.timestamp instanceof Date ? message.timestamp.toISOString() : message.timestamp
                });
            }

            await message.updateOne({sender: "SERVER", message: `Message deleted by ${socket.data.username}.`});
        } catch (error) {
            console.error("⚠️ Error fetching messages for deletion:", error);
            socket.emit("private_message", {
                message: "An error occurred while trying to delete messages.",
                sender: "SERVER"
            });
        }
    }

    else {
        socket.emit("private_message", {
            message: "Unknown command. Type /help for a list of commands.",
            sender: "SERVER"
        });
        return;
    }
}