require("dotenv").config({ path: '../.env' });
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const axios = require("axios");

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 5000;

// Configure CORS for Socket.IO
const io = socketIo(server, {
  cors: {
    origin: ["https://your-vercel-app.vercel.app", "http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true,
  },
  maxHttpBufferSize: 5 * 1024 * 1024, // Allow up to 5MB for file uploads
});

// Configure CORS for Express
app.use(
  cors({
    origin: ["https://your-vercel-app.vercel.app", "http://localhost:3000"],
    methods: ["GET", "POST", "DELETE"],
    credentials: true,
  })
);
app.use(express.json({ limit: "5mb" }));

// Connect to MongoDB Atlas
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// User Schema
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});
const User = mongoose.model("User", UserSchema);

// Room Schema
const RoomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now },
  messages: [
    {
      type: { type: String, enum: ["text", "image", "audio"], default: "text" },
      text: String,
      sender: String,
      data: String,
      timestamp: { type: Date, default: Date.now },
    },
  ],
});
const Room = mongoose.model("Room", RoomSchema);

// User Activity Schema
const UserActivitySchema = new mongoose.Schema({
  userEmail: { type: String, required: true },
  ipAddress: String,
  location: {
    city: String,
    country: String,
    latitude: Number,
    longitude: Number,
  },
  roomId: String,
  joinTime: { type: Date, default: Date.now },
  exitTime: Date,
  action: { type: String, enum: ["join", "exit"], required: true },
});
const UserActivity = mongoose.model("UserActivity", UserActivitySchema);

// Get IP-based location
const getLocation = async (ip) => {
  try {
    const response = await axios.get(`https://ipapi.co/${ip}/json/`);
    const { city, country_name, latitude, longitude } = response.data;
    return { city, country: country_name, latitude, longitude };
  } catch (err) {
    return { city: "Unknown", country: "Unknown", latitude: 0, longitude: 0 };
  }
};

// Socket.IO
const roomUsers = {};

io.on("connection", (socket) => {
  const token = socket.handshake.auth.token;
  const ip = socket.handshake.address;
  let userEmail = "Unknown";

  // Verify token
  try {
    const decoded = jwt.verify(token, "secret");
    userEmail = decoded.email;
  } catch (err) {
    socket.disconnect();
    return;
  }

  socket.on("joinRoom", async (roomId) => {
    socket.join(roomId);

    // Initialize room users
    if (!roomUsers[roomId]) {
      roomUsers[roomId] = new Set();
    }

    // Add user to room
    roomUsers[roomId].add(userEmail);

    // Log join activity
    const location = await getLocation(ip);
    await UserActivity.create({
      userEmail,
      ipAddress: ip,
      location,
      roomId,
      action: "join",
    });

    // Update room lastActive
    await Room.updateOne({ roomId }, { $set: { lastActive: new Date() } });

    // Emit events
    io.to(roomId).emit("userJoined", userEmail);
    io.to(roomId).emit("roomUsersUpdate", { count: roomUsers[roomId].size });

    // Send room messages
    const room = await Room.findOne({ roomId });
    if (room) {
      socket.emit("messages", room.messages);
    }
  });

  socket.on(
    "message",
    async ({ roomId, type, text, data, sender, timestamp }) => {
      const message = {
        type,
        text,
        data,
        sender,
        timestamp: new Date(timestamp),
      };
      await Room.updateOne({ roomId }, { $push: { messages: message } });
      await Room.updateOne({ roomId }, { $set: { lastActive: new Date() } });
      io.to(roomId).emit("message", message);
    }
  );

  socket.on("disconnect", async () => {
    for (const roomId in roomUsers) {
      if (roomUsers[roomId].has(userEmail)) {
        roomUsers[roomId].delete(userEmail);

        // Log exit activity
        const location = await getLocation(ip);
        await UserActivity.create({
          userEmail,
          ipAddress: ip,
          location,
          roomId,
          action: "exit",
          exitTime: new Date(),
        });

        // Update room lastActive
        await Room.updateOne({ roomId }, { $set: { lastActive: new Date() } });

        // Emit events
        io.to(roomId).emit("userLeft", userEmail);
        io.to(roomId).emit("roomUsersUpdate", {
          count: roomUsers[roomId].size,
        });

        if (roomUsers[roomId].size === 0) {
          delete roomUsers[roomId];
        }
        break;
      }
    }
  });
});

server.listen(port, () => console.log(`Server running on port ${port}`));

app.use(express.static("public"));
