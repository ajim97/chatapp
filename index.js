const express = require("express");
const http = require("http");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const { Server } = require("socket.io");
const admin = require("firebase-admin");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("uploads"));

// 🔐 Initialize Firebase Admin from ENV (stringified JSON)
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// 📦 In-memory store for user tokens (replace with DB if needed)
const userTokens = {};

// 📁 Multer setup for file uploads
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// 📤 File Upload Endpoint
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  res.json({ fileUrl: `https://${req.headers.host}/${req.file.filename}` });
});

// 📲 Register FCM Token Endpoint
app.post("/register-token", (req, res) => {
  const { username, token } = req.body;
  if (!username || !token) {
    return res.status(400).json({ message: "Missing username or token" });
  }

  userTokens[username] = token;
  console.log("✅ FCM Token registered:", username);
  res.json({ message: "Token registered successfully" });
});

// 🧠 Setup Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

io.on("connection", (socket) => {
  console.log(`🔌 User connected: ${socket.id}`);

  socket.on("send_message", (data) => {
    console.log("📩 Message received:", data);

    // 1. Broadcast to all users
    io.emit("receive_message", data);

    // 2. Send FCM push if token is registered
    const receiver = data.receiver || data.user; // fallback
    const targetToken = userTokens[receiver];

    if (targetToken) {
      const message = {
        notification: {
          title: `${data.user} says:`,
          body: data.message,
        },
        token: targetToken,
      };

      admin
        .messaging()
        .send(message)
        .then((response) => {
          console.log("✅ FCM sent:", response);
        })
        .catch((error) => {
          console.error("❌ Error sending FCM:", error);
        });
    }
  });

  socket.on("disconnect", () => {
    console.log(`❌ User disconnected: ${socket.id}`);
  });
});

// 🚀 Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
