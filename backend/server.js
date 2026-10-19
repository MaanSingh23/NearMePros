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

// Shows which settings are present (true/false only, never the values)
app.get('/health/config', (req, res) => {
  const isSet = (name) => Boolean(process.env[name] && process.env[name].trim());
  res.json({
    mongo: isSet('MONGO_URI') || isSet('MONGODB_URI'),
    jwtSecret: isSet('JWT_SECRET'),
    imagekitPublicKey: isSet('IMAGEKIT_PUBLIC_KEY'),
    imagekitPrivateKey: isSet('IMAGEKIT_PRIVATE_KEY'),
    imagekitUrlEndpoint: isSet('IMAGEKIT_URL_ENDPOINT') ? 'set' : 'using default',
    gemini: isSet('GEMINI_API_KEY'),
    geminiStatus: require('./routes/ai').geminiStatus
  });
});

// Allow Vercel frontend and Local frontend
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const io = socketIo(server, {
  cors: {
    origin: [FRONTEND_URL, "https://nearmepros.vercel.app"],
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
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!mongoUri) {
  console.error('❌ MONGO_URI is not set. Add it to backend/.env (or the environment variables on Render).');
  process.exit(1);
}

mongoose.connect(mongoUri, {
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
app.use('/api/ai', require('./routes/ai'));
app.use('/api/emergency', require('./routes/emergency'));

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
  
  // Clients join their own room with their login token, so nobody can
  // listen to another user's booking alerts
  socket.on('join', (payload) => {
    try {
      const token = typeof payload === 'object' ? payload?.token : null;
      if (!token) return;
      const { userId } = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'your-secret-key');
      socket.join(String(userId));
      socket.emit('joined', { ok: true });
    } catch {
      socket.emit('joined', { ok: false });
    }
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
