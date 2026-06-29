const dns = require('dns');
// This forces Node.js to use Google's DNS, completely bypassing your local ISP's restrictions
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require("express");
const dotenv = require("dotenv");
dotenv.config();
const cors = require('cors');
const path = require('path');
const http = require('http');
const connectDB = require("./src/config/db");
const authRoutes = require("./src/routes/authRoutes");
const reportRoutes = require('./src/routes/reportRoutes');
const { Server } = require('socket.io');

// Import the Article Routes
const articleRoutes = require('./src/routes/articleRoutes'); 



const app = express();
connectDB();

app.use(express.json());

// CLIENT_URL in production = your deployed frontend URL (e.g. https://your-app.vercel.app)
// Falls back to localhost for local development
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
}));

// --- HTTP SERVER & SOCKET.IO SETUP ---
// We must wrap the Express app in a standard Node HTTP server for WebSockets
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST", "PUT"],
    credentials: true,
  },
});

// Map to track which Agent (User ID) is using which Socket ID
const connectedUsers = new Map();

// Make 'io' and 'connectedUsers' accessible inside your controllers
app.set('io', io);
app.set('connectedUsers', connectedUsers);

// Socket.io Connection Logic
io.on('connection', (socket) => {
  console.log('User connected with Socket ID:', socket.id);

  // When a user logs into React, they send their userId here
  socket.on('register_user', (userId) => {
    connectedUsers.set(userId, socket.id);
    console.log(`Registered User ID: ${userId} to Socket ID: ${socket.id}`);
  });

  socket.on('disconnect', () => {
    // Remove the user from the Map when they close the tab
    for (let [userId, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        connectedUsers.delete(userId);
        console.log(`User ID: ${userId} disconnected.`);
        break;
      }
    }
  });
  // 1. When a user opens a ticket modal, put them in a "Room"
  socket.on('join_ticket', (ticketId) => {
    socket.join(ticketId);
    console.log(`User joined ticket room: ${ticketId}`);
  });

  // 2. Listen for a keypress and broadcast it to the room
  socket.on('typing', ({ ticketId, userName }) => {
    // .to() sends it to everyone in the room EXCEPT the person typing
    socket.to(ticketId).emit('display_typing', userName);
  });

  // 3. Listen for them to stop typing
  socket.on('stop_typing', (ticketId) => {
    socket.to(ticketId).emit('remove_typing');
  });
});

// --- Mount your APIs here ---
app.use("/api/auth", authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/tickets', require('./src/routes/ticketRoutes'));
app.use('/api/articles', articleRoutes);
app.use('/api/chat', require('./src/routes/chatRoutes'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
    res.send("Ticket Booking API is running");
});

// IMPORTANT: Use server.listen instead of app.listen to start both Express and Socket.io
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});