const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
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
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('✅ MongoDB connected'))
    .catch((err) => console.error('❌ MongoDB connection error:', err));

// Message Schema
const messageSchema = new mongoose.Schema({
    user: String,
    message: String,
    timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

// JSON Server URL (for local JSON storage)
const JSON_SERVER_URL = 'https://secret-resisted-court.glitch.me/movies';

// Root Route
app.get('/', (req, res) => {
    res.send('✅ Chat App API is Running!');
});

// Fetch all messages from MongoDB
app.get('/messages', async (req, res) => {
    try {
        const messages = await Message.find();
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// Handle WebSocket Connections
io.on('connection', async (socket) => {
    console.log(`✅ User connected: ${socket.id}`);

    try {
        // Fetch previous messages from MongoDB and send to client
        const previousMessages = await Message.find();
        socket.emit('previous_messages', previousMessages);
    } catch (error) {
        console.error('❌ Error fetching messages:', error);
    }

    // Handle incoming messages
    socket.on('send_message', async (data) => {
        try {
            const newMessage = new Message({ user: data.user, message: data.message });
            await newMessage.save(); // Save to MongoDB

            // Save message to JSON Server
            await axios.post(JSON_SERVER_URL, data).catch(err => console.error('❌ JSON Server Error:', err));

            io.emit('receive_message', newMessage); // Broadcast message
        } catch (error) {
            console.error('❌ Error saving message:', error);
        }
    });

    socket.on('disconnect', () => {
        console.log(`❌ User disconnected: ${socket.id}`);
    });
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});

