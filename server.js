const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
require("dotenv").config();

const app = express();
// Allow any origin (Mobile IP, Localhost, etc.)
app.use(cors({ origin: "*" }));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // IMPORTANT: This allows your Mobile to talk to PC
    methods: ["GET", "POST"],
  },
});

let agents = {};

// Helper: Calculate distance between two points (Haversine)
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

// API Endpoint for Homepage Data (Task 6)
app.get("/api/user-distances", (req, res) => {
  const agentKeys = Object.keys(agents);
  const totalUsers = agentKeys.length;
  let distances = [];

  // Calculate distances between all pairs
  for (let i = 0; i < agentKeys.length; i++) {
    for (let j = i + 1; j < agentKeys.length; j++) {
      const u1 = agents[agentKeys[i]];
      const u2 = agents[agentKeys[j]];
      const dist = getDistance(u1.lat, u1.lng, u2.lat, u2.lng);
      distances.push({
        from: u1.name,
        to: u2.name,
        distance: dist.toFixed(2),
      });
    }
  }

  res.json({
    totalUsers,
    hasConnections: totalUsers > 1,
    distances,
  });
});

io.on("connection", (socket) => {
  console.log(`Device Connected: ${socket.id}`);

  // 1. Join a specific session room (Task 3)
  // 1. Join a specific session room (Task 3 & Core Requirement)
  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room ${roomId}`);
    
    // checks/initializes room data if needed, or just let them sync via updates
    // Store room in agent data for easier lookup during updates
    if (!agents[socket.id]) {
        agents[socket.id] = { id: socket.id, room: roomId, lastUpdate: Date.now() };
    } else {
        agents[socket.id].room = roomId;
    }

    // Send only agents IN THIS ROOM to the new joiner
    const roomAgents = {};
    Object.values(agents).forEach(a => {
        if (a.room === roomId) roomAgents[a.id] = a;
    });
    socket.emit("agent-update", roomAgents);
  });

  // 2. MOBILE/GUEST: Agent active (Tasks 1 & 3)
  socket.on("agent-active", (data) => {
    agents[socket.id] = {
      id: socket.id,
      lat: data.lat,
      lng: data.lng,
      name: data.name || `User ${socket.id.substr(0, 4)}`,
      lastUpdate: Date.now(),
      velocity: data.velocity || 0, // Task 6
      room: data.room || agents[socket.id]?.room, // Persist room
      isTracking: data.isTracking || false // Task 1: Store tracking state
    };
    
    const roomId = agents[socket.id].room;
    if (roomId) {
        // Broadcast to everyone in the room INCLUDING sender (so they know they are 'active' if needed, or to sync state)
        // Actually, io.to(roomId) sends to everyone in room including sender? No, socket.to(room) excludes sender. io.to(room) includes sender.
        const roomAgents = {};
        Object.values(agents).forEach(a => {
            if (a.room === roomId) roomAgents[a.id] = a;
        });
        io.to(roomId).emit("agent-update", roomAgents);
        
        // If this agent is tracking, ensure we force a "track-started" event to catch up listeners
        if (data.isTracking) {
             io.to(roomId).emit("track-started", { userId: socket.id });
        }
        console.log(`Agent Active in Room ${roomId}: ${socket.id}`);
    } else {
        // Fallback or global? Requirement says "isolated room". 
        // We will strictly emit nothing global to avoid leaks.
        // But for "Homepage" data, we might need global stats?
        // Let's keep global disabled for strict isolation unless requested.
    }
  });

  // 3. Movement Updates (Task 1)
  socket.on("update-location", (coords) => {
    if (agents[socket.id]) {
      agents[socket.id].lat = coords.lat;
      agents[socket.id].lng = coords.lng;
      agents[socket.id].lastUpdate = Date.now();
      agents[socket.id].velocity = coords.speed || 0; 
      // agents[socket.id].room should already be set via join-room or agent-active

      const roomId = agents[socket.id].room;
      if (roomId) {
          const roomAgents = {};
          Object.values(agents).forEach(a => {
            if (a.room === roomId) roomAgents[a.id] = a;
          });
          
          io.to(roomId).emit("agent-update", roomAgents);
          
          // Helper for homepage stats (if needed per room, or global?)
          // Assuming homepage shows global stats for now as before, 
          // but strict requirement is "No data leak between rooms".
          // We will emit distances-updated only to the room.
          io.to(roomId).emit("distances-updated", {
            totalUsers: Object.keys(roomAgents).length,
            hasConnections: Object.keys(roomAgents).length > 1,
            distances: [], 
          });
      }
    }
  });

  socket.on("disconnect", () => {
    console.log(`Socket Disconnected: ${socket.id}`);
    const agent = agents[socket.id];
    
    if (agent) {
      const roomId = agent.room;
      delete agents[socket.id];
      
      if (roomId) {
          const roomAgents = {};
          Object.values(agents).forEach(a => {
              if (a.room === roomId) roomAgents[a.id] = a;
          });
          io.to(roomId).emit("agent-update", roomAgents);
          io.to(roomId).emit("user-disconnected", socket.id);
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
// Listen on 0.0.0.0 to accept external mobile connections
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT} - Waiting for mobile...`);
});
