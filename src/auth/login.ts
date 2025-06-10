import { Socket } from "socket.io";
import validator from "validator";
import User from "../schemas/user";
import bcrypt from "bcryptjs";
import { sockets } from "../index";
import messageSchema from "../schemas/message";

interface LoginRequest {
    username: string;
    password: string;
};

export default async (socket: Socket, data: LoginRequest) => {
    const username = validator.trim(data.username || "");
    const password = validator.trim(data.password || "");

    if (!username.match(/^[a-zA-Z0-9_.]{3,20}$/)) {
        socket.emit("alert", { 
            type: "error",
            message: "Username must be between 3 and 20 characters and can only contain letters, numbers, underscores, and periods.",
            changeState: "login"
        });
        return;
    }

    if (!validator.isLength(password, { min: 6, max: 64 })) {
        socket.emit("alert", { 
            type: "error",
            message: "Password must be between 6 and 64 characters.",
            changeState: "login"
        });
        return;
    }

    for(let i = 0; i < sockets.length; i++) {
        if(sockets[i].data.username === username) {
            socket.emit("alert", { 
                type: "error",
                message: "This user is already logged in.",
                changeState: "login"
            });
            return;
        }
    }

    try {
        const user = await User.findOne({username: username});
        if (user && user.password && (await bcrypt.compare(password, user.password))) {
            console.log("🔑 User logged in:", user.username);

            socket.data.loggedIn = true;
            socket.data.username = user.username;
            socket.data.room = "lobby"; // Default room

            console.log(`🛋️ ${socket.data.username} joined ${socket.data.room}`);

            for(let i = 0; i < sockets.length; i++) {
                if(sockets[i].data.room == "lobby" && sockets[i] !== socket) {
                    sockets[i].emit("message", {
                        message: `${user.username} has joined the lobby.`,
                        sender: "SERVER",
						timestamp: new Date()
                    });
                }
            }

            try {
                const newMessage = new messageSchema({
                    sender: "SERVER",
                    message: `${user.username} has joined the lobby.`,
                    room: "lobby"
                });
                await newMessage.save();
            } catch (error) {
                console.error("⚠️ Error saving message to DB:", error);
            }

            socket.emit("alert", {
                type: "success",
                message: "Login successful!",
                changeState: "chat"
            });

            try {
                const messages = await messageSchema.find({ room: "lobby" }).sort({ timestamp: -1 }).limit(50);
                messages.reverse(); // Show latest messages at the bottom
                socket.emit("message_history", messages);
            } catch(error) {
                console.error("⚠️ Error fetching message history:", error);
            }
        
            return;
        }

        socket.emit("alert", { 
            type: "error",
            message: "Incorrect username or passsword.",
            changeState: "login"
        });
    } catch(err) {
        console.error(err);
        socket.emit("alert", { 
            type: "error",
            message: "An error occurred while processing your request.",
            changeState: "login"
        });
    }
}