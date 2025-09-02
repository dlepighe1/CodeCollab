// src/app/api/exec/route.ts
import { NextResponse } from 'next/server';

const PISTON_URL = process.env.PISTON_URL || 'https://emkc.org/api/v2/piston/execute';

export async function POST(req: Request) {
  const payload = await req.json().catch(() => null);
  if (!payload) return NextResponse.json({ error: 'Bad payload' }, { status: 400 });

  const res = await fetch(PISTON_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.ok ? 200 : 500 });
}
