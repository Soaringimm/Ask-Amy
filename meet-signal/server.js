import { createServer } from 'http';
import { Server } from 'socket.io';

const PORT = 3100;
const rooms = new Map(); // roomId -> Set<socketId>

const httpServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
    return;
  }
  res.writeHead(404);
  res.end();
});

const io = new Server(httpServer, {
  cors: { origin: '*' },
  path: '/socket.io/',
});

function generateRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

io.on('connection', (socket) => {
  console.log(`[connect] ${socket.id}`);

  // Create a new room
  socket.on('create-room', (callback) => {
    let roomId = generateRoomId();
    while (rooms.has(roomId)) {
      roomId = generateRoomId();
    }
    rooms.set(roomId, new Set([socket.id]));
    socket.join(roomId);
    socket.data.roomId = roomId;
    console.log(`[create] room=${roomId} by ${socket.id}`);
    callback({ roomId });
  });

  // Join an existing room
  socket.on('join-room', (roomId, callback) => {
    roomId = roomId.toUpperCase().trim();
    const room = rooms.get(roomId);

    if (!room) {
      callback({ error: 'Room not found' });
      return;
    }
    if (room.size >= 2) {
      callback({ error: 'Room is full (max 2)' });
      return;
    }

    room.add(socket.id);
    socket.join(roomId);
    socket.data.roomId = roomId;

    // Notify the other peer
    socket.to(roomId).emit('peer-joined', socket.id);
    console.log(`[join] room=${roomId} by ${socket.id}, size=${room.size}`);
    callback({ ok: true });
  });

  // WebRTC signaling relay
  socket.on('signal', ({ to, data }) => {
    io.to(to).emit('signal', { from: socket.id, data });
  });

  // Music sync relay
  socket.on('music-sync', (payload) => {
    const { roomId } = socket.data;
    if (roomId) {
      socket.to(roomId).emit('music-sync', payload);
    }
  });

  socket.on('disconnect', () => {
    const { roomId } = socket.data;
    if (roomId && rooms.has(roomId)) {
      const room = rooms.get(roomId);
      room.delete(socket.id);
      if (room.size === 0) {
        rooms.delete(roomId);
        console.log(`[delete] room=${roomId} (empty)`);
      } else {
        socket.to(roomId).emit('peer-left');
        console.log(`[leave] room=${roomId} by ${socket.id}`);
      }
    }
    console.log(`[disconnect] ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Meet signal server running on :${PORT}`);
});
