import { useState, useEffect, useCallback, useRef } from 'react';
import { socket, connectSocket, disconnectSocket } from './socket';
import {
    createPeerConnection, createAndSendOffer, handleOffer, handleAnswer,
    handleIceCandidate, closePeerConnection, closeAllPeerConnections,
    replaceTrackInAllPeers, setCallbacks,
} from './peers';

const useWebRTC = (roomId, userName, odId) => {
    const [localStream, setLocalStream] = useState(null);
    const [screenStream, setScreenStream] = useState(null);
    const [participants, setParticipants] = useState(new Map());
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [connectionError, setConnectionError] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [waitingForApproval, setWaitingForApproval] = useState(false);
    const [wasRejected, setWasRejected] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [permissions, setPermissions] = useState({ mic: true, camera: true, screen: true });
    const [chatHistory, setChatHistory] = useState([]);

    const localStreamRef = useRef(null);
    const screenStreamRef = useRef(null);
    const isJoinedRef = useRef(false);
    const isHostRef = useRef(false);

    useEffect(() => { window.__userName = userName; }, [userName]);

    // Get mic and camera
    const getLocalStream = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: {
                    echoCancellation: true, // Standard
                    noiseSuppression: true,
                    autoGainControl: true,
                    googEchoCancellation: true,
                    googAutoGainControl: true,
                    googNoiseSuppression: true,
                    googHighpassFilter: true,
                    sampleRate: 48000,
                    channelCount: 1,
                    latency: 0.01,
                    suppressLocalAudioPlayback: true,
                },
            });
            localStreamRef.current = stream;
            setLocalStream(stream);
            setIsAudioEnabled(true);
            setIsVideoEnabled(true);
            return stream;
        } catch (error) {
            localStreamRef.current = null;
            setIsAudioEnabled(false);
            setIsVideoEnabled(false);
            return null;
        }
    }, []);

    const addParticipant = useCallback((socketId, data) => {
        setParticipants(prev => {
            const newMap = new Map(prev);
            newMap.set(socketId, { ...newMap.get(socketId), ...data, socketId });
            return newMap;
        });
    }, []);

    const removeParticipant = useCallback((socketId) => {
        closePeerConnection(socketId);
        setParticipants(prev => {
            if (!prev.has(socketId)) return prev;
            const newMap = new Map(prev);
            newMap.delete(socketId);
            return newMap;
        });
    }, []);

    const handleRemoteStream = useCallback((socketId, stream) => {
        addParticipant(socketId, { stream, connectionState: 'connected' });
    }, [addParticipant]);

    const handleConnectionStateChange = useCallback((socketId, state) => {
        if (state === 'closed' || state === 'failed' || state === 'disconnected') {
            removeParticipant(socketId);
            return;
        }
        setParticipants(prev => {
            if (!prev.has(socketId)) return prev;
            return new Map(prev).set(socketId, { ...prev.get(socketId), connectionState: state });
        });
    }, [removeParticipant]);

    const joinRoom = useCallback(async (isHost) => {
        if (isJoinedRef.current) return;
        isJoinedRef.current = true;
        isHostRef.current = !!isHost;

        await getLocalStream();

        setCallbacks({
            onRemoteStream: handleRemoteStream,
            onRemoteStreamRemoved: (id) => addParticipant(id, { stream: null }),
            onConnectionStateChange: handleConnectionStateChange,
        });

        connectSocket();

        const emitJoin = () => {
            if (isHost) {
                socket.emit('host-join-room', { roomId, odId, userName });
            } else {
                socket.emit('request-join', { roomId, odId, userName });
                setWaitingForApproval(true);
            }
        };

        socket.connected ? emitJoin() : socket.once('connect', emitJoin);
    }, [roomId, userName, odId, getLocalStream, handleRemoteStream, handleConnectionStateChange, addParticipant]);

    const leaveRoom = useCallback(() => {
        localStreamRef.current?.getTracks().forEach(t => t.stop());
        screenStreamRef.current?.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
        screenStreamRef.current = null;
        setLocalStream(null);
        setScreenStream(null);
        setIsScreenSharing(false);
        closeAllPeerConnections();
        socket.emit('leave-room', { roomId });
        disconnectSocket();
        setParticipants(new Map());
        setIsConnected(false);
        setWaitingForApproval(false);
        isJoinedRef.current = false;
        isHostRef.current = false;
    }, [roomId]);

    const toggleAudio = useCallback(() => {
        const track = localStreamRef.current?.getAudioTracks()[0];
        if (track) {
            track.enabled = !track.enabled;
            setIsAudioEnabled(track.enabled);
            socket.emit('media-state-change', { roomId, isAudioEnabled: track.enabled, isVideoEnabled });
        }
    }, [roomId, isVideoEnabled]);

    const toggleVideo = useCallback(() => {
        const track = localStreamRef.current?.getVideoTracks()[0];
        if (track) {
            track.enabled = !track.enabled;
            setIsVideoEnabled(track.enabled);
            socket.emit('media-state-change', { roomId, isAudioEnabled, isVideoEnabled: track.enabled });
        }
    }, [roomId, isAudioEnabled]);

    // Handle screen sharing
    const startScreenShare = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: { cursor: 'always' },
                audio: false
            });
            screenStreamRef.current = stream;
            setScreenStream(stream);
            setIsScreenSharing(true);

            const screenTrack = stream.getVideoTracks()[0];

            // Update peers
            await replaceTrackInAllPeers(screenTrack, 'video');

            // Browser stop button
            screenTrack.onended = () => stopScreenShare();

            socket.emit('screen-share-started', { roomId });
        } catch (error) {
            // Cancelled
        }
    }, [roomId]);

    const stopScreenShare = useCallback(() => {
        screenStreamRef.current?.getTracks().forEach(t => t.stop());
        screenStreamRef.current = null;
        setScreenStream(null);

        // Back to camera
        const videoTrack = localStreamRef.current?.getVideoTracks()[0];
        if (videoTrack) {
            replaceTrackInAllPeers(videoTrack, 'video');
        }

        setIsScreenSharing(false);
        socket.emit('screen-share-stopped', { roomId });
    }, [roomId]);

    // Check permissions
    useEffect(() => {
        if (isHostRef.current) return;

        if (!permissions.mic && isAudioEnabled) {
            const track = localStreamRef.current?.getAudioTracks()[0];
            if (track) track.enabled = false;
            setIsAudioEnabled(false);
            socket.emit('media-state-change', { roomId, isAudioEnabled: false, isVideoEnabled });
        }
        if (!permissions.camera && isVideoEnabled) {
            const track = localStreamRef.current?.getVideoTracks()[0];
            if (track) track.enabled = false;
            setIsVideoEnabled(false);
            socket.emit('media-state-change', { roomId, isAudioEnabled, isVideoEnabled: false });
        }
        if (!permissions.screen && isScreenSharing) {
            stopScreenShare();
        }
    }, [permissions, isAudioEnabled, isVideoEnabled, isScreenSharing, roomId, stopScreenShare]);

    const updatePermissions = useCallback((newPermissions) => {
        socket.emit('update-permissions', { roomId, permissions: newPermissions });
    }, [roomId]);

    useEffect(() => {
        socket.on('room-joined', ({ permissions: initialPermissions, messages }) => {
            setIsConnected(true);
            if (initialPermissions) setPermissions(initialPermissions);
            if (messages) setChatHistory(messages);
        });
        socket.on('waiting-for-approval', () => setWaitingForApproval(true));

        socket.on('join-approved', ({ participants: existing, permissions: initialPermissions, messages }) => {
            setWaitingForApproval(false);
            setIsConnected(true);
            if (initialPermissions) setPermissions(initialPermissions);
            if (messages) setChatHistory(messages);

            existing?.forEach((p, i) => {
                addParticipant(p.socketId, { ...p, connectionState: 'connecting', isVideoEnabled: true, isAudioEnabled: true });
                createPeerConnection(p.socketId, localStreamRef.current, true);
                setTimeout(() => createAndSendOffer(p.socketId), 200 * (i + 1));
            });
        });

        socket.on('join-rejected', ({ reason }) => { setWaitingForApproval(false); setWasRejected(true); setRejectionReason(reason); });

        socket.on('user-joined', ({ socketId, odId, userName }) => {
            addParticipant(socketId, { odId, userName, connectionState: 'connecting', isVideoEnabled: true, isAudioEnabled: true });
        });

        socket.on('user-left', ({ socketId }) => removeParticipant(socketId));
        socket.on('host-left', ({ message }) => setConnectionError(message));

        socket.on('permissions-updated', (newPermissions) => setPermissions(newPermissions));

        socket.on('offer', async ({ offer, senderSocketId, senderName }) => {
            addParticipant(senderSocketId, { userName: senderName, connectionState: 'connecting' });
            await handleOffer(senderSocketId, offer, localStreamRef.current);
        });

        socket.on('answer', async ({ answer, senderSocketId }) => await handleAnswer(senderSocketId, answer));
        socket.on('ice-candidate', async ({ candidate, senderSocketId }) => await handleIceCandidate(senderSocketId, candidate));
        socket.on('user-media-state-changed', ({ socketId, isAudioEnabled, isVideoEnabled }) => addParticipant(socketId, { isAudioEnabled, isVideoEnabled }));
        socket.on('user-screen-sharing', ({ socketId, isSharing }) => addParticipant(socketId, { isScreenSharing: isSharing }));
        socket.on('disconnect', () => setIsConnected(false));

        return () => {
            ['room-joined', 'waiting-for-approval', 'join-approved', 'join-rejected', 'user-joined', 'user-left',
                'host-left', 'permissions-updated', 'offer', 'answer', 'ice-candidate', 'user-media-state-changed', 'user-screen-sharing', 'disconnect'
            ].forEach(e => socket.off(e));
        };
    }, [addParticipant, removeParticipant]);
    return {
        localStream: isScreenSharing ? screenStream : localStream,
        screenStream, participants, isAudioEnabled, isVideoEnabled, isScreenSharing,
        isConnected, connectionError, waitingForApproval, wasRejected, rejectionReason,
        joinRoom, leaveRoom, toggleAudio, toggleVideo, startScreenShare, stopScreenShare,
        permissions, updatePermissions, chatHistory
    };
};

export default useWebRTC;
