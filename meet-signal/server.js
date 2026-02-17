import { createServer } from 'http';
import { Server } from 'socket.io';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import Busboy from 'busboy';

const PORT = 3100;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const TURN_SERVER_URL = process.env.TURN_SERVER_URL || '';
const TURN_USERNAME = process.env.TURN_USERNAME || '';
const TURN_CREDENTIAL = process.env.TURN_CREDENTIAL || '';

// ─── Process-level error guards (H-4) ───────────────────────────────────────
// Prevent any unhandled exception from crashing the server and dropping all calls.
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException] Unexpected error — server continues:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection] Unhandled promise rejection:', reason);
});

const MAX_ROOMS = 500; // Guard against memory exhaustion (M-3)

const rooms = new Map(); // roomId -> Set<socketId>
const disconnectTimers = new Map(); // stableId -> timeoutId
const socketToStableId = new Map(); // socketId -> stableId
const stableIdToRoom = new Map(); // stableId -> roomId

// Gemini client
let genAI = null;
if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
}

// Supabase admin client for auth verification
let supabaseAdmin = null;
if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

// ─── Auth middleware ────────────────────────────────────────────────────────

/**
 * Verify Supabase JWT from Authorization header.
 * Returns user object or null.
 */
async function authenticateRequest(req) {
  if (!supabaseAdmin) {
    console.warn('[auth] Supabase not configured, skipping auth');
    return null;
  }

  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return null;
    return user;
  } catch (err) {
    console.error('[auth] Token verification failed:', err.message);
    return null;
  }
}

/**
 * Middleware: require authentication. Sends 401 if not authenticated.
 * Returns user or null (if response was already sent).
 */
async function requireAuth(req, res) {
  const user = await authenticateRequest(req);
  if (!user) {
    sendJson(res, 401, { error: 'Authentication required' });
    return null;
  }
  return user;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function collectBody(req, maxBytes = 50 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error('Body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

/**
 * Parse multipart/form-data using busboy.
 * Returns array of { name, filename, contentType, data (Buffer) }.
 */
function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const parts = [];
    try {
      const bb = Busboy({ headers: req.headers, limits: { fileSize: 50 * 1024 * 1024 } });

      bb.on('file', (name, stream, info) => {
        const { filename, mimeType } = info;
        const chunks = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => {
          parts.push({
            name,
            filename,
            contentType: mimeType,
            data: Buffer.concat(chunks),
          });
        });
      });

      bb.on('field', (name, value) => {
        parts.push({ name, data: value });
      });

      bb.on('close', () => resolve(parts));
      bb.on('error', (err) => reject(err));

      req.pipe(bb);
    } catch (err) {
      reject(err);
    }
  });
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(data));
}

