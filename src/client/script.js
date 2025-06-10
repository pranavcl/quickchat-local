var socket = io("http://localhost:3000");
socket.on('connect', function () {
    console.log('Connected to server');
});
var states = [];
var chatInput = "";
var prevChatInput = "";
var currentState = "menu"; // Default state
var changeState = function (state) {
    for (var i = 0; i < states.length; i++) {
        var element = document.getElementById(states[i]);
        if (states[i] === state) {
            element.style.display = "block";
        }
        else {
            element.style.display = "none";
        }
    }
    currentState = state;
};
var do_login = function () {
    var login_username = document.getElementById("login_username");
    var login_password = document.getElementById("login_password");
    var username = login_username.value;
    var password = login_password.value;
    if (!username || !password) {
        alert("Please enter both username and password.");
        return;
    }
    socket.emit("login", { username: username, password: password });
};
var do_register = function () {
    var register_username = document.getElementById("register_username");
    var register_email = document.getElementById("register_email");
    var register_password = document.getElementById("register_password");
    var register_confirm_password = document.getElementById("register_confirm_password");
    var username = register_username.value;
    var email = register_email.value;
    var password = register_password.value;
    var confirmPassword = register_confirm_password.value;
    if (!username || !email || !password || !confirmPassword) {
        alert("Please fill in all fields.");
        return;
    }
    if (password !== confirmPassword) {
        alert("Passwords do not match.");
        return;
    }
    socket.emit("register", { username: username, email: email, password: password, confirmPassword: confirmPassword });
};
var do_forgot_password = function () {
    var forgot_email = document.getElementById("forgot_email");
    var email = forgot_email.value;
    if (!email) {
        alert("Please enter your email.");
        return;
    }
    socket.emit("forgot_password", { email: email });
};
var sendMessage = function () {
    var chat_input = document.getElementById("chat_input");
    var message = chat_input.value;
    if (!message) {
        return;
    }
    if (message.length > 500) {
        alert("Message is too long. Please limit to 500 characters.");
        return;
    }
    socket.emit("send_message", { message: message });
    if (chat_input.value.startsWith("/whisper ")) {
        var parts = chat_input.value.split(" ");
        chat_input.value = "/whisper ".concat(parts[1], " ");
        return;
    }
    chat_input.value = "";
};
var logout = function () {
    socket.emit("logout");
};
socket.on("alert", function (data) {
    changeState(data.changeState);
    alert(data.message);
});
socket.on("message", function (data) {
    var chatBox = document.getElementById("chat_messages"); // This is a textarea
    data.timestamp = new Date(data.timestamp); // Convert string back to Date object
    var date = data.timestamp.toISOString().replace(/T/, ' ').replace(/\..+/, '+UTC');
    var _a = data.timestamp.toISOString().slice(0, 10).split('-'), y = _a[0], m = _a[1], d = _a[2];
    var time = data.timestamp.toISOString().slice(11, 19);
    var formatted = "".concat(d, "/").concat(m, "/").concat(y, " ").concat(time, "+UTC");
    chatBox.value += "[".concat(data.sender, " ").concat(formatted, "]: ").concat(data.message, "\n");
    chatBox.scrollTop = chatBox.scrollHeight; // Scroll to the bottom
});
socket.on("private_message", function (data) {
    var chatBox = document.getElementById("chat_messages");
    chatBox.value += "".concat(data.sender, " whispered to you: ").concat(data.message, "\n");
    chatBox.scrollTop = chatBox.scrollHeight;
});
socket.on("raw_message", function (data) {
    var chatBox = document.getElementById("chat_messages");
    chatBox.value += data.message + "\n";
    chatBox.scrollTop = chatBox.scrollHeight; // Scroll to the bottom
});
socket.on("message_history", function (data) {
    var chatBox = document.getElementById("chat_messages");
    chatBox.value = ""; // Clear the chat box before displaying history
    for (var i = 0; i < data.length; i++) {
        var message = data[i];
        data[i].timestamp = new Date(data[i].timestamp); // Convert string back to Date object
        var date = data[i].timestamp.toISOString().replace(/T/, ' ').replace(/\..+/, '+UTC');
        var _a = data[i].timestamp.toISOString().slice(0, 10).split('-'), y = _a[0], m = _a[1], d = _a[2];
        var time = data[i].timestamp.toISOString().slice(11, 19);
        var formatted = "".concat(d, "/").concat(m, "/").concat(y, " ").concat(time, "+UTC");
        chatBox.value += "[".concat(data[i].sender, " ").concat(formatted, "]: ").concat(data[i].message, "\n");
        chatBox.scrollTop = chatBox.scrollHeight; // Scroll to the bottom
    }
});
socket.on("typing_status", function (data) {
    var typingIndicator = document.getElementById("typing_indicator");
    if (data.length > 5) {
        typingIndicator.textContent = "A lot of people are typing...";
        return;
    }
    if (data.length === 1) {
        typingIndicator.textContent = "".concat(data[0], " is typing...");
        return;
    }
    if (data.length > 0) {
        var typingIndicatorText = "";
        for (var i = 0; i < data.length - 2; i++) {
            typingIndicatorText += "".concat(data[i], ", ");
        }
        typingIndicatorText += "".concat(data[data.length - 2], " and ").concat(data[data.length - 1], " are typing...");
        typingIndicator.textContent = typingIndicatorText;
        return;
    }
    typingIndicator.textContent = "";
});
// Change state to menu on load
window.onload = function () {
    var body = document.querySelector("body");
    var divs = body.querySelectorAll("div");
    for (var i = 0; i < divs.length; i++) {
        states.push(divs[i].id);
    }
    states.pop(); // Remove the last element which is the body itself
    changeState("menu");
};
document.onkeyup = function (e) {
    if (e.key === "Enter") {
        sendMessage();
    }
};
setInterval(function () {
    if (currentState !== "chat")
        return; // Only check typing in chat state
    var chat_input = document.getElementById("chat_input");
    chatInput = chat_input.value;
    if (chatInput != prevChatInput) {
        socket.emit("typing");
        prevChatInput = chatInput;
    }
}, 1000);
