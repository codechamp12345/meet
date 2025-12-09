import { Link } from 'react-router-dom';

const Landing = () => {
    const features = [
        {
            icon: '🎥',
            title: 'HD Video Calls',
            desc: 'Crystal clear video quality with adaptive streaming'
        },
        {
            icon: '🖥️',
            title: 'Screen Sharing',
            desc: 'Share your screen for presentations and demos'
        },
        {
            icon: '💬',
            title: 'Real-time Chat',
            desc: 'Send messages during meetings instantly'
        },
        {
            icon: '🔒',
            title: 'Secure & Private',
            desc: 'End-to-end encryption for all meetings'
        },
        {
            icon: '👥',
            title: 'Host Controls',
            desc: 'Approve who joins your meetings'
        },
        {
            icon: '📧',
            title: 'Email Verification',
            desc: 'Secure OTP-based account verification'
        }
    ];

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
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
                        <Link to="/login" className="text-gray-600 hover:text-gray-900 transition-colors px-4 py-2">Sign In</Link>
                        <Link to="/register" className="bg-purple-600 hover:bg-purple-700 text-white font-medium px-6 py-2 rounded-lg transition-all">
                            Get Started
                        </Link>
                    </div>
                </nav>
            </header>

            {/* Hero Section */}
            <main className="container mx-auto px-6">
                <div className="text-center py-20 lg:py-28">
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
                        Video Meetings
                        <span className="block mt-2 text-purple-600">
                            Made Simple
                        </span>
                    </h1>
                    <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                        Connect with anyone, anywhere. High-quality video calls with screen sharing,
                        chat, and host controls for productive meetings.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link to="/register" className="inline-flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white font-semibold px-8 py-4 rounded-xl transition-all text-lg">
                            Start Free Meeting
                            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </Link>
                        <Link to="/login" className="inline-flex items-center justify-center bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-900 font-semibold px-8 py-4 rounded-xl transition-all text-lg">
                            Join Meeting
                        </Link>
                    </div>
                </div>

                {/* Features Grid */}
                <div className="py-16">
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-12">
                        Everything you need for <span className="text-purple-600">great meetings</span>
                    </h2>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                        {features.map((feature, index) => (
                            <div key={index} className="bg-gray-50 border border-gray-200 rounded-xl p-6 hover:border-purple-300 transition-all">
                                <div className="text-4xl mb-4">{feature.icon}</div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                                <p className="text-gray-600 text-sm">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* CTA Section */}
                <div className="py-16 text-center">
                    <div className="bg-purple-50 rounded-2xl border border-purple-200 p-12 max-w-3xl mx-auto">
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                            Ready to get started?
                        </h2>
                        <p className="text-gray-600 mb-8">
                            Create your free account and start hosting meetings in minutes.
                        </p>
                        <Link to="/register" className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-8 py-3 rounded-lg transition-all">
                            Create Free Account
                        </Link>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-gray-200 mt-16">
                <div className="container mx-auto px-6 py-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <span className="text-gray-900 font-semibold">SyncRoom</span>
                        </div>
                        <p className="text-gray-600 text-sm">
                            © 2025 <span className="text-purple-600">Therayu</span>. All rights reserved.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Landing;