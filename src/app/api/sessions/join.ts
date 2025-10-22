import { NextRequest, NextResponse } from 'next/server';
import { getRedis } from '@/components/libs/redis';

const MAX_PARTICIPANTS = 6;
const ROOM_PREFIX = 'room';
const roomKey = (id: string) => `${ROOM_PREFIX}:${id}`;
const roomMembersKey = (id: string) => `${ROOM_PREFIX}:${id}:members`;

export async function GET(req: NextRequest) {
  const roomId = req.nextUrl.searchParams.get('roomId');
  if (!roomId) return NextResponse.json({ exists: false });

  const redis = await getRedis();

  const exists = await redis.exists(roomKey(roomId));
  if (!exists) return NextResponse.json({ exists: false });

  const room = await redis.hGetAll(roomKey(roomId));
  if (room.open !== '1') return NextResponse.json({ exists: false });

  const count = await redis.sCard(roomMembersKey(roomId));
  const hasCapacity = count < MAX_PARTICIPANTS;

  return NextResponse.json({ exists: hasCapacity });
}
