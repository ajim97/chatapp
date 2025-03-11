const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Express App
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // Allow all origins
        methods: ['GET', 'POST'],
    },
});

// Middleware
app.use(cors());
app.use(express.json());

// Decode base64 Firebase service account key
const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf8'));

// Initialize Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

// Socket.IO Logic
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // When a message is sent, broadcast it to all users
    socket.on('send_message', (data) => {
        io.emit('receive_message', data);  // Send message to all connected clients

        // Send a push notification to all users (except the sender)
        sendPushNotification(data);
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
    });
});

// Function to send push notification using Firebase Cloud Messaging (FCM)
const sendPushNotification = (messageData) => {
    const payload = {
        notification: {
            title: 'New Message',
            body: `${messageData.user}: ${messageData.message}`,
        },
        token: messageData.token,  // FCM token of the receiver
    };

    admin.messaging().send(payload)
        .then((response) => {
            console.log('Successfully sent message:', response);
        })
        .catch((error) => {
            console.error('Error sending message:', error);
        });
};

// Register FCM token route (to register the device's token for push notifications)
app.post('/register-token', (req, res) => {
    const { token } = req.body;
    if (!token) {
        return res.status(400).json({ error: 'FCM token is required' });
    }

    console.log('Registered FCM token:', token);
    res.status(200).json({ success: true });
});

// Root Route
app.get('/', (req, res) => {
    res.send('Welcome to the Chat App API!');
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
