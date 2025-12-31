const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");

dotenv.config();

const authRoutes = require("./routes/auth");
const meetingRoutes = require("./routes/meeting");
const { initializeSignaling } = require("./socket/signaling");

const app = express();
const server = http.createServer(app);

// Socket.io setup with CORS for frontend
// Allowing * for development access from local network devices
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  }
});

app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "running", message: "SyncRoom API" });
});

// Serve static files from the React frontend app
app.use(express.static(path.join(__dirname, "../frontend/frontend/dist")));

// Routes
app.use("/auth", authRoutes);
app.use("/meeting", meetingRoutes);



// Anything that doesn't match the above, send back index.html
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/frontend/dist/index.html"));
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ success: false, message: "Internal server error" });
});

// Initialize WebRTC signaling
initializeSignaling(io);

// Start server
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    server.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err.message);
  server.close(() => process.exit(1));
});