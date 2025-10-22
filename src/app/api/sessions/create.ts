import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getRedis } from '@/components/libs/redis';

const ROOM_PREFIX = 'room';
const roomKey = (id: string) => `${ROOM_PREFIX}:${id}`;

export async function POST() {
  const redis = await getRedis();
  const id = nanoid(10);

  await redis.hSet(roomKey(id), {
    open: '1',
    createdAt: Date.now().toString()
    // admin is assigned on first socket join
  });

  return NextResponse.json({ id });
}
