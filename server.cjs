// server.cjs
const { createServer } = require('http');
const { Server } = require('socket.io');
const Redis = require('ioredis');

/* ----------------------------- Config ----------------------------- */
const PORT = process.env.SOCKET_PORT ? Number(process.env.SOCKET_PORT) : 4001;
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const ROOM_TTL_SECONDS = 60 * 60 * 24; // 24h

/* ------------------------------ Redis ------------------------------ */
const redis = new Redis(REDIS_URL);

// Keys
const roomKey = (roomId) => `room:${roomId}`;          // hash (admin, language, createdAt)
const roomMembersKey = (roomId) => `room:${roomId}:m`;  // set of member nicknames
const roomDocKey = (roomId) => `room:${roomId}:doc`;    // string content
const roomDocVerKey = (roomId) => `room:${roomId}:ver`; // string version

async function roomExists(roomId) {
  return (await redis.exists(roomKey(roomId))) === 1;
}

async function createRoomInRedis(roomId, admin, language) {
  const key = roomKey(roomId);
  await redis.hset(key, { admin, language, createdAt: Date.now().toString() });
  await redis.sadd(roomMembersKey(roomId), admin);

  // init doc if not exists
  await redis.setnx(roomDocKey(roomId), `// Welcome to room ${roomId}\n`);
  await redis.setnx(roomDocVerKey(roomId), '1');

  // TTLs
  await redis.expire(key, ROOM_TTL_SECONDS);
  await redis.expire(roomMembersKey(roomId), ROOM_TTL_SECONDS);
  await redis.expire(roomDocKey(roomId), ROOM_TTL_SECONDS);
  await redis.expire(roomDocVerKey(roomId), ROOM_TTL_SECONDS);
}

async function addMember(roomId, nickname) {
  await redis.sadd(roomMembersKey(roomId), nickname);
  await redis.expire(roomKey(roomId), ROOM_TTL_SECONDS);
  await redis.expire(roomMembersKey(roomId), ROOM_TTL_SECONDS);
}

async function removeMember(roomId, nickname) {
  await redis.srem(roomMembersKey(roomId), nickname);
  const count = await redis.scard(roomMembersKey(roomId));
  if (count === 0) {
    await redis.del(roomKey(roomId));
    await redis.del(roomMembersKey(roomId));
    await redis.del(roomDocKey(roomId));
    await redis.del(roomDocVerKey(roomId));
  }
}

/* --------------------------- ID Generator -------------------------- */
function generateRoomId() {
  return Math.random().toString(36).slice(2, 10).toUpperCase(); // 8 chars
}

/* --------------------------- Socket server ------------------------- */
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

io.on('connection', (socket) => {
  socket.data.nickname = undefined;
  socket.data.roomId = undefined;
  socket.data.isAdmin = false;

  // ---- Create room ----
  socket.on('room:create', async (payload, ack) => {
    try {
      const nickname = (payload?.nickname || '').trim();
      const language = payload?.language || 'javascript';
      if (!nickname) {
        ack && ack({ ok: false, code: 'CREATE_FAILED', message: 'Missing nickname' });
        return;
      }

      const roomId = generateRoomId();
      await createRoomInRedis(roomId, nickname, language);

      socket.join(roomId);
      socket.data.nickname = nickname;
      socket.data.roomId = roomId;
      socket.data.isAdmin = true;

      ack && ack({ ok: true, roomId });
    } catch (err) {
      console.error('room:create error', err);
      ack && ack({ ok: false, code: 'CREATE_FAILED', message: 'Could not create room' });
    }
  });

  // ---- Join room ----
  socket.on('room:join', async (payload, ack) => {
    try {
      const nickname = (payload?.nickname || '').trim();
      const roomId = (payload?.roomId || '').trim().toUpperCase();
      if (!nickname || !roomId) {
        ack && ack({ ok: false, code: 'JOIN_FAILED', message: 'Missing nickname or roomId' });
        return;
      }

      const exists = await roomExists(roomId);
      if (!exists) {
        ack && ack({ ok: false, code: 'ROOM_NOT_FOUND', message: 'Invite code not found' });
        return;
      }

      await addMember(roomId, nickname);
      socket.join(roomId);
      socket.data.nickname = nickname;
      socket.data.roomId = roomId;
      socket.data.isAdmin = false;

      ack && ack({ ok: true, roomId });
      socket.to(roomId).emit('room:user-joined', { nickname });
    } catch (err) {
      console.error('room:join error', err);
      ack && ack({ ok: false, code: 'JOIN_FAILED', message: 'Could not join room' });
    }
  });

  // ---- Room state ----
  socket.on('room:state', async (roomId, ack) => {
    try {
      const exists = await roomExists(roomId);
      if (!exists) {
        ack && ack({ ok: false, message: 'Room not found' });
        return;
      }
      const [admin, language] = await redis.hmget(roomKey(roomId), 'admin', 'language');
      const members = await redis.smembers(roomMembersKey(roomId));
      ack && ack({ ok: true, roomId, admin: admin || '', language: language || 'javascript', members });
    } catch (err) {
      console.error('room:state error', err);
      ack && ack({ ok: false, message: 'Unable to fetch room state' });
    }
  });

  // ---- Document fetch ----
  socket.on('doc:fetch', async (roomId, ack) => {
    try {
      const [content, ver] = await redis.mget(roomDocKey(roomId), roomDocVerKey(roomId));
      if (!content) {
        ack && ack({ ok: false, message: 'No content' });
        return;
      }
      ack && ack({ ok: true, content, version: Number(ver || '1') });
    } catch (err) {
      console.error('doc:fetch error', err);
      ack && ack({ ok: false, message: 'Unable to fetch document' });
    }
  });

  // ---- Document update (last-writer-wins) ----
  socket.on('doc:update', async (payload, ack) => {
    try {
      const { roomId, content, author } = payload || {};
      if (!roomId || typeof content !== 'string') {
        ack && ack({ ok: false, message: 'Bad payload' });
        return;
      }

      const newVer = await redis.incr(roomDocVerKey(roomId));
      await redis.set(roomDocKey(roomId), content);
      await redis.expire(roomDocKey(roomId), ROOM_TTL_SECONDS);
      await redis.expire(roomDocVerKey(roomId), ROOM_TTL_SECONDS);

      socket.to(roomId).emit('doc:apply', {
        content,
        version: newVer,
        author: author || socket.data.nickname,
      });

      ack && ack({ ok: true, version: newVer });
    } catch (err) {
      console.error('doc:update error', err);
      ack && ack({ ok: false, message: 'Unable to update document' });
    }
  });

  // ---- Disconnect cleanup ----
  socket.on('disconnect', async () => {
    const { roomId, nickname } = socket.data;
    if (roomId && nickname) {
      try {
        await removeMember(roomId, nickname);
        socket.to(roomId).emit('room:user-left', { nickname });
      } catch (err) {
        console.error('cleanup error', err);
      }
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Socket.IO server on :${PORT}`);
});
