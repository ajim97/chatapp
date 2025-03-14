const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json());

// ✅ Root API Route
app.get('/', (req, res) => {
    res.send('Welcome to the Chat App API!');
});

// ✅ Socket.IO Real-Time Chat
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // ✅ Broadcast received messages to all clients
    socket.on('send_message', (data) => {
        io.emit('receive_message', data); // Send to all users
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// ✅ Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
