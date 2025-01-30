const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const admin = require('firebase-admin');
const cors = require('cors');
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

// Decode Base64 JSON from .env and Initialize Firebase
const firebaseAdminConfig = JSON.parse(
    Buffer.from(process.env.FIREBASE_ADMIN_SDK_BASE64, 'base64').toString('utf8')
);
admin.initializeApp({
    credential: admin.credential.cert(firebaseAdminConfig),
});

console.log('Firebase Admin SDK Initialized Successfully');

// Store user FCM tokens
let userTokens = {};

// Handle Socket.IO Connections
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Store the user's FCM token
    socket.on('register_fcm_token', (data) => {
        userTokens[data.username] = data.fcmToken;
        console.log(`FCM Token registered for ${data.username}`);
    });

    // Handle message sending
    socket.on('send_message', async (data) => {
        io.emit('receive_message', data);

        // Send FCM notification
        if (data.username in userTokens) {
            const payload = {
                notification: {
                    title: `New Message from ${data.user}`,
                    body: data.message || "New media message",
                },
                token: userTokens[data.username],
            };

            try {
                await admin.messaging().send(payload);
                console.log(`FCM notification sent to ${data.username}`);
            } catch (error) {
                console.error("Error sending FCM notification:", error);
            }
        }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
    });
});
app.get('/', (req, res) => {
    res.send('Welcome to the Chat App API!');
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
