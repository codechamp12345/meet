import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { meetingAPI } from '../utils/api';

const Home = () => {
    const [meetingId, setMeetingId] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleCreateMeeting = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await meetingAPI.create({});
            navigate(`/meeting/${response.data.meetingId}`);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create meeting');
        }
        setLoading(false);
    };

    const handleJoinMeeting = async (e) => {
        e.preventDefault();
        if (!meetingId.trim()) {
            setError('Please enter a meeting ID');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await meetingAPI.validate(meetingId.trim());
            navigate(`/meeting/${meetingId.trim()}`);
        } catch (err) {
            if (err.response?.status === 404) {
                setError('Meeting not found. Please check the ID.');
            } else {
                setError(err.response?.data?.message || 'Failed to join meeting');
            }
        }
        setLoading(false);
    };

    const features = [
        { icon: '🎥', title: 'HD Video', desc: 'Crystal clear video quality' },
        { icon: '🖥️', title: 'Screen Share', desc: 'Present and collaborate' },
        { icon: '💬', title: 'Live Chat', desc: 'Message during meetings' },
        { icon: '👥', title: 'Host Control', desc: 'Manage who can join' }
    ];

    return (
        <div className="min-h-screen bg-white">
            <header className="container mx-auto px-6 py-6">
                <nav className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <div className="w-10 h-10 rounded-lg bg-purple-600 flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <span className="text-xl font-bold text-gray-900">SyncRoom</span>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-3">
                            <div className="w-9 h-9 rounded-full bg-purple-600 flex items-center justify-center text-white font-medium">
                                {user?.name?.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-gray-700 hidden sm:block">{user?.name}</span>
                        </div>
                        <button onClick={() => { logout(); navigate('/'); }} className="text-gray-500 hover:text-gray-900 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </div>
                </nav>
            </header>

            <main className="container mx-auto px-6 py-8">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-10">
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Welcome, {user?.name?.split(' ')[0]}! 👋</h1>
                        <p className="text-gray-600 text-lg">Start a new meeting or join an existing one</p>
                    </div>

                    {error && (
                        <div className="max-w-md mx-auto mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm text-center">{error}</div>
                    )}

                    <div className="grid md:grid-cols-2 gap-6 mb-12">
                        <div className="bg-white rounded-2xl border border-gray-200 p-8 hover:border-purple-300 transition-all shadow-sm">
                            <div className="w-14 h-14 rounded-xl bg-purple-600 flex items-center justify-center mb-6">
                                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">Create a Meeting</h2>
                            <p className="text-gray-600 mb-6">Start a new video meeting and invite others</p>
                            <button onClick={handleCreateMeeting} disabled={loading} className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50">
                                {loading ? 'Creating...' : 'New Meeting'}
                            </button>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-200 p-8 hover:border-purple-300 transition-all shadow-sm">
                            <div className="w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center mb-6">
                                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">Join a Meeting</h2>
                            <p className="text-gray-600 mb-6">Enter a meeting ID to join</p>
                            <form onSubmit={handleJoinMeeting} className="space-y-4">
                                <input
                                    type="text"
                                    value={meetingId}
                                    onChange={(e) => setMeetingId(e.target.value)}
                                    placeholder="Enter meeting ID"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                />
                                <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50">
                                    {loading ? 'Joining...' : 'Join Meeting'}
                                </button>
                            </form>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {features.map((f, i) => (
                            <div key={i} className="bg-gray-50 rounded-xl p-5 text-center border border-gray-200">
                                <div className="text-3xl mb-2">{f.icon}</div>
                                <h3 className="text-gray-900 font-medium mb-1">{f.title}</h3>
                                <p className="text-gray-600 text-xs">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            <footer className="border-t border-gray-200 mt-12">
                <div className="container mx-auto px-6 py-6 text-center">
                    <p className="text-gray-600 text-sm">© 2025 <span className="text-purple-600">Therayu</span>. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};

export default Home;