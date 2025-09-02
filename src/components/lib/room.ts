// src/lib/rooms.ts
import { nanoid } from 'nanoid';

export type ClientId = string;
export type RoomId = string;

export type ClientInfo = {
  id: ClientId;
  name: string;
  colorIdx: number;
  ws: WebSocket; // Edge runtime WebSocket
};

export type Room = {
  id: RoomId;
  createdAt: number;
  version: number;
  content: string;
  clients: Map<ClientId, ClientInfo>;
  colorsUsed: Set<number>;
};

const MAX_CLIENTS = 6;
const rooms = new Map<RoomId, Room>();
const COLORS = ['#22d3ee', '#60a5fa', '#f472b6', '#f59e0b', '#34d399', '#fb7185']; // 6

export function createRoom(): Room {
  const id = nanoid(10);
  const room: Room = {
    id,
    createdAt: Date.now(),
    version: 0,
    content: '',
    clients: new Map(),
    colorsUsed: new Set(),
  };
  rooms.set(id, room);
  return room;
}

export function getRoom(id: string): Room | undefined {
  return rooms.get(id);
}

export function roomExistsAndHasCapacity(id: string): boolean {
  const r = rooms.get(id);
  if (!r) return false;
  return r.clients.size < MAX_CLIENTS;
}

export function pickColorIdx(room: Room): number {
  for (let i = 0; i < COLORS.length; i++) if (!room.colorsUsed.has(i)) return i;
  return 0;
}
export function colorForIdx(idx: number) { return COLORS[idx % COLORS.length]; }

export function attachClient(room: Room, ws: WebSocket, name: string): ClientInfo | null {
  if (room.clients.size >= MAX_CLIENTS) return null;
  const id = nanoid(12);
  const colorIdx = pickColorIdx(room);
  const info: ClientInfo = { id, name, colorIdx, ws };
  room.clients.set(id, info);
  room.colorsUsed.add(colorIdx);
  return info;
}

export function detachClient(room: Room, clientId: ClientId) {
  const info = room.clients.get(clientId);
  if (!info) return;
  room.clients.delete(clientId);
  room.colorsUsed.delete(info.colorIdx);
  // Optional: cleanup empty rooms after some time
}
