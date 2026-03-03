import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../../services/services';
import { Zap, Mail, ArrowLeft, Send, CheckCircle, AlertCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await authService.forgotPassword(email);
            setSent(true);
        } catch (err) {
            setError(err.response?.data?.error?.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30 px-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8 animate-fade-in">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mb-4">
                            <Zap className="w-6 h-6 text-primary" />
                        </div>
                        <h1 className="text-2xl font-extrabold text-gray-900">
                            {sent ? 'Check your email' : 'Forgot password?'}
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {sent ? 'We sent a password reset link to your email' : 'No worries, we\'ll send you reset instructions'}
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 p-3 rounded-xl bg-red-50 border border-red-100 flex items-center gap-2 text-sm text-red-600 animate-slide-down">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                        </div>
                    )}

                    {sent ? (
                        <div className="text-center space-y-6">
                            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
                                <CheckCircle className="w-8 h-8 text-emerald-500" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">We sent a reset link to</p>
                                <p className="text-sm font-semibold text-gray-900 mt-1">{email}</p>
                            </div>
                            <p className="text-xs text-gray-400">
                                Didn't receive the email? Check your spam folder or{' '}
                                <button onClick={() => { setSent(false); setError(''); }} className="text-primary font-semibold hover:underline">
                                    try again
                                </button>
                            </p>
                            <Link to="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
                                <ArrowLeft className="w-4 h-4" /> Back to login
                            </Link>
                        </div>
                    ) : (
                        <>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all text-sm"
                                            placeholder="you@example.com" autoFocus />
                                    </div>
                                </div>

                                <button type="submit" disabled={loading}
                                    className="w-full py-3 bg-accent-gradient text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5 transition-all disabled:opacity-50 text-sm">
                                    {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Send className="w-4 h-4" /><span>Send Reset Link</span></>}
                                </button>
                            </form>

                            <p className="text-center text-sm text-gray-500 mt-6">
                                <Link to="/login" className="inline-flex items-center gap-1 text-primary font-semibold hover:underline">
                                    <ArrowLeft className="w-3.5 h-3.5" /> Back to login
                                </Link>
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
