require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const admin = require('firebase-admin');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json());

// ✅ Decode Base64 Firebase Credentials (From Render Environment Variable)
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.error("❌ FIREBASE_SERVICE_ACCOUNT is missing in environment variables!");
    process.exit(1);
}

const serviceAccount = JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf-8')
);

// ✅ Initialize Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

// ✅ Store user FCM tokens in memory
const userTokens = {};

// 🔹 API to Register FCM Tokens
app.post('/register-token', (req, res) => {
    const { username, fcmToken } = req.body;

    if (username && fcmToken) {
        userTokens[username] = fcmToken;
        console.log(`✅ FCM Token registered for ${username}`);
        res.status(200).json({ message: 'Token registered successfully' });
    } else {
        res.status(400).json({ error: 'Invalid data' });
    }
});

// 🔹 Socket.io Chat Functionality
io.on('connection', (socket) => {
    console.log('✅ User connected:', socket.id);

    socket.on('send_message', async (data) => {
        io.emit('receive_message', data); // Broadcast message

        // 🔥 Send push notification if recipient's FCM token exists
        if (userTokens[data.user]) {
            const message = {
                token: userTokens[data.user],
                notification: {
                    title: 'New Message',
                    body: `${data.user}: ${data.message}`,
                },
                android: {
                    priority: 'high',
                    notification: {
                        sound: 'default',
                    },
                },
                apns: {
                    payload: {
                        aps: { sound: 'default' },
                    },
                },
            };

            try {
                await admin.messaging().send(message);
                console.log(`📩 Push notification sent to ${data.user}`);
            } catch (error) {
                console.error('❌ Error sending notification:', error);
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('❌ User disconnected:', socket.id);
    });
});

// 🔥 Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
