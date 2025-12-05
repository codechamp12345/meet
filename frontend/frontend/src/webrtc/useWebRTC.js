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

    const localStreamRef = useRef(null);
    const screenStreamRef = useRef(null);
    const isJoinedRef = useRef(false);

    useEffect(() => { window.__userName = userName; }, [userName]);

    // Get camera and microphone with optimized audio settings
    const getLocalStream = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: {
                    echoCancellation: { ideal: true },
                    noiseSuppression: { ideal: true },
                    autoGainControl: { ideal: true },
                    sampleRate: { ideal: 48000 },
                    channelCount: { ideal: 1 },
                    latency: { ideal: 0.01 },
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
        console.log('[WEBRTC] Removing participant:', socketId);
        setParticipants(prev => {
            const newMap = new Map(prev);
            newMap.delete(socketId);
            return newMap;
        });
        closePeerConnection(socketId);
    }, []);

    const handleRemoteStream = useCallback((socketId, stream) => {
        addParticipant(socketId, { stream, connectionState: 'connected' });
    }, [addParticipant]);

    const handleConnectionStateChange = useCallback((socketId, state) => {
        if (state === 'closed' || state === 'failed' || state === 'disconnected') {
            console.log('[WEBRTC] Connection closed/failed for:', socketId);
            // Don't re-add, maybe even ensure removal? 
            // relying on user-left or explict removal is better, but definitly don't add.
            return;
        }
        addParticipant(socketId, { connectionState: state });
    }, [addParticipant]);

    const joinRoom = useCallback(async (isHost) => {
        if (isJoinedRef.current) return;
        isJoinedRef.current = true;

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

    // Screen sharing with proper track replacement
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

            // Replace video track in all peer connections
            await replaceTrackInAllPeers(screenTrack, 'video');

            // Handle when user stops sharing via browser UI
            screenTrack.onended = () => stopScreenShare();

            socket.emit('screen-share-started', { roomId });
        } catch (error) {
            // User cancelled screen share
        }
    }, [roomId]);

    const stopScreenShare = useCallback(() => {
        screenStreamRef.current?.getTracks().forEach(t => t.stop());
        screenStreamRef.current = null;
        setScreenStream(null);

        // Replace back with camera video
        const videoTrack = localStreamRef.current?.getVideoTracks()[0];
        if (videoTrack) {
            replaceTrackInAllPeers(videoTrack, 'video');
        }

        setIsScreenSharing(false);
        socket.emit('screen-share-stopped', { roomId });
    }, [roomId]);

    useEffect(() => {
        socket.on('room-joined', () => setIsConnected(true));
        socket.on('waiting-for-approval', () => setWaitingForApproval(true));

        socket.on('join-approved', ({ participants: existing }) => {
            setWaitingForApproval(false);
            setIsConnected(true);
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
                'host-left', 'offer', 'answer', 'ice-candidate', 'user-media-state-changed', 'user-screen-sharing', 'disconnect'
            ].forEach(e => socket.off(e));
        };
    }, [addParticipant, removeParticipant]);

    return {
        localStream: isScreenSharing ? screenStream : localStream,
        screenStream, participants, isAudioEnabled, isVideoEnabled, isScreenSharing,
        isConnected, connectionError, waitingForApproval, wasRejected, rejectionReason,
        joinRoom, leaveRoom, toggleAudio, toggleVideo, startScreenShare, stopScreenShare,
    };
};

export default useWebRTC;
