const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const admin = require('firebase-admin');
require('dotenv').config();

// Decode and parse the Base64 service account key from .env
const serviceAccountKey = JSON.parse(
    Buffer.from(process.env.SERVICE_ACCOUNT_KEY_B64, 'base64').toString('utf-8')
  );
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountKey),
  });

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
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Root Route
app.get('/', (req, res) => {
  res.send('Welcome to the Chat App API! Hello world welcome to my new website and  my new App');
});

// Socket.IO Logic
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('send_message', (msgData) => {
    // Save the message to your database (replace with your actual logic)
    saveMessageToServer(msgData);

    // Emit the message to all connected clients
    io.emit('receive_message', msgData);

    // If a recipient FCM token exists, send a notification using Firebase Admin
    if (msgData.recipientFcmToken) {
      const messagePayload = {
        token: msgData.recipientFcmToken, // The recipient’s FCM token
        notification: {
          title: 'New Message',
          body: `${msgData.user}: ${msgData.message}`,
        },
        data: {
          messageId: msgData.id || '', // Optional custom data for navigation
        },
      };

      admin
        .messaging()
        .send(messagePayload)
        .then((response) => {
          console.log('Notification sent successfully:', response);
        })
        .catch((error) => {
          console.error('Error sending notification:', error);
        });
    }
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
  });
});

// Dummy function for saving messages (replace with your actual database logic)
function saveMessageToServer(msgData) {
  console.log('Message saved:', msgData);
  // Example: Use Mongoose models here to save the message to MongoDB.
}

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
