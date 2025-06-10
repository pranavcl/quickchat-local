import { Socket } from "socket.io";
import { rooms_typing } from "..";

export default (socket: Socket) => {
    if (!socket.data.loggedIn || !socket.data.room) {
        socket.emit("alert", {
            type: "error",
            message: "You must be logged in to send messages.",
            changeState: "login"
        });
        return;
    }

    if(!rooms_typing[socket.data.room]) {
        rooms_typing[socket.data.room] = new Set();
    }

    rooms_typing[socket.data.room].add(socket.data.username);
}