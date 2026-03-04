import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Zap, Loader2 } from 'lucide-react';

export default function GoogleCallbackPage() {
    const [searchParams] = useSearchParams();
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { fetchUser } = useAuth();

    useEffect(() => {
        const accessToken = searchParams.get('accessToken');
        const refreshToken = searchParams.get('refreshToken');
        const errorMsg = searchParams.get('error');

        if (errorMsg) {
            setError('Google login failed. Please try again.');
            setTimeout(() => navigate('/login'), 3000);
            return;
        }

        if (accessToken && refreshToken) {
            sessionStorage.setItem('accessToken', accessToken);
            sessionStorage.setItem('refreshToken', refreshToken);
            fetchUser().then(() => navigate('/dashboard'));
        } else {
            setError('Invalid callback. Redirecting to login...');
            setTimeout(() => navigate('/login'), 2000);
        }
    }, [searchParams, navigate, fetchUser]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
            <div className="bg-white rounded-3xl p-10 w-full max-w-[420px] shadow-xl shadow-gray-200/50 border border-gray-100 text-center">
                <div className="flex items-center justify-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-accent-gradient rounded-2xl flex items-center justify-center shadow-lg shadow-primary/25">
                        <Zap className="w-6 h-6 text-white" />
                    </div>
                </div>
                {error ? (
                    <>
                        <h2 className="text-xl font-bold text-red-600 mb-2">Login Failed</h2>
                        <p className="text-sm text-gray-500">{error}</p>
                    </>
                ) : (
                    <>
                        <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Signing you in...</h2>
                        <p className="text-sm text-gray-500">Please wait while we complete your Google login.</p>
                    </>
                )}
            </div>
        </div>
    );
}
