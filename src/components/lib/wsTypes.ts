export type ClientToServer =
  | { type: 'hello'; roomId: string; name: string }
  | { type: 'edit'; baseVersion: number; content: string }    
  | { type: 'cursor'; line: number; column: number };

export type ServerToClient =
  | { type: 'welcome'; clientId: string; version: number; content: string; peers: Peer[] }
  | { type: 'peer_joined'; peer: Peer }
  | { type: 'peer_left'; clientId: string }
  | { type: 'state'; from: string; version: number; content: string } // broadcast edit
  | { type: 'cursor'; from: string; line: number; column: number; color: string; name: string }
  | { type: 'error'; code: 'room_full' | 'no_room' | 'bad_payload' | 'version_conflict'; message: string };

export type Peer = { clientId: string; name: string; color: string };
