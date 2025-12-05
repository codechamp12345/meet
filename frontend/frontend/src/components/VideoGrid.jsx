import { useState } from 'react';
import VideoTile from './VideoTile';

const VideoGrid = ({ localStream, participants, isVideoEnabled, isAudioEnabled, userName, isScreenSharing }) => {
    const [pinnedSocketId, setPinnedSocketId] = useState(null);
    const participantArray = Array.from(participants.values());
    const totalParticipants = participantArray.length + 1;

    // Handle pin toggle
    const handlePin = (id) => {
        setPinnedSocketId(prev => (prev === id ? null : id));
    };

    const getGridClass = () => {
        if (totalParticipants === 1) return 'grid-cols-1';
        if (totalParticipants === 2) return 'grid-cols-1 md:grid-cols-2';
        if (totalParticipants <= 4) return 'grid-cols-2';
        if (totalParticipants <= 6) return 'grid-cols-2 md:grid-cols-3';
        return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
    };

    const getTileClass = (isPinnedView = false) => {
        if (isPinnedView) {
            return 'w-full h-full aspect-[4/3] rounded-xl overflow-hidden shadow-lg border border-gray-700/50 relative';
        }
        // Use 4:3 aspect ratio for everyone to prevent cropping faces
        // Single user gets slightly larger width but same ratio
        if (totalParticipants === 1) return 'w-full max-w-4xl max-h-[75vh] aspect-[4/3] mx-auto rounded-xl overflow-hidden shadow-lg border border-gray-700/50 relative';
        return 'w-full max-w-2xl aspect-[4/3] mx-auto rounded-xl overflow-hidden shadow-lg border border-gray-700/50 relative';
    };

    // Render logic for Pinned View
    if (pinnedSocketId) {
        // Determine who is pinned
        const isLocalPinned = pinnedSocketId === 'local';
        const pinnedParticipant = !isLocalPinned ? participants.get(pinnedSocketId) : null;

        // If pinned participant left, reset
        if (!isLocalPinned && !pinnedParticipant) {
            setPinnedSocketId(null);
            // This return will be skipped on next render, but for now fall through or return null
            // (React state update will trigger re-render)
        } else {
            return (
                <div className="flex flex-col lg:flex-row h-full w-full overflow-hidden p-2 gap-2">
                    {/* Main Stage */}
                    <div className="flex-1 h-full min-h-0 flex items-center justify-center bg-gray-900/50 rounded-xl p-2">
                        {/* Wrapper to constrain aspect ratio of pinned video */}
                        <div className="w-full h-full max-w-6xl flex items-center justify-center relative">
                            <div className="w-full h-full max-h-full aspect-[4/3] relative">
                                {isLocalPinned ? (
                                    <VideoTile
                                        stream={localStream}
                                        userName={userName || 'You'}
                                        isLocal={true}
                                        isVideoEnabled={isVideoEnabled}
                                        isAudioEnabled={isAudioEnabled}
                                        isScreenSharing={isScreenSharing}
                                        isMuted={true}
                                        connectionState="connected"
                                        isPinned={true}
                                        onPin={() => handlePin('local')}
                                    />
                                ) : (
                                    <VideoTile
                                        stream={pinnedParticipant.stream}
                                        userName={pinnedParticipant.userName || 'Guest'}
                                        isLocal={false}
                                        isVideoEnabled={pinnedParticipant.isVideoEnabled !== false}
                                        isAudioEnabled={pinnedParticipant.isAudioEnabled !== false}
                                        isScreenSharing={pinnedParticipant.isScreenSharing}
                                        connectionState={pinnedParticipant.connectionState}
                                        isPinned={true}
                                        onPin={() => handlePin(pinnedParticipant.socketId)}
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="w-full lg:w-80 flex flex-col gap-2 overflow-y-auto custom-scrollbar p-1">
                        {/* Render Local if not pinned */}
                        {!isLocalPinned && (
                            <div className="w-full aspect-[4/3] flex-shrink-0">
                                <VideoTile
                                    stream={localStream}
                                    userName={userName || 'You'}
                                    isLocal={true}
                                    isVideoEnabled={isVideoEnabled}
                                    isAudioEnabled={isAudioEnabled}
                                    isScreenSharing={isScreenSharing}
                                    isMuted={true}
                                    connectionState="connected"
                                    isPinned={false}
                                    onPin={() => handlePin('local')}
                                />
                            </div>
                        )}

                        {/* Render Remote Participants if not pinned */}
                        {participantArray.map(p => {
                            if (p.socketId === pinnedSocketId) return null;
                            return (
                                <div key={p.socketId} className="w-full aspect-[4/3] flex-shrink-0">
                                    <VideoTile
                                        stream={p.stream}
                                        userName={p.userName || 'Guest'}
                                        isLocal={false}
                                        isVideoEnabled={p.isVideoEnabled !== false}
                                        isAudioEnabled={p.isAudioEnabled !== false}
                                        isScreenSharing={p.isScreenSharing}
                                        connectionState={p.connectionState}
                                        isPinned={false}
                                        onPin={() => handlePin(p.socketId)}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }
    }

    // Default Grid View
    return (
        <div className="h-full w-full overflow-y-auto custom-scrollbar">
            <div className="min-h-full w-full flex items-center justify-center p-2 md:p-4">
                <div className={`grid ${getGridClass()} gap-4 w-full max-w-7xl`}>
                    {/* Local Video */}
                    <div className={getTileClass()}>
                        <VideoTile
                            stream={localStream}
                            userName={userName || 'You'}
                            isLocal={true}
                            isVideoEnabled={isVideoEnabled}
                            isAudioEnabled={isAudioEnabled}
                            isScreenSharing={isScreenSharing}
                            isMuted={true}
                            connectionState="connected"
                            isPinned={false}
                            onPin={() => handlePin('local')}
                        />
                    </div>

                    {/* Remote Participants */}
                    {participantArray.map((participant) => (
                        <div key={participant.socketId} className={getTileClass()}>
                            <VideoTile
                                stream={participant.stream}
                                userName={participant.userName || 'Guest'}
                                isLocal={false}
                                isVideoEnabled={participant.isVideoEnabled !== false}
                                isAudioEnabled={participant.isAudioEnabled !== false}
                                isScreenSharing={participant.isScreenSharing}
                                connectionState={participant.connectionState || 'connecting'}
                                isPinned={false}
                                onPin={() => handlePin(participant.socketId)}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default VideoGrid;
