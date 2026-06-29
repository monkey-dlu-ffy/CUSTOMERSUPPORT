import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL;

console.log("API_URL =", API_URL);
// Singleton socket instance — shared across the entire app.
// This ensures only ONE WebSocket connection is ever created.
const socket = io(API_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

export default socket;
