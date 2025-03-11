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
    .then(() => console.log('MongoDB connected'))
    .catch((err) => console.error('MongoDB connection error:', err));

// Decode Firebase service account key from .env
const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
const serviceAccount = JSON.parse(Buffer.from(serviceAccountBase64, 'base64').toString('utf8'));

// Initialize Firebase Admin SDK
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

// Root Route
app.get('/', (req, res) => {
    res.send('Welcome to the Chat App API!');
});

// Store device tokens
const userTokens = new Map();

app.post('/register-token', (req, res) => {
    const { userId, token } = req.body;
    userTokens.set(userId, token);
    res.json({ success: true, message: "Token registered successfully" });
});

// Socket.IO Logic
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('send_message', async (data) => {
        io.emit('receive_message', data);

        // Send FCM notification
        if (userTokens.has(data.user)) {
            const message = {
                notification: {
                    title: "New Message",
                    body: `${data.user}: ${data.message}`,
                },
                token: userTokens.get(data.user),
            };

            try {
                await admin.messaging().send(message);
                console.log("Push notification sent");
            } catch (error) {
                console.error("Error sending push notification:", error);
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
    });
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
