export const runtime = 'edge';

import { getRoom, attachClient, detachClient, colorForIdx } from '@/components/lib/room';
import type { ClientToServer, ServerToClient, Peer } from '@/components/lib/wsTypes';

type ServerWebSocket = WebSocket & { accept(): void }; // <- add accept()

// helper: TS doesn't know about ResponseInit.webSocket
const upgrade = (ws: any) => new Response(null, { status: 101, webSocket: ws } as any);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const roomId = (searchParams.get('roomId') ?? '').trim();
  const name = (searchParams.get('name') ?? '').trim() || 'Guest';

  const pair = new (globalThis as any).WebSocketPair();
  const client = pair[0] as WebSocket;
  const server = pair[1] as ServerWebSocket;

  server.accept(); // ✅ no TS error now

  const send = (msg: ServerToClient) => server.send(JSON.stringify(msg));

  const room = getRoom(roomId);
  if (!room) {
    send({ type: 'error', code: 'no_room', message: 'Room not found.' });
    server.close();
    return upgrade(client);
  }

  const me = attachClient(room, server, name);
  if (!me) {
    send({ type: 'error', code: 'room_full', message: 'Room is full.' });
    server.close();
    return upgrade(client);
  }

  const mePeer: Peer = { clientId: me.id, name: me.name, color: colorForIdx(me.colorIdx) };

  const peers: Peer[] = [...room.clients.values()]
    .filter((c) => c.id !== me.id)
    .map((c) => ({ clientId: c.id, name: c.name, color: colorForIdx(c.colorIdx) }));

  send({ type: 'welcome', clientId: me.id, version: room.version, content: room.content, peers });

  room.clients.forEach((c) => {
    if (c.id !== me.id) c.ws.send(JSON.stringify({ type: 'peer_joined', peer: mePeer } as ServerToClient));
  });

  server.addEventListener('message', (ev: MessageEvent) => {
    try {
      const msg = JSON.parse(ev.data as string) as ClientToServer;
      if (msg.type === 'edit') {
        if (msg.baseVersion !== room.version) {
          send({ type: 'error', code: 'version_conflict', message: 'Version mismatch.' });
          send({ type: 'state', from: 'server', version: room.version, content: room.content });
          return;
        }
        room.version += 1;
        room.content = msg.content;
        room.clients.forEach((c) => {
          if (c.id === me.id) return;
          c.ws.send(JSON.stringify({ type: 'state', from: me.id, version: room.version, content: room.content } as ServerToClient));
        });
      } else if (msg.type === 'cursor') {
        room.clients.forEach((c) => {
          if (c.id === me.id) return;
          c.ws.send(JSON.stringify({
            type: 'cursor',
            from: me.id,
            line: msg.line,
            column: msg.column,
            color: mePeer.color,
            name: mePeer.name,
          } as ServerToClient));
        });
      }
    } catch {
      send({ type: 'error', code: 'bad_payload', message: 'Invalid message.' });
    }
  });

  server.addEventListener('close', () => {
    room.clients.forEach((c) => {
      if (c.id !== me.id) c.ws.send(JSON.stringify({ type: 'peer_left', clientId: me.id } as ServerToClient));
    });
    detachClient(room, me.id);
  });

  return upgrade(client);
}