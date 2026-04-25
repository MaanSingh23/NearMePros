const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

dotenv.config();

const app = express();
const server = http.createServer(app);

// IMMEDIATE HEALTH CHECK
app.get('/health', (req, res) => res.status(200).send('API IS ALIVE'));

// Allow Vercel frontend and Local frontend
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const io = socketIo(server, {
  cors: {
    origin: [FRONTEND_URL, "https://nearmepros.vercel.app"], // Add your future Vercel URL here
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: [FRONTEND_URL, "https://nearmepros.vercel.app"],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://singh:maan@ac-xc8wjap-shard-00-00.ezjun3u.mongodb.net:27017,ac-xc8wjap-shard-00-01.ezjun3u.mongodb.net:27017,ac-xc8wjap-shard-00-02.ezjun3u.mongodb.net:27017/localservice?ssl=true&replicaSet=atlas-pijlws-shard-0&authSource=admin&retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => console.log('❌ MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/services', require('./routes/services'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/provider', require('./routes/provider'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/verification', require('./routes/verification'));
app.use('/api/admin', require('./routes/admin'));

// Professional API Health Check / Home Route
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Near Me Pros API is Professionaly Working 🚀',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      auth: '/api/auth',
      services: '/api/services',
      bookings: '/api/bookings'
    }
  });
});

// Socket.io for real-time notifications
io.on('connection', (socket) => {
  console.log('🟢 New client connected');
  
  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined room`);
  });

  socket.on('disconnect', () => {
    console.log('🔴 Client disconnected');
  });
});

app.set('io', io);

// CATCH ALL ROUTE FOR UNMAPPED PATHS
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found on this server.`,
    hint: 'If you are looking for the frontend, it will be deployed on Vercel soon.'
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📁 Uploads folder: ${path.join(__dirname, 'uploads')}`);
});
