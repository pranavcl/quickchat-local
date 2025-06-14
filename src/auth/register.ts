import validator from "validator";
import { Socket } from "socket.io";
import bcrypt from "bcryptjs";
import User from "../schemas/user";

interface RegisterRequest {
    username: string;
    password: string;
    confirmPassword: string;
    email: string;
};

export default async (socket: Socket, data: RegisterRequest) => {
    const username = validator.trim(data.username || "");
    const password = validator.trim(data.password || "");
    const confirmPassword = validator.trim(data.confirmPassword || "");
    const email = validator.trim(data.email || "");

    if (!username.match(/^[a-zA-Z0-9_.]{3,20}$/)) {
        socket.emit("alert", { 
            type: "error",
            message: "Username must be between 3 and 20 characters and can only contain letters, numbers, underscores, and periods.",
            changeState: "register"
        });
        return;
    }

    if (!validator.isLength(password, { min: 6, max: 64 }) || !validator.isLength(confirmPassword, { min: 6, max: 64 })) {
        socket.emit("alert", { 
            type: "error",
            message: "Password must be between 6 and 64 characters.",
            changeState: "register"
        });
        return;
    }

    if(!validator.isEmail(email)) {
        socket.emit("alert", {
            type: "error",
            message: "Please enter a valid email address.",
            changeState: "register"
        });
    }

    if(password !== confirmPassword) {
        socket.emit("alert", { 
            type: "error",
            message: "Passwords do not match.",
            changeState: "register"
        });
        return;
    }

    try {
        const salt = await bcrypt.genSalt(10);

        let existingUser = await User.findOne({username: {$regex: new RegExp(username, "i")}});
        let existingEmail = await User.findOne({email: email.toLowerCase()});

        if(existingUser || existingEmail) {
            socket.emit("alert", { 
                type: "error",
                message: "Username or email already registered.",
                changeState: "register"
            });
            return;
        }

        const user = new User({username, password: await bcrypt.hash(password, salt), email: email.toLowerCase()});
        await user.save();

        console.log("✨ User registered:", user.username);

        socket.emit("alert", {
            type: "success",
            message: "Registration successful! You can now log in.",
            changeState: "menu"
        });
    } catch(err) {
        console.error(err);
        socket.emit("alert", { 
            type: "error",
            message: "An error occurred while processing your request.",
            changeState: "register"
        });
    }
};