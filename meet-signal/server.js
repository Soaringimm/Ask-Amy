import { createServer } from 'http';
import { Server } from 'socket.io';
import { GoogleGenerativeAI } from '@google/generative-ai';

const PORT = 3100;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const rooms = new Map(); // roomId -> Set<socketId>

// Gemini clients
let genAI = null;
if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
}

// Helper: collect request body as Buffer
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

// Helper: parse multipart/form-data to extract file and fields
function parseMultipart(buf, contentType) {
  const boundaryMatch = contentType.match(/boundary=([^\s;]+)/);
  if (!boundaryMatch) throw new Error('No boundary found');
  const boundary = '--' + boundaryMatch[1];
  const parts = [];
  const str = buf.toString('binary');
  const segments = str.split(boundary).slice(1); // skip preamble
  for (const seg of segments) {
    if (seg.startsWith('--')) break; // end boundary
    const headerEnd = seg.indexOf('\r\n\r\n');
    if (headerEnd === -1) continue;
    const headers = seg.substring(0, headerEnd);
    const body = seg.substring(headerEnd + 4, seg.length - 2); // strip trailing \r\n
    const nameMatch = headers.match(/name="([^"]+)"/);
    const filenameMatch = headers.match(/filename="([^"]+)"/);
    const ctMatch = headers.match(/Content-Type:\s*([^\r\n]+)/i);
    if (nameMatch) {
      parts.push({
        name: nameMatch[1],
        filename: filenameMatch?.[1],
        contentType: ctMatch?.[1],
        data: filenameMatch ? Buffer.from(body, 'binary') : body,
      });
    }
  }
  return parts;
}

// Helper: send JSON response
function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(data));
}

// Retry wrapper for Gemini API calls (handles 429)
async function callWithRetry(fn, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const is429 = err.message?.includes('429') || err.message?.includes('Resource exhausted');
      if (is429 && attempt < maxRetries) {
        const delay = (attempt + 1) * 5000; // 5s, 10s
        console.log(`[retry] 429 hit, waiting ${delay / 1000}s before retry ${attempt + 1}/${maxRetries}`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
}

// POST /api/meet/transcribe — receive audio, return transcript
async function handleTranscribe(req, res) {
  if (!genAI) return sendJson(res, 500, { error: 'GEMINI_API_KEY not configured' });

  try {
    const body = await collectBody(req);
    const ct = req.headers['content-type'] || '';

    let audioData, mimeType;
    if (ct.includes('multipart/form-data')) {
      const parts = parseMultipart(body, ct);
      const filePart = parts.find(p => p.filename);
      if (!filePart) return sendJson(res, 400, { error: 'No audio file in request' });
      audioData = filePart.data;
      mimeType = filePart.contentType || 'audio/webm';
    } else {
      audioData = body;
      mimeType = ct || 'audio/webm';
    }

    console.log(`[transcribe] audio size=${audioData.length}, mime=${mimeType}`);

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
  if (!genAI) return sendJson(res, 500, { error: 'GEMINI_API_KEY not configured' });

  try {
    const body = await collectBody(req);
    const { transcript, topic } = JSON.parse(body.toString());

    if (!transcript) return sendJson(res, 400, { error: 'transcript is required' });

    console.log(`[summarize] transcript length=${transcript.length}, topic=${topic || '(none)'}`);

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
    // Extract JSON from response (handle markdown code blocks)
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

const httpServer = createServer((req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
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
