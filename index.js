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

// ✅ Firebase Admin SDK Initialization
const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_ADMIN_SDK_BASE64, 'base64').toString('utf8'));
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});
console.log("✅ Firebase Admin SDK Initialized Successfully");

// ✅ MongoDB Connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// ✅ Define Message Schema & Model
const MessageSchema = new mongoose.Schema({
    user: String,
    message: String,
    media: String,
    timestamp: String,
    fcmToken: String, // Store user's FCM Token for notifications
});
const Message = mongoose.model('Message', MessageSchema);

// ✅ Root API Route
app.get('/', (req, res) => {
    res.send('Welcome to the Chat App API! 🌍');
});

// ✅ Handle WebSocket Connections
io.on('connection', (socket) => {
    console.log('🔵 A user connected:', socket.id);

    socket.on('send_message', async (data) => {
        console.log('📥 Received Message:', data);
    
        try {
            const newMessage = new Message(data);
            await newMessage.save();
            io.emit('receive_message', data); // Broadcast message to all clients
            console.log("📤 Message Broadcasted to Clients:", data);
        } catch (error) {
            console.error("❌ Error Saving Message:", error);
        }
    });
    

    socket.on('disconnect', () => {
        console.log('🔴 User Disconnected:', socket.id);
    });
});

// ✅ Function to Send Push Notifications
const sendPushNotification = async (token, user, message) => {
    try {
        await admin.messaging().send({
            token,
            notification: {
                title: `New message from ${user}`,
                body: message || 'You have a new message!',
            },
            android: {
                notification: { channelId: 'default_channel' },
            },
        });
        console.log('✅ Push Notification Sent');
    } catch (error) {
        console.error('❌ Error Sending Push Notification:', error);
    }
};

// ✅ Fetch Chat History API
app.get('/messages', async (req, res) => {
    try {
        const messages = await Message.find().sort({ timestamp: -1 }).limit(50);
        res.json(messages);
    } catch (error) {
        console.error("❌ Error Fetching Messages:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ✅ Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server Running on http://localhost:${PORT}`);
});
