const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: '*' }
});

// serve static files
// app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
  res.send("server is  running ")
});

const users = new Map(); // id -> { id, isSharing }

io.on('connection', (socket) => {
  users.set(socket.id, { id: socket.id, isSharing: false });
  io.emit('users-update', Array.from(users.values()));

  // sharer toggles
  socket.on('start-sharing', () => {
    const u = users.get(socket.id);
    if (u) u.isSharing = true;
    io.emit('users-update', Array.from(users.values()));
    socket.broadcast.emit('user-started-sharing', socket.id);
  });

  socket.on('stop-sharing', () => {
    const u = users.get(socket.id);
    if (u) u.isSharing = false;
    io.emit('users-update', Array.from(users.values()));
    socket.broadcast.emit('user-stopped-sharing', socket.id);
  });

  // signalling
  socket.on('offer', ({ target, offer }) => {
    io.to(target).emit('offer', { offer, sender: socket.id });
  });

  socket.on('answer', ({ target, answer }) => {
    io.to(target).emit('answer', { answer, sender: socket.id });
  });

  socket.on('ice-candidate', ({ target, candidate }) => {
    io.to(target).emit('ice-candidate', { candidate, sender: socket.id });
  });

  socket.on('disconnect', () => {
    users.delete(socket.id);
    socket.broadcast.emit('user-disconnected', socket.id);
    io.emit('users-update', Array.from(users.values()));
  });
});

// ---- Start server ----
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(` Screen sharing server running on port ${PORT}`);
  console.log(` Node version: ${process.version}`);
  console.log(` Access at: http://localhost:${PORT} (local) or your Render URL`);
});
