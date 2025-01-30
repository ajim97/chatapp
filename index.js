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
const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_ADMIN_SDK_BASE64, 'base64').toString('utf8'));
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});
console.log("Firebase Admin SDK Initialized Successfully");

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// Message Schema & Model
const MessageSchema = new mongoose.Schema({
    user: String,  
    message: String,
    media: String,
    timestamp: String,
    fcmToken: String, // Store user's FCM Token
});
const Message = mongoose.model('Message', MessageSchema);

// Root Route
app.get('/', (req, res) => {
    res.send('Welcome to the Chat App API! md akaram nadaf');
});

// Save & Broadcast Messages
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('send_message', async (data) => {
        const newMessage = new Message(data);
        await newMessage.save();
        io.emit('receive_message', data);

        // Send Push Notification
        if (data.fcmToken) {
            sendPushNotification(data.fcmToken, data.user, data.message);
        }
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
    });
});

// Function to Send Push Notification
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
        console.log('Push Notification Sent');
    } catch (error) {
        console.error('Error sending push notification:', error);
    }
};

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