// Retry wrapper for Gemini API calls (handles 429)
const RETRY_BASE_DELAY_MS = 5000;
async function callWithRetry(fn, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const is429 = err.message?.includes('429') || err.message?.includes('Resource exhausted');
      if (is429 && attempt < maxRetries) {
        const delay = (attempt + 1) * RETRY_BASE_DELAY_MS;
        console.log(`[retry] 429 hit, waiting ${delay / 1000}s before retry ${attempt + 1}/${maxRetries}`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
}

// ─── API Handlers ───────────────────────────────────────────────────────────

// GET /api/meet/ice-servers — return TURN credentials
async function handleIceServers(req, res) {
  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  // Add TURN server if configured
  if (TURN_SERVER_URL && TURN_USERNAME && TURN_CREDENTIAL) {
    iceServers.push({
      urls: TURN_SERVER_URL,
      username: TURN_USERNAME,
      credential: TURN_CREDENTIAL,
    });
  }

  sendJson(res, 200, { iceServers });
}

// POST /api/meet/transcribe — receive audio, return transcript
async function handleTranscribe(req, res) {
  // Require authentication
  const user = await requireAuth(req, res);
  if (!user) return;

  if (!genAI) return sendJson(res, 500, { error: 'GEMINI_API_KEY not configured' });

  try {
    const ct = req.headers['content-type'] || '';
    let audioData, mimeType;

    if (ct.includes('multipart/form-data')) {
      const parts = await parseMultipart(req);
      const filePart = parts.find(p => p.filename);
      if (!filePart) return sendJson(res, 400, { error: 'No audio file in request' });
      audioData = filePart.data;
      mimeType = filePart.contentType || 'audio/webm';
    } else {
      const body = await collectBody(req);
      audioData = body;
      mimeType = ct || 'audio/webm';
    }

    console.log(`[transcribe] user=${user.id}, audio size=${audioData.length}, mime=${mimeType}`);

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
    const result = await callWithRetry(() =>
      model.generateContent([
        {
          inlineData: {
            mimeType,
            data: audioData.toString('base64'),
          },
        },
        {
          text: `Transcribe this audio recording of a meeting conversation.
Rules:
- Output ONLY the transcript text, no headers or labels
- If multiple speakers are distinguishable, label them as "Speaker 1:", "Speaker 2:", etc.
- If the language is not English, transcribe in the original language
- Ignore background music or non-speech sounds
- If no speech is detected, respond with exactly: [No speech detected]`,
        },
      ])
    );

    const transcript = result.response.text().trim();
    console.log(`[transcribe] done, length=${transcript.length}`);
    sendJson(res, 200, { transcript });
  } catch (err) {
    console.error('[transcribe] error:', err.message);
    sendJson(res, 500, { error: err.message });
  }
}

// POST /api/meet/summarize — receive transcript + topic, return structured summary
async function handleSummarize(req, res) {
  // Require authentication
  const user = await requireAuth(req, res);
  if (!user) return;

  if (!genAI) return sendJson(res, 500, { error: 'GEMINI_API_KEY not configured' });

  try {
    const body = await collectBody(req);
    const { transcript, topic } = JSON.parse(body.toString());

    if (!transcript) return sendJson(res, 400, { error: 'transcript is required' });
    if (transcript.length > 50000) return sendJson(res, 400, { error: 'Transcript too long (max 50000 chars)' });

    console.log(`[summarize] user=${user.id}, transcript length=${transcript.length}, topic=${topic || '(none)'}`);

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
    const result = await callWithRetry(() =>
      model.generateContent([
        {
          text: `You are a meeting notes assistant. Given the following meeting transcript${topic ? ` about "${topic}"` : ''}, produce a structured summary in JSON format.

Output ONLY valid JSON with this exact structure:
{
  "title": "Brief meeting title",
  "summary": "2-3 sentence overview of the meeting",
  "keyPoints": ["point 1", "point 2", ...],
  "actionItems": ["action 1", "action 2", ...],
  "decisions": ["decision 1", "decision 2", ...]
}

Rules:
- If the transcript is in a non-English language, write the summary in that same language
- If the transcript contains "[No speech detected]" or is very short, return minimal content
- Keep each array item concise (one sentence)
- actionItems should be specific and actionable
- If no action items or decisions exist, use empty arrays

Transcript:
${transcript}`,
        },
      ])
    );

    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return sendJson(res, 500, { error: 'Failed to parse summary response' });
    }
    const summary = JSON.parse(jsonMatch[0]);
    console.log(`[summarize] done, title=${summary.title}`);
    sendJson(res, 200, { summary });
  } catch (err) {
    console.error('[summarize] error:', err.message);
    sendJson(res, 500, { error: err.message });
  }
}

// ─── HTTP Server ────────────────────────────────────────────────────────────

const httpServer = createServer((req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    });
    res.end();
    return;
  }

  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
    return;
  }

  if (req.method === 'GET' && req.url === '/api/meet/ice-servers') {
    handleIceServers(req, res);
    return;
  }

  if (req.method === 'POST' && req.url === '/api/meet/transcribe') {
    handleTranscribe(req, res);
    return;
  }

  if (req.method === 'POST' && req.url === '/api/meet/summarize') {
    handleSummarize(req, res);
    return;
  }

  res.writeHead(404);
  res.end();
});

// ─── Socket.IO ──────────────────────────────────────────────────────────────

