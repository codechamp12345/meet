import VideoTile from './VideoTile';

const VideoGrid = ({ localStream, participants, isVideoEnabled, isAudioEnabled, userName, isScreenSharing }) => {
    const participantArray = Array.from(participants.values());
    const totalParticipants = participantArray.length + 1;

    const getGridClass = () => {
        if (totalParticipants === 1) return 'grid-cols-1';
        if (totalParticipants === 2) return 'grid-cols-1 md:grid-cols-2';
        if (totalParticipants <= 4) return 'grid-cols-2';
        if (totalParticipants <= 6) return 'grid-cols-2 md:grid-cols-3';
        return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
    };

    const getTileClass = () => {
        // Use 4:3 aspect ratio for everyone to prevent cropping faces
        // Single user gets slightly larger width but same ratio
        if (totalParticipants === 1) return 'w-full max-w-4xl max-h-[75vh] aspect-[4/3] mx-auto rounded-xl overflow-hidden shadow-lg border border-gray-700/50 relative';
        return 'w-full max-w-2xl aspect-[4/3] mx-auto rounded-xl overflow-hidden shadow-lg border border-gray-700/50 relative';
    };

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
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default VideoGrid;
