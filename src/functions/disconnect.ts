import { Socket } from "socket.io";
import { sockets } from "..";
import messageSchema from "../schemas/message";

export default async (socket: Socket) => {
    if(socket.data.room) {
        console.log(`🚪 ${socket.data.username} left ${socket.data.room}`);

        for(let i = 0; i < sockets.length; i++) {
            if(sockets[i].data.room === socket.data.room) {
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
}