const io = new Server(httpServer, {
  cors: { origin: '*' },
  path: '/socket.io/',
  pingInterval: 25000,
  pingTimeout: 60000,
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

  socket.on('create-room', (stableId, callback) => {
    // If only one arg provided, it might be the callback
    if (typeof stableId === 'function') {
      callback = stableId;
      stableId = socket.id;
    }

    // Guard against memory exhaustion (M-3)
    if (rooms.size >= MAX_ROOMS) {
      console.warn(`[create] rejected: server at capacity (${rooms.size} rooms)`);
      callback({ error: 'Server at capacity, try again later' });
      return;
    }

    let roomId = generateRoomId();
    while (rooms.has(roomId)) {
      roomId = generateRoomId();
    }
    rooms.set(roomId, new Set([socket.id]));
    socketToStableId.set(socket.id, stableId);
    stableIdToRoom.set(stableId, roomId);

    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.stableId = stableId;

    console.log(`[create] room=${roomId} by ${socket.id} (stableId=${stableId})`);
    callback({ roomId });
  });

  socket.on('join-room', (roomId, stableId, callback) => {
    // Handle optional stableId for backward compatibility
    if (typeof stableId === 'function') {
      callback = stableId;
      stableId = socket.id;
    }

    roomId = roomId.toUpperCase().trim();
    const room = rooms.get(roomId);

    if (!room) {
      callback({ error: 'Room not found' });
      return;
    }

    // Check if the user is reconnecting (within grace period) or joining fresh
    // If they have a stableId that was previously in this room, they are allowed in
    const isReconnecting = disconnectTimers.has(stableId) && stableIdToRoom.get(stableId) === roomId;

    if (!isReconnecting && room.size >= 2) {
      callback({ error: 'Room is full (max 2)' });
      return;
    }

    // Clear any existing disconnect timer and evict the stale socketId (C-2 + H-1 + H-2)
    if (disconnectTimers.has(stableId)) {
      clearTimeout(disconnectTimers.get(stableId));
      disconnectTimers.delete(stableId);

      // Remove the old (now-invalid) socketId entries left behind from the disconnected socket
      for (const [sid, sId] of socketToStableId) {
        if (sId === stableId && sid !== socket.id) {
          room.delete(sid);
          socketToStableId.delete(sid);
        }
      }
      console.log(`[reconnect] ${socket.id} (stableId=${stableId}) resumed room=${roomId} within grace period`);
    }

    room.add(socket.id);
    socketToStableId.set(socket.id, stableId);
    stableIdToRoom.set(stableId, roomId);
    
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.stableId = stableId;

    socket.to(roomId).emit('peer-joined', socket.id);
    console.log(`[join] room=${roomId} by ${socket.id} (stableId=${stableId}), size=${room.size}`);
    callback({ ok: true });
  });

  socket.on('signal', ({ to, data }) => {
    // C-1: Verify the target socket is in the same room as the sender.
    // Without this, any connected socket could signal any other socket.
    const senderRoomId = socket.data.roomId;
    if (!senderRoomId) return;
    const room = rooms.get(senderRoomId);
    if (!room || !room.has(to)) {
      console.warn(`[signal] blocked: ${socket.id} -> ${to} (not in same room)`);
      return;
    }
    io.to(to).emit('signal', { from: socket.id, data });
  });

  socket.on('music-sync', (payload) => {
    const { roomId } = socket.data;
    if (roomId) {
      socket.to(roomId).emit('music-sync', payload);
    }
  });

  socket.on('disconnect', () => {
    const { roomId, stableId } = socket.data;
    if (roomId && rooms.has(roomId) && stableId) {
      const room = rooms.get(roomId);
      
      // Clear any existing timer for this stableId before creating a new one (H-2)
      if (disconnectTimers.has(stableId)) {
        clearTimeout(disconnectTimers.get(stableId));
      }

      // Use a grace period (30s) before final cleanup to allow for quick reconnections
      const timerId = setTimeout(() => {
        disconnectTimers.delete(stableId);
        stableIdToRoom.delete(stableId);
        
        if (room.has(socket.id)) {
          room.delete(socket.id);
          socketToStableId.delete(socket.id);

          if (room.size === 0) {
            rooms.delete(roomId);
            console.log(`[delete] room=${roomId} (after grace)`);
          } else {
            io.to(roomId).emit('peer-left');
            console.log(`[leave] room=${roomId} by ${socket.id} (stableId=${stableId}) (after grace)`);
          }
        }
      }, 30000);

      disconnectTimers.set(stableId, timerId);
      console.log(`[disconnect-pending] ${socket.id} (stableId=${stableId}) in ${roomId}, waiting 30s grace...`);
    } else {
      console.log(`[disconnect] ${socket.id}`);
      socketToStableId.delete(socket.id);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Meet signal server running on :${PORT}`);
});
