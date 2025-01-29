const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const admin = require('firebase-admin');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});

// Middleware
app.use(cors());
app.use(express.json());  

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB connected'))
    .catch((err) => console.error('❌ MongoDB connection error:', err));

// Firebase Service Account (Decoded from .env)
const serviceAccountJSON = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf-8");

admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(serviceAccountJSON)),
});

// Store User FCM Tokens (Use Database in Production)
const userTokens = {}; 

// Save FCM Token API
app.post('/save-token', (req, res) => {
    const { userId, token } = req.body; 
    if (userId && token) {
        userTokens[userId] = token;
        console.log(`✅ Token saved for user: ${userId}`);
        res.json({ message: "Token saved successfully!" });
    } else {
        res.status(400).json({ error: "Invalid userId or token" });
    }
});

// Function to Send Push Notification
const sendNotification = async (userId, message) => {
    const userToken = userTokens[userId];

    if (!userToken) {
        console.log("❌ No FCM Token found for user:", userId);
        return;
    }

    const payload = {
        notification: {
            title: "New Message",
            body: message,
            sound: "default"
        },
        token: userToken,
    };

    try {
        await admin.messaging().send(payload);
        console.log("✅ Notification sent successfully!");
    } catch (error) {
        console.error("❌ Error sending notification:", error);
    }
};

// Root API
app.get('/', (req, res) => {
    res.send('🚀 Welcome to the Chat App API!');
});

// Socket.IO Chat System
io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.id}`);

    socket.on('send_message', async (data) => {
        io.emit('receive_message', data);
        await sendNotification(data.user, data.message); // Send Push Notification
    });

    socket.on('disconnect', () => {
        console.log(`❌ User disconnected: ${socket.id}`);
    });
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});

