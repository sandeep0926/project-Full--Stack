import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Zap, Mail, Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function LoginPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [mfaData, setMfaData] = useState(null);
    const [otp, setOtp] = useState('');
    const { login, register, verifyMFA } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (isLogin) {
                const result = await login({ email: formData.email, password: formData.password });
                if (result.requiresMFA) {
                    setMfaData(result);
                } else {
                    navigate('/dashboard');
                }
            } else {
                await register(formData);
                navigate('/dashboard');
            }
        } catch (err) {
            setError(err.response?.data?.error?.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const handleMFASubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await verifyMFA({ userId: mfaData.userId, otp });
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.error?.message || 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    if (mfaData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 relative overflow-hidden">
                <div className="absolute w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(99,102,241,0.08),transparent_70%)] -top-40 -right-40" />
                <div className="bg-white rounded-3xl p-10 w-full max-w-[420px] shadow-xl shadow-gray-200/50 border border-gray-100 relative z-10 animate-slide-up">
                    <div className="flex items-center justify-center gap-3 mb-8">
                        <div className="w-12 h-12 bg-accent-gradient rounded-2xl flex items-center justify-center shadow-lg shadow-primary/25">
                            <Lock className="w-6 h-6 text-white" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-extrabold text-center text-gray-900 mb-2">Two-Factor Auth</h2>
                    <p className="text-sm text-gray-500 text-center mb-8">Enter the OTP sent to your email</p>
                    {error && (
                        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">{error}</div>
                    )}
                    <form onSubmit={handleMFASubmit} className="space-y-5">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5">OTP Code</label>
                            <input
                                type="text" value={otp} onChange={(e) => setOtp(e.target.value)}
                                placeholder="Enter 6-digit code"
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-center text-2xl font-mono tracking-[0.5em] placeholder:text-gray-400 placeholder:text-base placeholder:tracking-normal focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
                                maxLength={6} required
                            />
                        </div>
                        <button type="submit" disabled={loading}
                            className="w-full py-3 bg-accent-gradient text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Verify'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 relative overflow-hidden">
            {/* Background effects */}
            <div className="absolute w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(99,102,241,0.08),transparent_70%)] -top-40 -right-40" />
            <div className="absolute w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(139,92,246,0.06),transparent_70%)] -bottom-40 -left-40" />

            <div className="bg-white rounded-3xl p-10 w-full max-w-[420px] shadow-xl shadow-gray-200/50 border border-gray-100 relative z-10 animate-slide-up">
                {/* Logo */}
                <div className="flex items-center justify-center gap-3 mb-8">
                    <div className="w-12 h-12 bg-accent-gradient rounded-2xl flex items-center justify-center shadow-lg shadow-primary/25">
                        <Zap className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xl font-extrabold text-gray-900">Enterprise</span>
                </div>

                <h2 className="text-2xl font-extrabold text-center text-gray-900 mb-2">
                    {isLogin ? 'Welcome back' : 'Create account'}
                </h2>
                <p className="text-sm text-gray-500 text-center mb-8">
                    {isLogin ? 'Sign in to your account' : 'Start your 14-day free trial'}
                </p>

                {error && (
                    <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">{error}</div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    {!isLogin && (
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="John Doe"
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/10 focus:bg-white outline-none transition-all" required />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="you@example.com"
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/10 focus:bg-white outline-none transition-all" required />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input type={showPassword ? 'text' : 'password'} value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder="••••••••"
                                className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/10 focus:bg-white outline-none transition-all" required />
                            <button type="button" onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        {!isLogin && <p className="text-[11px] text-gray-400 mt-1.5">Min 8 chars, uppercase, lowercase, number & special char</p>}
                    </div>

                    {isLogin && (
                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center gap-2 text-gray-500 cursor-pointer">
                                <input type="checkbox" className="rounded border-gray-300 text-primary focus:ring-primary/30" />
                                <span className="text-xs">Remember me</span>
                            </label>
                            <Link to="/forgot-password" className="text-xs text-primary hover:text-primary-dark font-medium transition-colors">
                                Forgot password?
                            </Link>
                        </div>
                    )}

                    <button type="submit" disabled={loading}
                        className="w-full py-3 bg-accent-gradient text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>{isLogin ? 'Sign In' : 'Create Account'}<ArrowRight className="w-4 h-4" /></>
                        )}
                    </button>
                </form>

                {/* Divider */}
                <div className="flex items-center gap-4 my-6">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs text-gray-400">or continue with</span>
                    <div className="flex-1 h-px bg-gray-200" />
                </div>

                {/* Google OAuth */}
                <a href="/api/v1/auth/google"
                    className="w-full py-3 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm transition-all flex items-center justify-center gap-3">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Google
                </a>

                {/* Toggle */}
                <p className="text-center mt-6 text-sm text-gray-500">
                    Don't have an account?{' '}
                    <Link to="/register" className="text-primary hover:text-primary-dark font-semibold transition-colors">
                        Sign up
                    </Link>
                </p>
            </div>
        </div>
    );
}
