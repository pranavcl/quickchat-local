# 💬 QuickChat Local

**QuickChat Local** is an **easy-to-host and fun** IRC-inspired chatroom app. Instantly spin up a server with friends and access the front-end using any web browser. Built using **[Node.JS](https://nodejs.org/en/download)**, **[Socket.IO](https://socket.io/)**, **[TypeScript](https://www.typescriptlang.org/)** and **[MongoDB](https://www.mongodb.com/)** 🔧.

🛡️ **Privacy-first:** All data stays on your server—no third-party cloud.

## 💻 Features ❤️

- 📱 **Responsive design** for all screen sizes
- 🔀 **Real-time** communication powered by **WebSockets**
- 🔐 User accounts, **authentication** and **authorization**
- 💾 Persistent message and **chat history** storage
- 🛋️ **Multiple rooms/channels** for chats
- 🔥 Whispering (send a **private, burner message** to another user)
- 🟢 Typing & **presence** indication
- 🤖 Command parsing and **8** commands
- ⚙️ Modular and easy to configure source code for custom commands
- 🚦 Sensible **rate limits** to prevent abuse
- 🔒 Secure **hashing + salting** of passwords using [bcryptjs](https://www.npmjs.com/package/bcryptjs)
- 🌱 Easy to **self-host** in just a **few steps** (described below)

## 🔗 Dependencies

1. Install [NodeJS](https://nodejs.org/en/download) on your system.

2. Install [MongoDB](https://www.mongodb.com/try/download/community) on your system.

## 🛠️ Building from Source

1. First, clone the repository:

```bash
git clone https://github.com/pranavcl/quickchat-local
```

2. Enter the cloned repository and run `npm install`:

```bash
cd quickchat-local
npm install
```

3. **(Optional)** QuickChat uses port 2000 for the app and 27017 for MongoDB (on localhost) by default. This can be changed by creating a `.env` file in the **root directory(./quickchat-local)** and defining the values of `PORT` and `DB` like so:

```
PORT=8080
DB=mongodb://<your mongo db>/quickchat
```

4. **(Optional)** If you want 'Forgot Password' to work, you must set up the server to send emails. Define the `BASE_URL`, `EMAILHOST`, `SSLPORT`, `EMAILUSER` and `EMAILPASS` environment variables in your `.env` file like so:

```
BASE_URL=yourdomain.com:8080
EMAILHOST=smtp.yourdomain.com
SSLPORT=465 (or whatever the SSL port is on your mailserver)
EMAILUSER=example@yourdomain.com
EMAILPASS=(your email account's password)
```

5. Finally, run the app using `npm`:

```
npm run dev
```

**All done!** 🎉

## License

Published under the [QuickChat Local license](https://github.com/pranavcl/quickchat-local/blob/main/LICENSE.md)