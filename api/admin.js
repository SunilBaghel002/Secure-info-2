const mongoose = require('mongoose');

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).catch(err => console.error('MongoDB connection error:', err));

// Schemas
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

const UserActivitySchema = new mongoose.Schema({
  userEmail: { type: String, required: true },
  ipAddress: String,
  location: {
    city: String,
    country: String,
    latitude: Number,
    longitude: Number
  },
  roomId: String,
  joinTime: { type: Date, default: Date.now },
  exitTime: Date,
  action: { type: String, enum: ['join', 'exit'], required: true }
});
const UserActivity = mongoose.model('UserActivity', UserActivitySchema);

// Admin Middleware
const adminMiddleware = async (req, res, next) => {
  const { adminPassword } = req.body;
  if (adminPassword !== process.env.ADMIN_PASSWORD) {
    return res.status(403).json({ error: 'Invalid admin password' });
  }
  next();
};

module.exports = async (req, res) => {
  if (req.method === 'POST' && req.url === '/rooms') {
    try {
      await adminMiddleware(req, res, async () => {
        const rooms = await Room.find().select('roomId createdAt lastActive messages');
        res.json(rooms);
      });
    } catch (err) {
      res.status(400).json({ error: 'Failed to fetch rooms' });
    }
  } else if (req.method === 'POST' && req.url === '/activity') {
    try {
      await adminMiddleware(req, res, async () => {
        const activities = await UserActivity.find().sort({ joinTime: -1 });
        res.json(activities);
      });
    } catch (err) {
      res.status(400).json({ error: 'Failed to fetch activity' });
    }
  } else {
    res.status(404).json({ error: 'Not found' });
  }
};