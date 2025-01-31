const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const admin = require('firebase-admin');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
});

// ✅ Middleware
app.use(cors());
app.use(express.json());

// ✅ Firebase Admin SDK Initialization
const serviceAccount = JSON.parse(
    Buffer.from(process.env.FIREBASE_ADMIN_SDK_BASE64, 'base64').toString('utf8')
);
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});
console.log("✅ Firebase Admin SDK Initialized Successfully");

// ✅ Root API Route
app.get('/', (req, res) => {
    res.send('Welcome to the Chat App API! 🌍');
});

// ✅ Handle WebSocket Connections
io.on('connection', (socket) => {
    console.log('🔵 A user connected:', socket.id);

    socket.on('send_message', async (data) => {
        console.log('📥 Received Message:', data);

        // Broadcast message to all clients
        io.emit('receive_message', data);
        console.log("📤 Message Broadcasted to Clients:", data);

        // Send push notification
        if (data.fcmToken) {
            sendPushNotification(data.fcmToken, data.user, data.message);
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

// ✅ Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server Running on http://localhost:${PORT}`);
});
