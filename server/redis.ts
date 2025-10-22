// server/redis.ts
import { createClient } from 'redis';

// ⚠️ You asked to hard-code for now. Do NOT import this in client code.
export const redis = createClient({
  username: 'default',
  password: 'O8SQ4jm8cjK0PPZ3aXUxsVP3C1KT4iDQ',
  socket: {
    host: 'redis-18613.c84.us-east-1-2.ec2.redns.redis-cloud.com',
    port: 18613
  }
});

redis.on('error', (err) => console.error('[Redis] Error', err));

export async function ensureRedis() {
  if (!redis.isOpen) {
    await redis.connect();
  }
}
