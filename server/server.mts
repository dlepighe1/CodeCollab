// server.mts
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createClient } from 'redis';

const PORT = process.env.SOCKET_PORT ? Number(process.env.SOCKET_PORT) : 4001;
const ROOM_TTL_SECONDS = 60 * 60 * 24; // 24h

// ---------- Redis (node-redis v4) ----------
export const redis = createClient({
  username: 'default',
  password: 'O8SQ4jm8cjK0PPZ3aXUxsVP3C1KT4iDQ',
  socket: {
    host: 'redis-18613.c84.us-east-1-2.ec2.redns.redis-cloud.com',
    port: 18613
  }
});

redis.on('error', (err) => console.error('[Redis] Error', err));
async function ensureRedis() {
  if (!redis.isOpen) await redis.connect();
}

// ---------- Keys ----------
const roomKey = (roomId: string) => `room:${roomId}`;           // hash (admin, language, createdAt)
const roomMembersKey = (roomId: string) => `room:${roomId}:m`;   // set of nicknames
const roomDocKey = (roomId: string) => `room:${roomId}:doc`;     // string content
const roomDocVerKey = (roomId: string) => `room:${roomId}:ver`;  // string version

async function roomExists(roomId: string) {
  return (await redis.exists(roomKey(roomId))) === 1;
}

async function createRoomInRedis(roomId: string, admin: string, language: string) {
  const key = roomKey(roomId);
  await redis.hSet(key, { admin, language, createdAt: Date.now().toString() });
  await redis.sAdd(roomMembersKey(roomId), admin);

  await redis.setNX(roomDocKey(roomId), `// Welcome to room ${roomId}\n`);
  await redis.setNX(roomDocVerKey(roomId), '1');

  await redis.expire(key, ROOM_TTL_SECONDS);
  await redis.expire(roomMembersKey(roomId), ROOM_TTL_SECONDS);
  await redis.expire(roomDocKey(roomId), ROOM_TTL_SECONDS);
  await redis.expire(roomDocVerKey(roomId), ROOM_TTL_SECONDS);
}

async function addMember(roomId: string, nickname: string) {
  await redis.sAdd(roomMembersKey(roomId), nickname);
  await redis.expire(roomKey(roomId), ROOM_TTL_SECONDS);
  await redis.expire(roomMembersKey(roomId), ROOM_TTL_SECONDS);
}

async function removeMember(roomId: string, nickname: string) {
  await redis.sRem(roomMembersKey(roomId), nickname);
  const count = await redis.sCard(roomMembersKey(roomId));
  if (count === 0) {
    await redis.del(roomKey(roomId));
    await redis.del(roomMembersKey(roomId));
    await redis.del(roomDocKey(roomId));
    await redis.del(roomDocVerKey(roomId));
  }
}

