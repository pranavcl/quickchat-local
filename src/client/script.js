const socket = io("http://localhost:3000");
socket.on('connect', () => {
    console.log('Connected to server');
});

const states = [];

let chatInput = "";
let prevChatInput = "";

let currentState = "menu"; // Default state

let sadkfasf;

const changeState = (state) => {
    for(let i = 0; i < states.length; i++) {
        if (states[i] === state) {
            document.getElementById(states[i]).style.display = "block";
        } else {
            document.getElementById(states[i]).style.display = "none";
        }
    }

    currentState = state;
};

const do_login = () => {
    const username = document.getElementById("login_username").value;
    const password = document.getElementById("login_password").value;

    if (!username || !password) {
        alert("Please enter both username and password.");
        return;
    }

    socket.emit("login", { username, password });
};

const do_register = () => {
    const username = document.getElementById("register_username").value;
    const email = document.getElementById("register_email").value;
    const password = document.getElementById("register_password").value;
    const confirmPassword = document.getElementById("register_confirm_password").value;

    if(!username || !email || !password || !confirmPassword) {
        alert("Please fill in all fields.");
        return;
    }

    if(password !== confirmPassword) {
        alert("Passwords do not match.");
        return;
    }

    socket.emit("register", { username, email, password, confirmPassword });
};

const do_forgot_password = () => {
    const email = document.getElementById("forgot_email").value;

    if (!email) {
        alert("Please enter your email.");
        return;
    }

    socket.emit("forgot_password", { email });
};

const sendMessage = () => {
    const message = document.getElementById("chat_input").value;

    if (!message) {
        return;
    }

    if(message.length > 500) {
        alert("Message is too long. Please limit to 500 characters.");
        return;
    }

    socket.emit("send_message", { message });
    document.getElementById("chat_input").value = "";
};

const logout = () => {
    socket.emit("logout");
};

socket.on("alert", (data) => {
    changeState(data.changeState);
    alert(data.message);
});

socket.on("message", (data) => {
    const chatBox = document.getElementById("chat_messages"); // This is a textarea
    chatBox.value += `${data.message}\n`;
    chatBox.scrollTop = chatBox.scrollHeight; // Scroll to the bottom
});

socket.on("private_message", (data) => {
    const chatBox = document.getElementById("chat_messages");
    chatBox.value += `SERVER whispered to you: ${data.message}\n`;
    chatBox.scrollTop = chatBox.scrollHeight;
});

socket.on("typing_status", (data) => {
    let typingIndicator = document.getElementById("typing_indicator");

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
    const body = document.querySelector("body");
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

    chatInput = document.getElementById("chat_input").value;
    if(chatInput != prevChatInput) {
        socket.emit("typing", { typing: true });
        prevChatInput = chatInput;
    }
}, 1000);