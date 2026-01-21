const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Storage configuration
const uploadsDir = path.join(__dirname, 'public', 'subtitles');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.vtt', '.srt', '.ass', '.ssa'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('صيغة الملف غير مدعومة. الصيغ المدعومة: VTT, SRT, ASS, SSA'));
    }
  }
});

// In-memory storage
const rooms = new Map();
const chatMessages = new Map();

// Convert SRT to VTT
function convertSrtToVtt(srtContent) {
  try {
    // Remove BOM if present
    const cleanContent = srtContent.replace(/^\uFEFF/, '');
    
    // Convert time format from 00:00:00,000 to 00:00:00.000
    const converted = cleanContent
      .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')
      // Convert text formatting
      .replace(/\\N/g, '\n')
      .replace(/\\n/g, '\n');

    return `WEBVTT\n\n${converted}`;
  } catch (e) {
    console.error('Error converting SRT to VTT:', e);
    return srtContent;
  }
}

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Create room API
app.post('/api/rooms', upload.single('subtitle'), async (req, res) => {
  try {
    const { name, videoUrl, hostName } = req.body;
    const roomId = uuidv4();
    
    if (!name || !videoUrl || !hostName) {
      return res.status(400).json({ 
        success: false, 
        error: 'جميع الحقول مطلوبة' 
      });
    }

    // Handle subtitle file
    let subtitlePath = null;
    if (req.file) {
      subtitlePath = `/subtitles/${req.file.filename}`;
      
      // Convert SRT to VTT if needed
      if (req.file.originalname.toLowerCase().endsWith('.srt')) {
        const srtContent = fs.readFileSync(req.file.path, 'utf8');
        const vttContent = convertSrtToVtt(srtContent);
        
        const vttPath = req.file.path.replace('.srt', '.vtt');
        fs.writeFileSync(vttPath, vttContent, 'utf8');
        
        // Update subtitle path
        fs.unlinkSync(req.file.path);
        subtitlePath = `/subtitles/${path.basename(vttPath)}`;
      }
    }

    const room = {
      id: roomId,
      name,
      videoUrl,
      subtitlePath,
      hostName,
      createdAt: new Date().toISOString(),
      currentTime: 0,
      isPlaying: false,
      users: []
    };

    rooms.set(roomId, room);
    chatMessages.set(roomId, []);

    console.log(`Room created: ${name} by ${hostName}`);
    
    res.json({ success: true, room });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ success: false, error: 'فشل إنشاء الغرفة' });
  }
});

// Get all rooms API
app.get('/api/rooms', (req, res) => {
  const roomsList = Array.from(rooms.values())
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ rooms: roomsList });
});

// Get room API
app.get('/api/rooms/:id', (req, res) => {
  const room = rooms.get(req.params.id);
  if (!room) {
    return res.status(404).json({ success: false, error: 'الغرفة غير موجودة' });
  }
  res.json({ success: true, room });
});

// Update room state API
app.put('/api/rooms/:id', (req, res) => {
  const room = rooms.get(req.params.id);
  if (!room) {
    return res.status(404).json({ success: false, error: 'الغرفة غير موجودة' });
  }

  const { currentTime, isPlaying } = req.body;
  if (currentTime !== undefined) room.currentTime = currentTime;
  if (isPlaying !== undefined) room.isPlaying = isPlaying;

  rooms.set(req.params.id, room);
  res.json({ success: true, room });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join room
  socket.on('join-room', ({ roomId, username }) => {
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('error', { message: 'الغرفة غير موجودة' });
      return;
    }

    // Join socket room
    socket.join(roomId);
    socket.data = { roomId, username };

    // Add user to room
    if (!room.users.find(u => u.id === socket.id)) {
      room.users.push({
        id: socket.id,
        username,
        joinedAt: new Date()
      });
    }

    rooms.set(roomId, room);

    // Notify others
    socket.to(roomId).emit('user-joined', {
      username,
      userCount: room.users.length
    });

    // Send current room state to new user
    socket.emit('room-joined', {
      room: {
        id: room.id,
        name: room.name,
        videoUrl: room.videoUrl,
        subtitlePath: room.subtitlePath,
        hostName: room.hostName,
        currentTime: room.currentTime,
        isPlaying: room.isPlaying,
        users: room.users
      },
      messages: chatMessages.get(roomId) || []
    });

    console.log(`User ${username} joined room ${roomId}`);
  });

  // Video sync events
  socket.on('video-play', ({ roomId, currentTime }) => {
    const room = rooms.get(roomId);
    if (!room || socket.data.roomId !== roomId) return;

    room.currentTime = currentTime;
    room.isPlaying = true;
    rooms.set(roomId, room);

    socket.to(roomId).emit('sync-play', {
      currentTime,
      username: socket.data.username
    });

    console.log(`Room ${roomId}: ${socket.data.username} played video at ${currentTime}`);
  });

  socket.on('video-pause', ({ roomId, currentTime }) => {
    const room = rooms.get(roomId);
    if (!room || socket.data.roomId !== roomId) return;

    room.currentTime = currentTime;
    room.isPlaying = false;
    rooms.set(roomId, room);

    socket.to(roomId).emit('sync-pause', {
      currentTime,
      username: socket.data.username
    });

    console.log(`Room ${roomId}: ${socket.data.username} paused video at ${currentTime}`);
  });

  socket.on('video-seek', ({ roomId, currentTime }) => {
    const room = rooms.get(roomId);
    if (!room || socket.data.roomId !== roomId) return;

    room.currentTime = currentTime;
    rooms.set(roomId, room);

    socket.to(roomId).emit('sync-seek', {
      currentTime,
      username: socket.data.username
    });

    console.log(`Room ${roomId}: ${socket.data.username} seeked to ${currentTime}`);
  });

  socket.on('video-rate', ({ roomId, playbackRate }) => {
    const room = rooms.get(roomId);
    if (!room || socket.data.roomId !== roomId) return;

    socket.to(roomId).emit('sync-rate', {
      playbackRate,
      username: socket.data.username
    });

    console.log(`Room ${roomId}: ${socket.data.username} changed rate to ${playbackRate}x`);
  });

  // Request sync (for new joiners)
  socket.on('request-sync', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room || socket.data.roomId !== roomId) return;

    socket.to(roomId).emit('sync-request', {
      requesterId: socket.id
    });
  });

  socket.on('send-sync-state', ({ requesterId, state }) => {
    const room = rooms.get(socket.data.roomId);
    if (!room) return;

    io.to(requesterId).emit('sync-state', state);
  });

  // Chat events
  socket.on('send-message', ({ roomId, message }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const chatMessage = {
      id: uuidv4(),
      username: socket.data.username,
      message,
      timestamp: new Date()
    };

    const messages = chatMessages.get(roomId) || [];
    messages.push(chatMessage);
    if (messages.length > 100) messages.shift(); // Keep last 100 messages
    chatMessages.set(roomId, messages);

    io.to(roomId).emit('chat-message', chatMessage);
  });

  // Disconnect
  socket.on('disconnect', () => {
    const { roomId, username } = socket.data || {};
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room) return;

    // Remove user from room
    room.users = room.users.filter(u => u.id !== socket.id);
    rooms.set(roomId, room);

    // Notify others
    socket.to(roomId).emit('user-left', {
      username,
      userCount: room.users.length
    });

    console.log(`User ${username} left room ${roomId}`);
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('=================================');
  console.log('🎬 Watch Party Server');
  console.log('=================================');
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket server ready`);
  console.log('=================================\n');
});