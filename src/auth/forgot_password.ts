import validator from "validator";
import { Socket } from "socket.io";
import User from "../schemas/user";
import nodemailer from "nodemailer";
import crypto from "crypto";
import { passwordResetTokens } from "..";

interface forgotPasswordRequest {
    email: string;
};

export default async (socket: Socket, data: forgotPasswordRequest) => {
    let email = validator.trim(data.email || "");

    if(!validator.isEmail(email)) {
        socket.emit("alert", {
            type: "error",
            message: "Please enter a valid email address.",
            changeState: "forgot_password"
        });
        return;
    }

    let transporter = nodemailer.createTransport({
		host: process.env.EMAILHOST,
		port: parseInt(process.env.SSLPORT ?? "587"),
		secure: true,
		auth: {
			user: process.env.EMAILUSER,
			pass: process.env.EMAILPASS
		},
		tls: {
			rejectUnauthorized: false
		}
	} as nodemailer.TransportOptions);

    try {
        email = email.toLowerCase();

        const user = await User.findOne({ email });
        if (user) {
            console.log("🔑 Password reset requested for:", email);

            const resetToken = crypto.randomBytes(32).toString("hex");
		    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

            passwordResetTokens[user.email] = {
                token: hashedToken,
                expires: Date.now() + 3600000 // 1 hour expiration
            }

            const url = `${process.env.BASE_URL}/reset-password?token=${resetToken}&email=${email}`;

            // For debugging ONLY, remove in production
            // console.log(`${url}`); 

            let mailOptions = {
                from: process.env.EMAILUSER,
                to: email,
                subject: "Reset Your Password",
                text: `You requested a password reset. Click the link below to reset your password:\n\n` +
                    `${url}\n\n` +
                    `If you did not request this, please ignore this email.`
		    };

		    await transporter.sendMail(mailOptions);
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
            message: "The server is not set up to send emails. Please contact the server administrator.",
            changeState: "forgot_password"
        });
    }
};