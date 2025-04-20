const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).catch(err => console.error('MongoDB connection error:', err));

// User Schema
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});
const User = mongoose.model('User', UserSchema);

// Routes
module.exports = async (req, res) => {
  if (req.method === 'POST' && req.url === '/login') {
    const { email, password } = req.body;
    try {
      const user = await User.findOne({ email });
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      const token = jwt.sign({ id: user._id, email }, 'secret', { expiresIn: '1h' });
      res.json({ user: { email }, token });
    } catch (err) {
      res.status(400).json({ error: 'Login failed' });
    }
  } else if (req.method === 'POST' && req.url === '/register') {
    const { email, password } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new User({ email, password: hashedPassword });
      await user.save();
      const token = jwt.sign({ id: user._id, email }, 'secret', { expiresIn: '1h' });
      res.json({ user: { email }, token });
    } catch (err) {
      res.status(400).json({ error: 'Registration failed' });
    }
  } else if (req.method === 'GET' && req.url === '/verify') {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    try {
      const decoded = jwt.verify(token, 'secret');
      const user = await User.findById(decoded.id).select('-password');
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ user: { email: user.email } });
    } catch (err) {
      res.status(400).json({ error: 'Verification failed' });
    }
  } else {
    res.status(404).json({ error: 'Not found' });
  }
};