import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    sender: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 20
    },
    message: {
        type: String,
        required: true,
        trim: true,
        minlength: 1,
        maxlength: 500
    },
    room: {
        type: String,
        required: true,
        trim: true,
        minlength: 1,
        maxlength: 50
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model("Message", messageSchema, "messages");