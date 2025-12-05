import { socket } from './socket';

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
};

const peerConnections = new Map();
const remoteStreams = new Map();
const pendingCandidates = new Map();

let onRemoteStreamCallback = null;
let onRemoteStreamRemovedCallback = null;
let onConnectionStateChangeCallback = null;

export const setCallbacks = (callbacks) => {
    onRemoteStreamCallback = callbacks.onRemoteStream;
    onRemoteStreamRemovedCallback = callbacks.onRemoteStreamRemoved;
    onConnectionStateChangeCallback = callbacks.onConnectionStateChange;
};

export const createPeerConnection = (targetSocketId, localStream, isInitiator = false) => {
    if (peerConnections.has(targetSocketId)) {
        peerConnections.get(targetSocketId).close();
        peerConnections.delete(targetSocketId);
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnections.set(targetSocketId, pc);

    // Add local tracks if available
    if (localStream) {
        localStream.getTracks().forEach((track) => {
            pc.addTrack(track, localStream);
        });
    }

    // Send ICE candidates to the other peer
    pc.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice-candidate', { targetSocketId, candidate: event.candidate });
        }
    };

    // Track connection state
    pc.onconnectionstatechange = () => {
        if (onConnectionStateChangeCallback) {
            onConnectionStateChangeCallback(targetSocketId, pc.connectionState);
        }
        if (pc.connectionState === 'connected') {
            const stream = remoteStreams.get(targetSocketId);
            if (stream && onRemoteStreamCallback) {
                onRemoteStreamCallback(targetSocketId, stream);
            }
        }
    };

    // Receive remote tracks - this handles screen share too
    pc.ontrack = (event) => {
        const [stream] = event.streams;
        if (stream) {
            remoteStreams.set(targetSocketId, stream);
            if (onRemoteStreamCallback) {
                onRemoteStreamCallback(targetSocketId, stream);
            }
        }
    };

    // Process any ICE candidates that arrived before the connection was ready
    const pending = pendingCandidates.get(targetSocketId);
    if (pending) {
        pending.forEach(c => pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => { }));
        pendingCandidates.delete(targetSocketId);
    }

    return pc;
};

export const createAndSendOffer = async (targetSocketId) => {
    const pc = peerConnections.get(targetSocketId);
    if (!pc) return;

    try {
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
        await pc.setLocalDescription(offer);
        socket.emit('offer', { targetSocketId, offer: pc.localDescription, senderName: window.__userName || 'User' });
    } catch (error) {
        console.error('Offer error:', error);
    }
};

export const handleOffer = async (senderSocketId, offer, localStream) => {
    let pc = peerConnections.get(senderSocketId);
    if (!pc) {
        pc = createPeerConnection(senderSocketId, localStream, false);
    }

    try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', { targetSocketId: senderSocketId, answer: pc.localDescription });

        const pending = pendingCandidates.get(senderSocketId);
        if (pending) {
            for (const c of pending) await pc.addIceCandidate(new RTCIceCandidate(c));
            pendingCandidates.delete(senderSocketId);
        }
    } catch (error) {
        console.error('Handle offer error:', error);
    }
};

export const handleAnswer = async (senderSocketId, answer) => {
    const pc = peerConnections.get(senderSocketId);
    if (!pc) return;

    try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        const pending = pendingCandidates.get(senderSocketId);
        if (pending) {
            for (const c of pending) await pc.addIceCandidate(new RTCIceCandidate(c));
            pendingCandidates.delete(senderSocketId);
        }
    } catch (error) {
        console.error('Handle answer error:', error);
    }
};

export const handleIceCandidate = async (senderSocketId, candidate) => {
    const pc = peerConnections.get(senderSocketId);

    if (!pc || !pc.remoteDescription) {
        if (!pendingCandidates.has(senderSocketId)) pendingCandidates.set(senderSocketId, []);
        pendingCandidates.get(senderSocketId).push(candidate);
        return;
    }

    try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
        console.error('ICE error:', error);
    }
};

export const closePeerConnection = (socketId) => {
    const pc = peerConnections.get(socketId);
    if (pc) {
        pc.close();
        peerConnections.delete(socketId);
    }

    const stream = remoteStreams.get(socketId);
    if (stream) {
        stream.getTracks().forEach(t => t.stop());
        remoteStreams.delete(socketId);
    }

    pendingCandidates.delete(socketId);
    if (onRemoteStreamRemovedCallback) onRemoteStreamRemovedCallback(socketId);
};

export const closeAllPeerConnections = () => {
    peerConnections.forEach((_, id) => closePeerConnection(id));
    peerConnections.clear();
    remoteStreams.clear();
    pendingCandidates.clear();
};

// Replace track in all peer connections for screen share
export const replaceTrackInAllPeers = async (newTrack, kind) => {
    const promises = [];

    peerConnections.forEach((pc, peerId) => {
        const senders = pc.getSenders();
        const sender = senders.find(s => s.track && s.track.kind === kind);

        if (sender) {
            promises.push(
                sender.replaceTrack(newTrack)
                    .then(() => console.log(`Track replaced for ${peerId}`))
                    .catch(err => console.error(`Track replace failed for ${peerId}:`, err))
            );
        } else {
            // Try to find any sender that could accept this track
            const emptySender = senders.find(s => !s.track);
            if (emptySender) {
                promises.push(
                    emptySender.replaceTrack(newTrack)
                        .then(() => console.log(`Track added for ${peerId}`))
                        .catch(err => console.error(`Track add failed for ${peerId}:`, err))
                );
            }
        }
    });

    await Promise.all(promises);
};

export const replaceTrack = replaceTrackInAllPeers;
export const getAllPeerConnections = () => peerConnections;
export const getAllRemoteStreams = () => remoteStreams;

export default {
    createPeerConnection, createAndSendOffer, handleOffer, handleAnswer,
    handleIceCandidate, closePeerConnection, closeAllPeerConnections,
    replaceTrackInAllPeers, replaceTrack, setCallbacks, getAllPeerConnections, getAllRemoteStreams,
};
