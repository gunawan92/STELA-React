import { io } from 'socket.io-client';

let socketInstance;

export function getSocketClient() {
  const wsUrl = import.meta.env.VITE_WS_URL;
  if (!wsUrl) return null;

  if (!socketInstance) {
    socketInstance = io(wsUrl, {
      autoConnect: false,
      reconnection: true,
      transports: ['websocket', 'polling'],
    });
  }

  return socketInstance;
}