function generateRoomId(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

// ---- helpers for logging ----
async function getRoomState(roomId: string) {
  const hash = await redis.hGetAll(roomKey(roomId));
  const members = await redis.sMembers(roomMembersKey(roomId));
  return {
    admin: hash.admin ?? '',
    language: hash.language ?? 'javascript',
    members
  };
}

function fmtMembers(members: string[]) {
  return members.length ? members.join(', ') : '(none)';
}

const httpServer = createServer();
const io = new Server(httpServer, {
  // No Socket.IO client served and a permissive CORS (tune origin in prod)
  serveClient: false,
  cors: { origin: '*', methods: ['GET', 'POST'] },
  // Keep default path '/socket.io'
});

// ---------- Types ----------
type CreatePayload = { nickname: string; language: string; roomId?: string };
type CreateAck = { ok: true; roomId: string } | { ok: false; code: 'CREATE_FAILED'; message: string };

type JoinPayload = { roomId: string; nickname: string };
type JoinAck =
  | { ok: true; roomId: string }
  | { ok: false; code: 'ROOM_NOT_FOUND' | 'JOIN_FAILED'; message: string };

type RoomStateAck =
  | { ok: true; roomId: string; admin: string; language: string; members: string[] }
  | { ok: false; message: string };

type DocFetchAck =
  | { ok: true; content: string; version: number }
  | { ok: false; message: string };

type DocUpdatePayload = { roomId: string; content: string; clientVersion?: number; author?: string };
type DocUpdateAck =
  | { ok: true; version: number }
  | { ok: false; message: string };

// ---------- Socket handlers ----------
io.on('connection', (socket) => {
  console.log(`[socket] connected id=${socket.id} ip=${socket.handshake.address}`);

  socket.data.nickname = undefined as string | undefined;
  socket.data.roomId = undefined as string | undefined;
  socket.data.isAdmin = false as boolean;

  // broadcast helper
  async function broadcastMembers(roomId: string) {
    try {
      const state = await getRoomState(roomId);
      io.to(roomId).emit('room:members', {
        roomId,
        admin: state.admin,
        language: state.language,
        members: state.members
      });
    } catch (e) {
      console.error('broadcastMembers error', e);
    }
  }

  // Create (optionally with fixed roomId)
  socket.on('room:create', async (payload: CreatePayload, ack?: (a: CreateAck) => void) => {
    try {
      await ensureRedis();

      const nickname = payload?.nickname?.trim();
      const language = (payload?.language || 'javascript').trim();
      let roomId = (payload?.roomId || '').trim().toUpperCase();

      if (!nickname) return ack?.({ ok: false, code: 'CREATE_FAILED', message: 'Missing nickname' });

      if (!roomId) roomId = generateRoomId();
      if (await roomExists(roomId)) {
        // If caller asked for a fixed ID that exists, generate another
        roomId = generateRoomId();
      }

      await createRoomInRedis(roomId, nickname, language);

      socket.join(roomId);
      socket.data.nickname = nickname;
      socket.data.roomId = roomId;
      socket.data.isAdmin = true;

      const state = await getRoomState(roomId);
      console.log(`[create] ${nickname} created room=${roomId} lang=${language} | admin=${state.admin} | members=[${fmtMembers(state.members)}]`);

      await broadcastMembers(roomId);
      ack?.({ ok: true, roomId });
    } catch (err) {
      console.error('room:create error', err);
      ack?.({ ok: false, code: 'CREATE_FAILED', message: 'Could not create room' });
    }
  });

  // Join
  socket.on('room:join', async (payload: JoinPayload, ack?: (a: JoinAck) => void) => {
    try {
      await ensureRedis();

      const nickname = payload?.nickname?.trim();
      const roomId = payload?.roomId?.trim().toUpperCase();
      if (!nickname || !roomId) return ack?.({ ok: false, code: 'JOIN_FAILED', message: 'Missing nickname or roomId' });

      const exists = await roomExists(roomId);
      if (!exists) {
        console.log(`[join] ${nickname} attempted to join non-existent room=${roomId}`);
        return ack?.({ ok: false, code: 'ROOM_NOT_FOUND', message: 'Invite code not found' });
      }

      await addMember(roomId, nickname);

      socket.join(roomId);
      socket.data.nickname = nickname;
      socket.data.roomId = roomId;
      socket.data.isAdmin = false;

      const state = await getRoomState(roomId);
      console.log(`[join] ${nickname} joined room=${roomId} | admin=${state.admin} | members=[${fmtMembers(state.members)}]`);

      ack?.({ ok: true, roomId });

      // Include socket.id so clients can uniquely identify joiners
      socket.to(roomId).emit('room:user-joined', { id: socket.id, nickname });

      // Full snapshot for everyone (keeps UIs in sync)
      await broadcastMembers(roomId);
    } catch (err) {
      console.error('room:join error', err);
      ack?.({ ok: false, code: 'JOIN_FAILED', message: 'Could not join room' });
    }
  });

  // Room state (utility)
  socket.on('room:state', async (roomId: string, ack?: (a: RoomStateAck) => void) => {
    try {
      await ensureRedis();
      const exists = await roomExists(roomId);
      if (!exists) return ack?.({ ok: false, message: 'Room not found' });

      const state = await getRoomState(roomId);
      ack?.({ ok: true, roomId, admin: state.admin, language: state.language, members: state.members });
    } catch (err) {
      console.error('room:state error', err);
      ack?.({ ok: false, message: 'Unable to fetch room state' });
    }
  });

  // Doc fetch
  socket.on('doc:fetch', async (roomId: string, ack?: (a: DocFetchAck) => void) => {
    try {
      await ensureRedis();
      const [content, ver] = await redis.mGet([roomDocKey(roomId), roomDocVerKey(roomId)]);
      if (!content) return ack?.({ ok: false, message: 'No content' });
      ack?.({ ok: true, content, version: Number(ver || '1') });
    } catch (err) {
      console.error('doc:fetch error', err);
      ack?.({ ok: false, message: 'Unable to fetch document' });
    }
  });

  // Doc update
  socket.on('doc:update', async (payload: DocUpdatePayload, ack?: (a: DocUpdateAck) => void) => {
    try {
      await ensureRedis();
      const { roomId, content, author } = payload;
      if (!roomId || typeof content !== 'string') return ack?.({ ok: false, message: 'Bad payload' });

      const newVer = await redis.incr(roomDocVerKey(roomId));
      await redis.set(roomDocKey(roomId), content);
      await redis.expire(roomDocKey(roomId), ROOM_TTL_SECONDS);
      await redis.expire(roomDocVerKey(roomId), ROOM_TTL_SECONDS);

      socket.to(roomId).emit('doc:apply', { content, version: newVer, author: author || socket.data.nickname });
      ack?.({ ok: true, version: newVer });
    } catch (err) {
      console.error('doc:update error', err);
      ack?.({ ok: false, message: 'Unable to update document' });
    }
  });

  // Disconnect / cleanup
  socket.on('disconnect', async () => {
    const { roomId, nickname } = socket.data as { roomId?: string; nickname?: string };
    console.log(`[socket] disconnected id=${socket.id} nick=${nickname ?? '(unknown)'} room=${roomId ?? '(none)'}`);

    if (roomId && nickname) {
      try {
        await ensureRedis();
        await removeMember(roomId, nickname);

        socket.to(roomId).emit('room:user-left', { id: socket.id, nickname });

        const state = await getRoomState(roomId).catch(() => null);
        if (state) {
          console.log(`[leave] ${nickname} left room=${roomId} | admin=${state.admin} | members=[${fmtMembers(state.members)}]`);
          await io.to(roomId).emit('room:members', {
            roomId,
            admin: state.admin,
            language: state.language,
            members: state.members
          });
        } else {
          console.log(`[leave] room=${roomId} has been deleted (no members left).`);
        }
      } catch (err) {
        console.error('cleanup error', err);
      }
    }
  });
});

httpServer.listen(PORT, async () => {
  await ensureRedis();
  console.log(`> Server is listening on: http://localhost:${PORT}`);
});
