const ControlBar = ({
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    isChatOpen,
    onToggleAudio,
    onToggleVideo,
    onToggleScreenShare,
    onToggleChat,
    onLeaveMeeting,
    unreadMessages = 0,
}) => {
    return (
        <div className="bg-gray-800/80 backdrop-blur-sm border-t border-gray-700/50 px-4 py-4">
            <div className="flex items-center justify-center space-x-3 md:space-x-4">
                {/* Mic Toggle */}
                <button
                    onClick={onToggleAudio}
                    className={`relative w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all ${isAudioEnabled
                        ? 'bg-gray-700 hover:bg-gray-600 text-white'
                        : 'bg-red-500 hover:bg-red-600 text-white'
                        }`}
                    title={isAudioEnabled ? 'Mute' : 'Unmute'}
                >
                    {isAudioEnabled ? (
                        <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                    ) : (
                        <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                        </svg>
                    )}
                </button>

                {/* Camera Toggle */}
                <button
                    onClick={onToggleVideo}
                    className={`relative w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all ${isVideoEnabled
                        ? 'bg-gray-700 hover:bg-gray-600 text-white'
                        : 'bg-red-500 hover:bg-red-600 text-white'
                        }`}
                    title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
                >
                    {isVideoEnabled ? (
                        <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    ) : (
                        <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                        </svg>
                    )}
                </button>

                {/* Screen Share Toggle */}
                <button
                    onClick={onToggleScreenShare}
                    className={`relative w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all ${isScreenSharing
                        ? 'bg-blue-500 hover:bg-blue-600 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-white'
                        }`}
                    title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
                >
                    <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                </button>

                {/* Chat Toggle */}
                <button
                    onClick={onToggleChat}
                    className={`relative w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all ${isChatOpen
                        ? 'bg-purple-500 hover:bg-purple-600 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-white'
                        }`}
                    title="Chat"
                >
                    <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>

                    {/* Unread Badge */}
                    {unreadMessages > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                            {unreadMessages > 9 ? '9+' : unreadMessages}
                        </span>
                    )}
                </button>

                {/* Divider */}
                <div className="w-px h-8 bg-gray-600 mx-2 hidden md:block" />

                {/* Leave Meeting */}
                <button
                    onClick={onLeaveMeeting}
                    className="w-12 h-12 md:w-14 md:h-14 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all shadow-lg"
                    title="Leave meeting"
                >
                    <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default ControlBar;
