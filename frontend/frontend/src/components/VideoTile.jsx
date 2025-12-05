import { useRef, useEffect, useState } from 'react';

const VideoTile = ({
    stream,
    userName,
    isLocal = false,
    isVideoEnabled = true,
    isAudioEnabled = true,
    isScreenSharing = false,
    isMuted = false,
    connectionState = 'connected',
    isPinned = false,
    onPin
}) => {
    const videoRef = useRef(null);
    const [videoReady, setVideoReady] = useState(false);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        if (stream) {

            video.srcObject = stream;

            // CRITICAL: Always mute LOCAL audio to prevent feedback loop
            if (isLocal) {
                video.muted = true;
                video.volume = 0;
            } else {
                // Remote streams should play audio
                video.muted = false;
                video.volume = 1;
            }

            // Check if we have video
            const checkVideo = () => {
                const videoTracks = stream.getVideoTracks();
                const hasActive = videoTracks.length > 0 && videoTracks.some(t => t.enabled);
                setVideoReady(hasActive);
            };

            checkVideo();

            // Listen for track changes
            stream.onaddtrack = checkVideo;
            stream.onremovetrack = checkVideo;

            // Also check periodically for first few seconds
            const interval = setInterval(checkVideo, 500);
            setTimeout(() => clearInterval(interval), 3000);

            // Ensure video plays
            video.onloadedmetadata = () => {
                video.play().catch(() => { });
                checkVideo();
            };

            return () => {
                clearInterval(interval);
                stream.onaddtrack = null;
                stream.onremovetrack = null;
                video.onloadedmetadata = null;
            };
        } else {
            video.srcObject = null;
            setVideoReady(false);
        }
    }, [stream, isLocal, userName]);

    // Show video if: we have stream
    const showVideo = stream && (videoReady || isScreenSharing);
    const isConnecting = !isLocal && connectionState !== 'connected' && !stream;

    // Prevent infinite loop for local screen share
    const isLocalScreenShare = isLocal && isScreenSharing;

    return (
        <div className="relative w-full h-full min-h-[200px] bg-gray-800 rounded-xl overflow-hidden group border border-gray-700/50">
            {/* Video element - hide if local screen share to prevent infinite loop */}
            {!isLocalScreenShare && (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={isLocal || isMuted}
                    className={`w-full h-full ${isScreenSharing ? 'object-contain bg-black' : 'object-cover'} ${!showVideo ? 'hidden' : ''} ${isLocal && !isScreenSharing ? 'transform -scale-x-100' : ''}`}
                />
            )}

            {/* Local Screen Share Placeholder */}
            {isLocalScreenShare && (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800 text-center p-4">
                    <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mb-4 animate-pulse">
                        <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h3 className="text-white font-semibold text-lg mb-1">You are sharing your screen</h3>
                    <p className="text-gray-400 text-sm">Everyone in the meeting can see your screen.</p>
                </div>
            )}

            {/* showde Avatar when no video */}
            {!showVideo && (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800">
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                        <span className="text-2xl md:text-3xl font-bold text-white">
                            {userName?.charAt(0).toUpperCase() || '?'}
                        </span>
                    </div>
                </div>
            )}

            {isScreenSharing && (
                <div className="absolute top-3 left-3 px-2 py-1 bg-blue-500/80 rounded-md flex items-center space-x-1">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs text-white">Screen</span>
                </div>
            )}

            <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/80 to-transparent">
                <div className="flex items-center justify-between">
                    <span className="text-white text-sm font-medium truncate max-w-[150px]">
                        {userName} {isLocal && '(You)'}
                    </span>
                    <div className="flex items-center space-x-2">
                        {!isAudioEnabled && (
                            <div className="w-6 h-6 rounded-full bg-red-500/80 flex items-center justify-center">
                                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                                </svg>
                            </div>
                        )}
                        {!videoReady && !isScreenSharing && (
                            <div className="w-6 h-6 rounded-full bg-red-500/80 flex items-center justify-center">
                                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                                </svg>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Pin Button - Show on hover or if pinned */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onPin && onPin();
                }}
                className={`absolute top-3 right-3 w-8 h-8 rounded-full bg-gray-900/60 hover:bg-gray-700/80 flex items-center justify-center transition-all duration-200 z-10 ${isPinned ? 'opacity-100 bg-blue-600/80 hover:bg-blue-500/90' : 'opacity-0 group-hover:opacity-100'}`}
                title={isPinned ? "Unpin" : "Pin"}
            >
                {isPinned ? (
                    /* Pinned Icon (Filled) */
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z" />
                    </svg>
                ) : (
                    /* Unpinned Icon (Outline) */
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z" stroke="currentColor" fill="none" />
                        <path d="M16 9V4h1H7h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z" opacity="0" />
                        {/* Fallback to simple Path */}
                        <path d="M5 5h14M7 5v2m10-2v2M8 7v4l-2 2v2h8v6l2 2 2-2v-6h8v-2l-2-2V7" />
                    </svg>
                )}
            </button>

            {isConnecting && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800/80">
                    <div className="text-center">
                        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-gray-400 text-sm">Connecting...</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VideoTile;
