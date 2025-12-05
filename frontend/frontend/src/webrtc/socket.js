import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const socket = io(SOCKET_URL, {
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
});

let isConnected = false;

export const connectSocket = () => {
    if (!isConnected) {
        socket.connect();
        isConnected = true;
    }
    return socket;
};

export const disconnectSocket = () => {
    if (isConnected) {
        socket.disconnect();
        isConnected = false;
    }
};

socket.on('connect', () => {
    console.log('✅ Socket connected:', socket.id);
    isConnected = true;
});

socket.on('disconnect', (reason) => {
    console.log('❌ Socket disconnected:', reason);
    isConnected = false;
});

socket.on('connect_error', (error) => {
    console.error('Socket error:', error.message);
});

export const getSocketId = () => socket.id;
export const isSocketConnected = () => isConnected;

export default socket;
