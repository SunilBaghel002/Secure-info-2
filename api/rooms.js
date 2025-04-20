const express = require('express');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).catch(err => console.error('MongoDB connection error:', err));

// Room Schema
const RoomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now },
  messages: [{
    type: { type: String, enum: ['text', 'image', 'audio'], default: 'text' },
    text: String,
    sender: String,
    data: String,
    timestamp: { type: Date, default: Date.now }
  }]
});
const Room = mongoose.model('Room', RoomSchema);

// Authentication Middleware
const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, 'secret');
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = async (req, res) => {
  if (req.method === 'POST' && req.url === '/create') {
    const { roomId, password } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const room = new Room({ roomId, password: hashedPassword });
      await room.save();
      res.json({ message: 'Room created' });
    } catch (err) {
      res.status(400).json({ error: 'Room creation failed' });
    }
  } else if (req.method === 'POST' && req.url === '/join') {
    const { roomId, password } = req.body;
    try {
      const room = await Room.findOne({ roomId });
      if (!room || !(await bcrypt.compare(password, room.password))) {
        return res.status(401).json({ error: 'Invalid room ID or password' });
      }
      res.json({ message: 'Joined room' });
    } catch (err) {
      res.status(400).json({ error: 'Failed to join room' });
    }
  } else if (req.method === 'DELETE' && req.url.startsWith('/')) {
    const roomId = req.url.split('/')[1];
    try {
      await Room.updateOne({ roomId }, { $set: { messages: [] } });
      res.json({ message: 'Messages cleared' });
    } catch (err) {
      res.status(400).json({ error: 'Failed to clear messages' });
    }
  } else {
    res.status(404).json({ error: 'Not found' });
  }
};