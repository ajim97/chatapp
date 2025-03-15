const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const admin = require('firebase-admin');
const cors = require('cors');
require('dotenv').config();

// ✅ Initialize Firebase Admin with service account JSON from Render ENV
const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf-8'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
});

// Middleware
app.use(cors());
app.use(express.json());

// Store FCM Tokens
const userTokens = {};

// ✅ Register FCM Token
app.post('/register-token', (req, res) => {
    const { username, fcmToken } = req.body;
    if (username && fcmToken) {
        userTokens[username] = fcmToken;
        console.log(`✅ FCM Token registered for ${username}`);
        res.status(200).send({ success: true });
    } else {
        res.status(400).send({ success: false, message: 'Invalid data' });
    }
});

// ✅ Handle Socket.IO Connections
io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.id}`);

    socket.on('send_message', (data) => {
        io.emit('receive_message', data);

        // ✅ Send Push Notification
        if (userTokens[data.user]) {
            const payload = {
                token: userTokens[data.user],
                notification: {
                    title: 'New Message',
                    body: `${data.user}: ${data.message}`,
                },
                data: {
                    user: data.user,
                    message: data.message,
                    timestamp: data.timestamp,
                },
            };

            admin.messaging().send(payload)
                .then(() => console.log(`📩 Push notification sent to ${data.user}`))
                .catch((err) => console.error('❌ FCM Error:', err));
        }
    });

    socket.on('disconnect', () => {
        console.log(`❌ User disconnected: ${socket.id}`);
    });
});

// Start Server
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
