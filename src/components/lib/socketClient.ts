// components/lib/socketClient.ts
import io from 'socket.io-client';

export const socket = io('http://localhost:4001', {
  autoConnect: false,
  path: '/socket.io',
  transports: ['websocket'],
  reconnection: true
});
