import { Request, Response } from "express";
import user from "../schemas/user";
import validator from "validator";
import { passwordResetTokens } from "..";
import crypto from "crypto";
import bcrypt from "bcryptjs";

export default async (req: Request, res: Response) => {
    const token = validator.trim(req.query.token as string || "");
    const email = validator.trim(req.query.email as string || "");

    if(!token || !email) {
        res.status(400).send("Invalid request. Token and email are required.");
        return;
    }

    if(req.body.new_password !== req.body.confirm_password) {
        res.status(400).send("Passwords do not match.");
        return;
    }

    if(!validator.isLength(req.body.new_password, { min: 6, max: 64 })) {
        res.status(400).send("Password must be between 6 and 64 characters.");
        return;
    }

    if(!validator.isEmail(email)) {
        res.status(400).send("Please enter a valid email address.");
        return;
    }

    const hashedToken = validator.trim(crypto.createHash("sha256").update(token).digest("hex"));
    const tokenData = passwordResetTokens[email];
    if(!tokenData || tokenData.token !== hashedToken || Date.now() > tokenData.expires) {
        res.status(400).send("Invalid or expired token.");
        return;
    }

    try {
        const data = await user.findOne({ email: email });

        if(!data) {
            res.status(404).send("User not found.");
            return;
        }

        const newPassword = validator.trim(req.body.new_password);
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        data.password = hashedPassword;
        await data.save();

        delete passwordResetTokens[email]; // Remove token after successful reset
        console.log(`🔑 Password reset successful for: ${email}`);

        res.status(200).send("Password reset successful. You can now log in with your new password.<br><br><a href='/'>Go to login</a>");
    } catch(error) {
        console.error("Error during password reset:", error);
        res.status(500).send("Internal Server Error");
    }
}