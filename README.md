# AETHER Backend - Real-Time Location Tracking Server

Production-ready Socket.IO backend for real-time location tracking with room isolation and telemetry processing.

## 🚀 Features

### Socket.IO Core

- **Room Isolation**: Strict session isolation for privacy (Room A cannot see Room B)
- **Event-Driven Architecture**: Sub-second latency updates
- **Telemetry Processing**: Server-side distance calculation (Haversine)
- **State Management**: In-memory agent data with room-based filtering

### API Endpoints

- `GET /api/user-distances` - Calculate distances between all connected users

### Socket Events

- `join-room` - User joins a specific tracking room
- `agent-active` - Agent announces presence with initial location
- `update-location` - Real-time location updates
- `agent-update` - Server broadcasts agent states to room
- `track-started` - Tracking session initiated
- `user-disconnected` - Agent cleanup on disconnect

## 🏗️ Architecture

**Tech Stack:**

- Node.js 18+
- Express.js
- Socket.IO 4.x
- CORS enabled for cross-origin requests

**Data Flow:**

1. Mobile/Web client connects via Socket.IO
2. Client joins room via `join-room` event
3. Location updates broadcast only to room members
4. Server calculates distances between agents
5. Real-time state sync to all room participants

## 🚀 Quick Start

### Installation

```bash
npm install
```

### Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

**Required Variables:**

- `PORT` - Server port (default: 5000)

### Development

```bash
npm run dev
```

Server runs on `http://0.0.0.0:5000` (accessible via LAN)

### Production

```bash
npm start
```

## 📦 Deployment

### Render.com (Recommended)

1. Connect GitHub repository
2. **Build Command:** `npm install`
3. **Start Command:** `node server.js`
4. **Environment Variable:** `PORT=5000`

### Railway.app

1. Connect repository
2. Set start command: `node server.js`
3. Add environment variable: `PORT`

## 🔒 Security Features

- CORS configured for all origins (customize for production)
- Room-based data isolation
- No data persistence (stateless architecture)
- Automatic cleanup on disconnect

## 📡 Connection Specs

- **Transport:** WebSocket with polling fallback
- **Latency:** Sub-200ms average
- **Network:** Listens on `0.0.0.0` for LAN access

## 📄 License

GPL-3.0

---

**Part of AETHER V2** - Advanced Entity Tracking & Heuristic Evaluation Resource

**Maintained by:** [NVIAM](https://github.com/NVIAM37)
