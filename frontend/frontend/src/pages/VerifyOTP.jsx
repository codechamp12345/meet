import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from '../utils/api';

const VerifyOTP = () => {
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(60);
    const [canResend, setCanResend] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const email = location.state?.email || '';

    useEffect(() => {
        if (!email) {
            navigate('/register');
        }
    }, [email, navigate]);

    useEffect(() => {
        if (resendTimer > 0) {
            const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            setCanResend(true);
        }
    }, [resendTimer]);

    const handleChange = (index, value) => {
        if (value.length > 1) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        setError('');

        // Auto-focus next input
        if (value && index < 5) {
            document.getElementById(`otp-${index + 1}`)?.focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            document.getElementById(`otp-${index - 1}`)?.focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, 6);
        if (/^\d+$/.test(pastedData)) {
            const newOtp = pastedData.split('').concat(Array(6 - pastedData.length).fill(''));
            setOtp(newOtp);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const otpValue = otp.join('');

        if (otpValue.length !== 6) {
            setError('Please enter the complete 6-digit code');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await authAPI.verifyOTP({ email, otp: otpValue });
            setSuccess(response.data.message);
            setTimeout(() => navigate('/login', { state: { message: 'Email verified! Please login.' } }), 1500);
        } catch (err) {
            setError(err.response?.data?.message || 'Verification failed');
        }

        setLoading(false);
    };

    const handleResend = async () => {
        if (!canResend) return;

        setLoading(true);
        setError('');
        setCanResend(false);
        setResendTimer(60);

        try {
            await authAPI.resendOTP({ email });
            setSuccess('New verification code sent!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to resend code');
            setCanResend(true);
        }

        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-white px-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-600 mb-4">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">Verify Your Email</h1>
                    <p className="text-gray-600 mt-2">We sent a 6-digit code to</p>
                    <p className="text-purple-600 font-medium">{email}</p>
                </div>

                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
                    {error && (
                        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm text-center">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm text-center">
                            {success}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="flex justify-center gap-3 mb-8">
                            {otp.map((digit, index) => (
                                <input
                                    key={index}
                                    id={`otp-${index}`}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => handleChange(index, e.target.value.replace(/\D/g, ''))}
                                    onKeyDown={(e) => handleKeyDown(index, e)}
                                    onPaste={handlePaste}
                                    className="w-12 h-14 text-center text-2xl font-bold bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                />
                            ))}
                        </div>

                        <button
                            type="submit"
                            disabled={loading || otp.join('').length !== 6}
                            className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Verifying...' : 'Verify Email'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-gray-600 text-sm">
                            Didn't receive the code?{' '}
                            {canResend ? (
                                <button
                                    onClick={handleResend}
                                    disabled={loading}
                                    className="text-purple-600 hover:text-purple-700 font-medium"
                                >
                                    Resend
                                </button>
                            ) : (
                                <span className="text-gray-500">Resend in {resendTimer}s</span>
                            )}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VerifyOTP;