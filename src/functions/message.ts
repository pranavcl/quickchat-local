import { Socket } from "socket.io";
import validator from "validator";
import { sockets } from "..";
import command from "./command";
import messageSchema from "../schemas/message";

export default async (socket: Socket, data: { message: string }) => {
    if (!socket.data.loggedIn || !socket.data.room) {
        socket.emit("alert", {
            type: "error",
            message: "You must be logged in to send messages.",
            changeState: "login"
        });
        return;
    }

    const message = validator.trim(data.message || "");

    if(!message || message.length > 500) {
        socket.emit("alert", {
            type: "error",
            message: "Message cannot be empty or exceed 500 characters.",
            changeState: "chat"
        });
        return;
    }

    if(message[0] === "/") {
        command(socket, message);
        return;
    }

    for (let i = 0; i < sockets.length; i++) {
        if (sockets[i].data.room === socket.data.room) {
            sockets[i].emit("message", {
                message: message,
                sender: socket.data.username,
                timestamp: new Date()
            });
        }
    }

    try {
        const newMessage = new messageSchema({
            sender: socket.data.username,
            message: message,
            room: socket.data.room
        });
        await newMessage.save();
    } catch (error) {
        console.error("⚠️ Error saving message to DB:", error);
    }

    console.log(`💬 ${socket.data.username} in ${socket.data.room}: ${message}`);
}