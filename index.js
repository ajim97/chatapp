require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// MySQL Connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "mdakaram", // 🛑 तपाईंको MySQL पासवर्ड राख्नुहोस्
  database: "chatapp",
});

db.connect((err) => {
  if (err) {
    console.error("❌ Database Connection Failed:", err);
  } else {
    console.log("✅ MySQL Database Connected!");
  }
});

// Socket.io for Real-time Chat
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("🔵 User Connected:", socket.id);

  socket.on("sendMessage", (data) => {
    const { user, message, media } = data;
    const sql = "INSERT INTO messages (user, message, media) VALUES (?, ?, ?)";
    db.query(sql, [user, message, media], (err, result) => {
      if (err) {
        console.error("❌ Message Insert Failed:", err);
        return;
      }
      console.log("✅ Message Inserted:", result.insertId);
      io.emit("newMessage", { id: result.insertId, user, message, media });
    });
  });

  socket.on("disconnect", () => {
    console.log("🔴 User Disconnected:", socket.id);
  });
});

// Get Messages API
app.get("/messages", (req, res) => {
  db.query("SELECT * FROM messages ORDER BY timestamp DESC", (err, results) => {
    if (err) {
      res.status(500).json({ error: err });
      return;
    }
    res.json(results);
  });
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
