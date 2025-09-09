import { NextResponse } from 'next/server';
import { createRoom } from '@/components/lib/room';
export async function POST() {
  const room = createRoom();
  return NextResponse.json({ id: room.id });
}
