import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { meetingAPI } from '../utils/api';
import useWebRTC from '../webrtc/useWebRTC';
import { socket, connectSocket } from '../webrtc/socket';
import VideoGrid from '../components/VideoGrid';
import ControlBar from '../components/ControlBar';
import ChatSidebar from '../components/ChatSidebar';
import MeetingTimer from '../components/MeetingTimer';
import Toast from '../components/Toast';

const MeetingRoom = () => {
    const { id: meetingId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isHost, setIsHost] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [showParticipants, setShowParticipants] = useState(false);
    const [messages, setMessages] = useState([]);
    const [toasts, setToasts] = useState([]);
    const [joinRequests, setJoinRequests] = useState([]);

    const initRef = useRef(false);

    const {
        localStream, participants, isAudioEnabled, isVideoEnabled, isScreenSharing,
        isConnected, connectionError, waitingForApproval, wasRejected, rejectionReason,
        joinRoom, leaveRoom, toggleAudio, toggleVideo, startScreenShare, stopScreenShare,
    } = useWebRTC(meetingId, user?.name, user?.id);

    const addToast = useCallback((message, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    }, []);

    // Initialize meeting - runs once
    useEffect(() => {
        if (!user || initRef.current) return;
        initRef.current = true;

        const init = async () => {
            try {

                const response = await meetingAPI.validate(meetingId);
                const meeting = response.data.meeting;

                const hostId = String(meeting.host?._id || meeting.host);
                const userId = String(user.id);
                const userIsHost = hostId === userId;



                setIsHost(userIsHost);
                setLoading(false);

                // Connect socket and join room
                connectSocket();

                // Small delay to ensure socket is ready
                setTimeout(() => {
                    joinRoom(userIsHost);
                }, 200);

            } catch (err) {
                console.error('Init error:', err);
                setError(err.response?.status === 404 ? 'Meeting not found' : 'Failed to join');
                setLoading(false);
            }
        };

        init();

        return () => {
            leaveRoom();
        };
    }, [meetingId, user?.id]);

    // Socket events
    useEffect(() => {
        const onUserJoined = ({ userName }) => addToast(`${userName} joined`, 'success');
        const onUserLeft = ({ userName }) => addToast(`${userName} left`, 'warning');
        const onChatMessage = (msg) => setMessages(prev => [...prev, msg]);

        const onJoinRequest = ({ odId, userName, socketId }) => {

            setJoinRequests(prev => {
                if (prev.some(r => r.socketId === socketId)) return prev;
                return [...prev, { odId, userName, socketId }];
            });
            addToast(`${userName} wants to join`, 'info');
        };

        socket.on('user-joined', onUserJoined);
        socket.on('user-left', onUserLeft);
        socket.on('chat-message', onChatMessage);
        socket.on('join-request', onJoinRequest);

        return () => {
            socket.off('user-joined', onUserJoined);
            socket.off('user-left', onUserLeft);
            socket.off('chat-message', onChatMessage);
            socket.off('join-request', onJoinRequest);
        };
    }, [addToast]);

    useEffect(() => {
        if (connectionError) addToast(connectionError, 'warning');
    }, [connectionError, addToast]);

    const handleApprove = (socketId, userName) => {

        socket.emit('approve-join', { targetSocketId: socketId, roomId: meetingId });
        setJoinRequests(prev => prev.filter(r => r.socketId !== socketId));
        addToast(`${userName} admitted`, 'success');
    };

    const handleReject = (socketId, userName) => {

        socket.emit('reject-join', { targetSocketId: socketId, roomId: meetingId });
        setJoinRequests(prev => prev.filter(r => r.socketId !== socketId));
    };

    const handleLeaveMeeting = () => {
        leaveRoom();
        navigate('/home');
    };

    const sendMessage = (text) => {
        socket.emit('chat-message', {
            roomId: meetingId, message: text, sender: user?.name,
            timestamp: new Date().toISOString(),
        });
    };

    const copyCode = () => {
        navigator.clipboard.writeText(meetingId);
        addToast('Code copied!', 'success');
    };

    // --- Render States ---

    if (waitingForApproval) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-center max-w-md px-6">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Asking to join...</h2>
                    <p className="text-gray-400 mb-6">Waiting for the host to let you in</p>
                    <button onClick={() => { leaveRoom(); navigate('/home'); }} className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
                        Cancel
                    </button>
                </div>
            </div>
        );
    }

    if (wasRejected) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-center max-w-md px-6">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
                        <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Can't join</h2>
                    <p className="text-gray-400 mb-6">{rejectionReason}</p>
                    <button onClick={() => navigate('/home')} className="px-6 py-3 bg-purple-600 text-white rounded-lg">Go Home</button>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-white mb-4">{error}</h2>
                    <button onClick={() => navigate('/home')} className="px-6 py-3 bg-purple-600 text-white rounded-lg">Go Home</button>
                </div>
            </div>
        );
    }

    const participantList = [
        { odId: user?.id, userName: `${user?.name} (You)`, isHost, socketId: 'local' },
        ...Array.from(participants.values())
    ];

    return (
        <div className="h-screen bg-gray-900 flex flex-col overflow-hidden">
            {/* Header */}
            <header className="bg-gray-800/80 border-b border-gray-700/50 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <span className="text-white font-medium hidden sm:block">SyncRoom</span>
                        {isHost && <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full">Host</span>}
                    </div>

                    <button onClick={copyCode} className="hidden md:flex items-center space-x-2 px-3 py-1.5 bg-gray-700/50 rounded-lg hover:bg-gray-700">
                        <span className="text-gray-400 text-sm">Code:</span>
                        <span className="text-white text-sm font-mono">{meetingId}</span>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </button>
                </div>

                <div className="flex items-center space-x-3">
                    <MeetingTimer />

                    <button onClick={() => { setShowParticipants(!showParticipants); setIsChatOpen(false); }} className="flex items-center space-x-1 px-3 py-1.5 bg-gray-700/50 rounded-lg hover:bg-gray-700">
                        <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197" />
                        </svg>
                        <span className="text-white text-sm">{participantList.length}</span>
                        {joinRequests.length > 0 && (
                            <span className="bg-yellow-500 text-black text-xs font-bold px-1.5 rounded-full">{joinRequests.length}</span>
                        )}
                    </button>

                    <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                <div className={`flex-1 p-4 ${(isChatOpen || showParticipants) ? 'md:mr-80' : ''}`}>
                    <VideoGrid localStream={localStream} participants={participants} isVideoEnabled={isVideoEnabled} isAudioEnabled={isAudioEnabled} userName={user?.name} isScreenSharing={isScreenSharing} />
                </div>

                {/* Participants Panel */}
                {showParticipants && (
                    <div className="absolute right-0 top-14 bottom-20 w-80 bg-gray-800 border-l border-gray-700 flex flex-col z-40">
                        <div className="flex items-center justify-between p-4 border-b border-gray-700">
                            <h3 className="text-white font-semibold">People ({participantList.length})</h3>
                            <button onClick={() => setShowParticipants(false)} className="text-gray-400 hover:text-white">✕</button>
                        </div>

                        {/* Join Requests (Host Only) */}
                        {isHost && joinRequests.length > 0 && (
                            <div className="p-4 bg-yellow-500/10 border-b border-yellow-500/30">
                                <h4 className="text-yellow-400 text-sm font-semibold mb-3">⏳ Waiting to join ({joinRequests.length})</h4>
                                {joinRequests.map((req) => (
                                    <div key={req.socketId} className="bg-gray-700/50 rounded-lg p-3 mb-2">
                                        <div className="flex items-center space-x-3 mb-2">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center text-white font-bold">
                                                {req.userName?.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="text-white">{req.userName}</span>
                                        </div>
                                        <div className="flex space-x-2">
                                            <button onClick={() => handleApprove(req.socketId, req.userName)} className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg">Admit</button>
                                            <button onClick={() => handleReject(req.socketId, req.userName)} className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg">Deny</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* In Meeting */}
                        <div className="flex-1 overflow-y-auto p-4">
                            <h4 className="text-gray-400 text-sm mb-3">In this meeting</h4>
                            {participantList.map((p, i) => (
                                <div key={i} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-700/50">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-medium">
                                        {p.userName?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-white text-sm">{p.userName}</p>
                                        {p.isHost && <span className="text-purple-400 text-xs">Host</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <ChatSidebar isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} messages={messages} onSendMessage={sendMessage} currentUser={user?.name} />
            </div>

            <ControlBar
                isAudioEnabled={isAudioEnabled} isVideoEnabled={isVideoEnabled} isScreenSharing={isScreenSharing}
                isChatOpen={isChatOpen} onToggleAudio={toggleAudio} onToggleVideo={toggleVideo}
                onToggleScreenShare={isScreenSharing ? stopScreenShare : startScreenShare}
                onToggleChat={() => { setIsChatOpen(!isChatOpen); setShowParticipants(false); }}
                onLeaveMeeting={handleLeaveMeeting}
            />

            <div className="fixed top-20 right-4 z-50 space-y-2">
                {toasts.map(t => <Toast key={t.id} message={t.message} type={t.type} onClose={() => setToasts(prev => prev.filter(x => x.id !== t.id))} />)}
            </div>
        </div>
    );
};

export default MeetingRoom;
