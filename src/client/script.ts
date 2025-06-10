//import { io } from "socket.io-client";
declare const io: any; 
const socket = io("http://localhost:3000");

socket.on('connect', () => {
    console.log('Connected to server');
});

const states: string[] = [];

let chatInput = "";
let prevChatInput = "";

let currentState = "menu"; // Default state

const changeState = (state: string) => {
    for(let i = 0; i < states.length; i++) {
        const element = document.getElementById(states[i]) as HTMLElement
        if (states[i] === state) {
            element.style.display = "block";
        } else {
            element.style.display = "none";
        }
    }

    currentState = state;
};

const do_login = () => {
    const login_username = document.getElementById("login_username") as HTMLInputElement;
    const login_password = document.getElementById("login_password") as HTMLInputElement;

    const username = login_username.value;
    const password = login_password.value;

    if (!username || !password) {
        alert("Please enter both username and password.");
        return;
    }

    socket.emit("login", { username, password });

    login_username.value = "";
    login_password.value = "";
};

const do_register = () => {
    const register_username = document.getElementById("register_username") as HTMLInputElement;
    const register_email = document.getElementById("register_email") as HTMLInputElement;
    const register_password = document.getElementById("register_password") as HTMLInputElement;
    const register_confirm_password = document.getElementById("register_confirm_password") as HTMLInputElement;

    const username = register_username.value;
    const email = register_email.value;
    const password = register_password.value;
    const confirmPassword = register_confirm_password.value;

    if(!username || !email || !password || !confirmPassword) {
        alert("Please fill in all fields.");
        return;
    }

    if(password !== confirmPassword) {
        alert("Passwords do not match.");
        return;
    }

    socket.emit("register", { username, email, password, confirmPassword });

    register_username.value = "";
    register_email.value = "";
    register_password.value = "";
    register_confirm_password.value = "";
};

const do_forgot_password = () => {
    const forgot_email = document.getElementById("forgot_email") as HTMLInputElement;

    const email = forgot_email.value;

    if (!email) {
        alert("Please enter your email.");
        return;
    }

    socket.emit("forgot_password", { email });

    forgot_email.value = "";
};

const sendMessage = () => {
    const chat_input = document.getElementById("chat_input") as HTMLInputElement;

    const message = chat_input.value;

    if (!message) {
        return;
    }

    if(message.length > 500) {
        alert("Message is too long. Please limit to 500 characters.");
        return;
    }

    socket.emit("send_message", { message });

    if(chat_input.value.startsWith("/whisper ")) {
        const parts = chat_input.value.split(" ");
        chat_input.value = `/whisper ${parts[1]} `;
        return;
    }

    chat_input.value = "";
};

const logout = () => {
    socket.emit("logout");
};

interface alertData {
    changeState: string;
    message: string;
}

socket.on("alert", (data: alertData) => {
    changeState(data.changeState);
    alert(data.message);
});

interface messageData {
    message: string;
    sender: string;
    timestamp: Date;
}

socket.on("message", (data: messageData) => {
    const chatBox = document.getElementById("chat_messages") as HTMLTextAreaElement;// This is a textarea

    data.timestamp = new Date(data.timestamp); // Convert string back to Date object

    const date = data.timestamp.toISOString().replace(/T/, ' ').replace(/\..+/, '+UTC');
    const [y, m, d] = data.timestamp.toISOString().slice(0, 10).split('-');
    const time = data.timestamp.toISOString().slice(11, 19);
    const formatted = `${d}/${m}/${y} ${time}+UTC`;

    chatBox.value += `[${data.sender} ${formatted}]: ${data.message}\n`;
    chatBox.scrollTop = chatBox.scrollHeight; // Scroll to the bottom
});

socket.on("private_message", (data: messageData) => {
    const chatBox = document.getElementById("chat_messages") as HTMLTextAreaElement;
    chatBox.value += `${data.sender} whispered to you: ${data.message}\n`;
    chatBox.scrollTop = chatBox.scrollHeight;
});

socket.on("raw_message", (data: messageData) => {
    const chatBox = document.getElementById("chat_messages") as HTMLTextAreaElement;
    chatBox.value += data.message + "\n";
    chatBox.scrollTop = chatBox.scrollHeight; // Scroll to the bottom
});

socket.on("message_history", (data: messageData[]) => {
    const chatBox = document.getElementById("chat_messages") as HTMLTextAreaElement;
    chatBox.value = ""; // Clear the chat box before displaying history

    for(let i = 0; i < data.length; i++) {
        const message = data[i];

        data[i].timestamp = new Date(data[i].timestamp); // Convert string back to Date object

        const date = data[i].timestamp.toISOString().replace(/T/, ' ').replace(/\..+/, '+UTC');
        const [y, m, d] = data[i].timestamp.toISOString().slice(0, 10).split('-');
        const time = data[i].timestamp.toISOString().slice(11, 19);
        const formatted = `${d}/${m}/${y} ${time}+UTC`;

        chatBox.value += `[${data[i].sender} ${formatted}]: ${data[i].message}\n`;
        chatBox.scrollTop = chatBox.scrollHeight; // Scroll to the bottom
    }
});

socket.on("typing_status", (data: string[]) => {
    let typingIndicator = document.getElementById("typing_indicator") as HTMLParagraphElement;

    if(data.length > 5) {
        typingIndicator.textContent = "A lot of people are typing...";
        return;
    }

    if(data.length === 1) {
        typingIndicator.textContent = `${data[0]} is typing...`;
        return;
    }

    if (data.length > 0) {
        let typingIndicatorText = "";
        for(let i = 0; i < data.length-2; i++) {
            typingIndicatorText += `${data[i]}, `;
        }
        typingIndicatorText += `${data[data.length-2]} and ${data[data.length-1]} are typing...`;

        typingIndicator.textContent = typingIndicatorText;
        return;
    }

    typingIndicator.textContent = "";
});

// Change state to menu on load

window.onload = () => {
    const body = document.querySelector("body") as HTMLBodyElement;
    const divs = body.querySelectorAll("div");
    for(let i = 0; i < divs.length; i++) {
        states.push(divs[i].id);
    }
    states.pop(); // Remove the last element which is the body itself

    changeState("menu");
};

document.onkeyup = (e) => {
    if (e.key === "Enter") {
        sendMessage();
    }
}

setInterval(() => {
    if(currentState !== "chat") return; // Only check typing in chat state

    const chat_input = document.getElementById("chat_input") as HTMLInputElement;
    chatInput = chat_input.value;

    if(chatInput != prevChatInput) {
        socket.emit("typing");
        prevChatInput = chatInput;
    }
}, 1000);