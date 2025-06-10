import validator from "validator";
import { Socket } from "socket.io";
import User from "../schemas/user";

interface forgotPasswordRequest {
    email: string;
};

export default async (socket: Socket, data: forgotPasswordRequest) => {
    const email = validator.trim(data.email || "");

    if(!validator.isEmail(email)) {
        socket.emit("alert", {
            type: "error",
            message: "Please enter a valid email address.",
            changeState: "forgot_password"
        });
        return;
    }

    try {
        const user = await User.findOne({ email });
        if (user) {
            console.log("🔑 Password reset requested for:", email);

            // TODO: Implement email sending logic here
        }

        socket.emit("alert", {
            type: "success",
            message: "If an account with that email exists, a password reset link has been sent.",
            changeState: "menu"
        });
    } catch(err) {
        console.error(err);
        socket.emit("alert", { 
            type: "error",
            message: "An error occurred while processing your request.",
            changeState: "forgot_password"
        });
    }
};