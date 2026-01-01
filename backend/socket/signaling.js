/**
 * WebRTC Signaling Server
 */

const rooms = new Map();
const socketToUser = new Map();
const pendingRequests = new Map();
const roomHosts = new Map();
const admittedUsers = new Map(); // roomId -> Set of admitted odIds

function initializeSignaling(io) {
    io.on('connection', (socket) => {
        console.log('✅ User connected:', socket.id);

        // HOST joins room
        socket.on('host-join-room', ({ roomId, odId, userName }) => {
            // Check if user is already in this room
            if (isUserInRoom(roomId, odId)) {
                socket.emit('join-rejected', { reason: 'You are already in this meeting' });
                return;
            }

            console.log(`👑 HOST ${userName} creating room: ${roomId}`);

            socket.join(roomId);

            const userInfo = { odId, userName, socketId: socket.id, isHost: true };

            if (!rooms.has(roomId)) {
                const roomUsers = new Map();
                // Default permissions
                roomUsers.permissions = { mic: true, camera: true, screen: true };
                roomUsers.messages = []; // Chat history
                rooms.set(roomId, roomUsers);
            }
            const room = rooms.get(roomId);
            room.set(socket.id, userInfo);
            socketToUser.set(socket.id, { roomId, odId, userName, isHost: true });
            roomHosts.set(roomId, socket.id);

            socket.emit('room-joined', { isHost: true, participants: [], permissions: room.permissions, messages: room.messages });
        });

        // GUEST requests to join
        socket.on('request-join', ({ roomId, odId, userName }) => {
            console.log(`🚪 ${userName} requesting to join: ${roomId}`);

            // Check if meeting exists
            if (!rooms.has(roomId) || rooms.get(roomId).size === 0) {
                socket.emit('join-rejected', { reason: 'Meeting not started yet' });
                return;
            }

            // Check if user is already in this room
            if (isUserInRoom(roomId, odId)) {
                socket.emit('join-rejected', { reason: 'You are already in this meeting' });
                return;
            }

            // Check if user already has a pending request
            if (isUserPending(roomId, odId)) {
                socket.emit('waiting-for-approval', { message: 'Your request is already pending' });
                return;
            }

            const hostSocketId = roomHosts.get(roomId);
            if (!hostSocketId || !io.sockets.sockets.get(hostSocketId)) {
                socket.emit('join-rejected', { reason: 'Host is not available' });
                return;
            }

            if (!pendingRequests.has(roomId)) {
                pendingRequests.set(roomId, new Map());
            }
            pendingRequests.get(roomId).set(socket.id, { odId, userName, socketId: socket.id });
            socketToUser.set(socket.id, { roomId, odId, userName, isHost: false, pending: true });

            // AUTO-ADMIT if user was previously admitted
            if (admittedUsers.has(roomId) && admittedUsers.get(roomId).has(odId)) {
                console.log(`✨ Auto-admitting previously joined user: ${userName}`);
                handleApproveJoin(socket.id, roomId, true); // true for autoAdmit
                return;
            }

            io.to(hostSocketId).emit('join-request', { odId, userName, socketId: socket.id });
            socket.emit('waiting-for-approval', { message: 'Waiting for host...' });
        });

        // Host approves guest
        socket.on('approve-join', ({ targetSocketId, roomId }) => {
            const userInfo = socketToUser.get(socket.id);
            if (!userInfo || !userInfo.isHost) return;
            handleApproveJoin(targetSocketId, roomId);
        });

        function handleApproveJoin(targetSocketId, roomId, autoAdmit = false) {

            if (!pendingRequests.has(roomId)) return;
            const request = pendingRequests.get(roomId).get(targetSocketId);
            if (!request) return;

            // Check if user already joined from another tab
            if (isUserInRoom(roomId, request.odId)) {
                pendingRequests.get(roomId).delete(targetSocketId);
                io.to(targetSocketId).emit('join-rejected', { reason: 'You are already in this meeting from another tab' });
                return;
            }

            pendingRequests.get(roomId).delete(targetSocketId);

            // Record admission for auto-join
            if (!admittedUsers.has(roomId)) {
                admittedUsers.set(roomId, new Set());
            }
            admittedUsers.get(roomId).add(request.odId);

            const joiner = { odId: request.odId, userName: request.userName, socketId: targetSocketId, isHost: false };
            rooms.get(roomId).set(targetSocketId, joiner);
            socketToUser.set(targetSocketId, { roomId, odId: request.odId, userName: request.userName, isHost: false, pending: false });

            const targetSocket = io.sockets.sockets.get(targetSocketId);
            if (targetSocket) {
                targetSocket.join(roomId);

                // Get existing participants
                const participants = [];
                rooms.get(roomId).forEach((p, pId) => {
                    if (pId !== targetSocketId) {
                        participants.push({
                            socketId: p.socketId,
                            odId: p.odId,
                            userName: p.userName,
                            isHost: p.isHost,
                            isScreenSharing: p.isScreenSharing // Include screen share status
                        });
                    }
                });

                io.to(targetSocketId).emit('join-approved', {
                    roomId,
                    participants,
                    permissions: rooms.get(roomId).permissions,
                    messages: rooms.get(roomId).messages // Send history
                });

                targetSocket.to(roomId).emit('user-joined', {
                    socketId: targetSocketId,
                    odId: request.odId,
                    userName: request.userName
                });

                console.log(`✅ ${request.userName} joined. Users: ${rooms.get(roomId).size}`);
            }
        }

        // Host rejects guest
        socket.on('reject-join', ({ targetSocketId, roomId }) => {
            const userInfo = socketToUser.get(socket.id);
            if (!userInfo || !userInfo.isHost) return;

            if (pendingRequests.has(roomId)) {
                pendingRequests.get(roomId).delete(targetSocketId);
            }
            socketToUser.delete(targetSocketId);
            io.to(targetSocketId).emit('join-rejected', { reason: 'Host denied your request' });
        });

        // WebRTC signaling
        socket.on('offer', ({ targetSocketId, offer, senderName }) => {
            io.to(targetSocketId).emit('offer', {
                offer,
                senderSocketId: socket.id,
                senderName: senderName || 'User'
            });
        });

        socket.on('answer', ({ targetSocketId, answer }) => {
            io.to(targetSocketId).emit('answer', {
                answer,
                senderSocketId: socket.id
            });
        });

        socket.on('ice-candidate', ({ targetSocketId, candidate }) => {
            io.to(targetSocketId).emit('ice-candidate', {
                candidate,
                senderSocketId: socket.id
            });
        });

        // Chat
        // Chat
        socket.on('chat-message', ({ roomId, message, sender, timestamp }) => {
            if (!message || typeof message !== 'string' || !message.trim()) return;
            if (message.length > 500) return; // Max length

            // Basic rate limiting (could be enhanced)
            const lastMsgTime = socketToUser.get(socket.id)?.lastMsgTime || 0;
            if (Date.now() - lastMsgTime < 500) return; // 500ms debounce

            const userInfo = socketToUser.get(socket.id);
            if (userInfo) userInfo.lastMsgTime = Date.now();

            const msgData = {
                id: socket.id + '-' + Date.now(),
                message: message.trim(),
                sender,
                senderId: socket.id,
                timestamp: timestamp || new Date().toISOString()
            };

            // Store in history
            if (rooms.has(roomId)) {
                const room = rooms.get(roomId);
                if (!room.messages) room.messages = [];
                room.messages.push(msgData);
                if (room.messages.length > 50) room.messages.shift(); // Keep last 50
            }

            io.to(roomId).emit('chat-message', msgData);
        });

        // Media state
        socket.on('media-state-change', ({ roomId, isAudioEnabled, isVideoEnabled }) => {
            socket.to(roomId).emit('user-media-state-changed', {
                socketId: socket.id,
                isAudioEnabled,
                isVideoEnabled
            });
        });

        // Screen share
        socket.on('screen-share-started', ({ roomId }) => {
            const u = socketToUser.get(socket.id);
            if (u) {
                // Update room state
                if (rooms.has(roomId) && rooms.get(roomId).has(socket.id)) {
                    rooms.get(roomId).get(socket.id).isScreenSharing = true;
                }
                socket.to(roomId).emit('user-screen-sharing', { socketId: socket.id, userName: u.userName, isSharing: true });
            }
        });

        socket.on('screen-share-stopped', ({ roomId }) => {
            const u = socketToUser.get(socket.id);
            if (u) {
                // Update room state
                if (rooms.has(roomId) && rooms.get(roomId).has(socket.id)) {
                    rooms.get(roomId).get(socket.id).isScreenSharing = false;
                }
                socket.to(roomId).emit('user-screen-sharing', { socketId: socket.id, isSharing: false });
            }
        });

        // Leave room
        socket.on('leave-room', ({ roomId }) => {
            leaveRoom(socket, roomId, io);
        });

        // Permissions
        socket.on('update-permissions', ({ roomId, permissions }) => {
            const userInfo = socketToUser.get(socket.id);
            if (!userInfo || !userInfo.isHost) {
                // Security check: only host can update permissions
                return;
            }

            if (rooms.has(roomId)) {
                // Store permissions in room metadata
                // We'll attach it to the room object. Note: rooms is Map<roomId, Map<socketId, user>>
                // We need a separate store for room metadata or attach it to the Map itself
                // For simplicity, we'll use a separate Map for room metadata if not exists, or just attach to the Map object
                const room = rooms.get(roomId);
                room.permissions = permissions;

                // Broadcast to all in room including sender (to confirm state)
                io.to(roomId).emit('permissions-updated', permissions);
            }
        });

        // Disconnect
        socket.on('disconnect', () => {
            console.log('❌ User disconnected:', socket.id);
            const u = socketToUser.get(socket.id);
            if (u && u.roomId) {
                leaveRoom(socket, u.roomId, io);
            }
            pendingRequests.forEach((requests) => requests.delete(socket.id));
        });
    });

    // Helper: Check if user is already in room by odId
    function isUserInRoom(roomId, odId) {
        if (!rooms.has(roomId)) return false;
        let found = false;
        rooms.get(roomId).forEach((user) => {
            if (user.odId === odId) found = true;
        });
        return found;
    }

    // Helper: Check if user has pending request by odId
    function isUserPending(roomId, odId) {
        if (!pendingRequests.has(roomId)) return false;
        let found = false;
        pendingRequests.get(roomId).forEach((request) => {
            if (request.odId === odId) found = true;
        });
        return found;
    }

    function leaveRoom(socket, roomId, io) {
        const u = socketToUser.get(socket.id);
        if (!u) return;

        if (rooms.has(roomId)) {
            rooms.get(roomId).delete(socket.id);

            if (u.isHost) {
                socket.to(roomId).emit('host-left', { message: 'Host ended the meeting' });
                roomHosts.delete(roomId);
            }

            console.log(`👋 ${u.userName} left room ${roomId}`);
            socket.to(roomId).emit('user-left', {
                socketId: socket.id,
                odId: u.odId,
                userName: u.userName
            });

            if (rooms.get(roomId).size === 0) {
                rooms.delete(roomId);
                pendingRequests.delete(roomId);
                roomHosts.delete(roomId);
                admittedUsers.delete(roomId);
            }
        }

        socket.leave(roomId);
        socketToUser.delete(socket.id);
    }
}

module.exports = { initializeSignaling };
