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
    cors: { origin: '*', methods: ['GET', 'POST'] },
});

// Middleware
app.use(cors());
app.use(express.json());

// Firebase Admin SDK Initialization
let serviceAccount;
try {
    serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_ADMIN_SDK_BASE64, 'base64').toString('utf8'));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    console.log("✅ Firebase Admin SDK Initialized");
} catch (error) {
    console.error("❌ Firebase initialization failed:", error);
}

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// Message Schema & Model
const MessageSchema = new mongoose.Schema({
    user: { type: String, required: true, trim: true },
    message: { type: String, trim: true, default: '' },
    media: { type: String, trim: true, default: '' },
    timestamp: { type: Date, default: Date.now },
    fcmToken: { type: String, trim: true },
});
MessageSchema.index({ timestamp: 1 }); // Optimized index for querying
const Message = mongoose.model('Message', MessageSchema);

// API Endpoint to Fetch Messages
app.get('/messages', async (req, res) => {
    try {
        const messages = await Message.find().sort({ timestamp: -1 }).limit(20);
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// WebSocket Communication
io.on('connection', (socket) => {
    console.log('🔵 User connected:', socket.id);

    socket.on('send_message', async (data) => {
        try {
            const newMessage = new Message(data);
            await newMessage.save();
            io.emit('receive_message', data);

            // Send Push Notification
            if (data.fcmToken) {
                sendPushNotification(data.fcmToken, data.user, data.message);
            }
        } catch (error) {
            console.error("❌ Error saving message:", error);
        }
    });

    socket.on('disconnect', () => {
        console.log('🔴 User disconnected:', socket.id);
    });
});

// Function to Send Push Notifications
const sendPushNotification = async (token, user, message) => {
    try {
        await admin.messaging().send({
            token,
            notification: {
                title: `New message from ${user}`,
                body: message || 'You have a new message!',
            },
            android: { notification: { channelId: 'default_channel' } },
        });
        console.log('✅ Push Notification Sent');
    } catch (error) {
        console.error('❌ Error sending push notification:', error);
    }
};
app.get('/', (req, res) => {
    res.send('Welcome to the Chat App API! md akaram nadaf Harine');
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
