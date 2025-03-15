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

// ✅ Decode Firebase credentials from .env and initialize Firebase Admin
const serviceAccount = JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf-8')
);
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

// ✅ Store FCM tokens (You can replace this with a database)
let fcmTokens = new Set();

app.get('/', (req, res) => {
    res.send('Welcome to the Chat App API!');
});

// ✅ Store FCM Token (called from frontend)
app.post('/register-token', (req, res) => {
    const { token } = req.body;
    if (token) {
        fcmTokens.add(token);
        res.json({ success: true, message: 'FCM token registered' });
    } else {
        res.status(400).json({ success: false, message: 'Token missing' });
    }
});

// ✅ Socket.IO Real-Time Chat
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('send_message', async (data) => {
        io.emit('receive_message', data); // ✅ Broadcast message

        // ✅ Send push notifications to all registered tokens
        const messages = {
            notification: {
                title: 'New Message',
                body: `${data.user}: ${data.message}`,
            },
        };

        try {
            const tokensArray = Array.from(fcmTokens);
            if (tokensArray.length > 0) {
                await admin.messaging().sendEachForMulticast({
                    tokens: tokensArray,
                    notification: messages.notification,
                });
            }
        } catch (error) {
            console.error('Error sending push notification:', error);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// ✅ Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
