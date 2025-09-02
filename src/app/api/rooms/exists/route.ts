import { NextResponse } from 'next/server';
import { roomExistsAndHasCapacity, getRoom } from '../../../../components/lib/room';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const roomId = (searchParams.get('roomId') || '').trim();
  if (!roomId) return NextResponse.json({ exists: false }, { status: 400 });

  const exists = roomExistsAndHasCapacity(roomId);
  const count = getRoom(roomId)?.clients.size ?? 0;
  return NextResponse.json({ exists, count });
}