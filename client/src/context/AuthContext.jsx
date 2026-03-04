import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService, analyticsService } from '../services/services';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchUser = useCallback(async () => {
        try {
            const token = sessionStorage.getItem('accessToken');
            if (!token) { setLoading(false); return; }
            const { data } = await authService.getMe();
            setUser(data.data.user);
        } catch {
            sessionStorage.removeItem('accessToken');
            sessionStorage.removeItem('refreshToken');
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchUser(); }, [fetchUser]);

    const login = async (credentials) => {
        const { data } = await authService.login(credentials);
        if (data.data.requiresMFA) return data.data;
        sessionStorage.setItem('accessToken', data.data.accessToken);
        sessionStorage.setItem('refreshToken', data.data.refreshToken);
        setUser(data.data.user);
        // Track successful login
        analyticsService.trackEvent({ eventType: 'user_login' }).catch(() => {});
        return data.data;
    };

    const register = async (userData) => {
        const { data } = await authService.register(userData);
        sessionStorage.setItem('accessToken', data.data.accessToken);
        sessionStorage.setItem('refreshToken', data.data.refreshToken);
        setUser(data.data.user);
        // Track signup event
        analyticsService.trackEvent({ eventType: 'user_signup' }).catch(() => {});
        return data.data;
    };

    const verifyMFA = async (mfaData) => {
        const { data } = await authService.verifyMFA(mfaData);
        sessionStorage.setItem('accessToken', data.data.accessToken);
        sessionStorage.setItem('refreshToken', data.data.refreshToken);
        setUser(data.data.user);
        // Track login completed after MFA
        analyticsService.trackEvent({ eventType: 'user_login' }).catch(() => {});
        return data.data;
    };

    const logout = async () => {
        try {
            const deviceId = sessionStorage.getItem('deviceId');
            await authService.logout(deviceId);
        } catch { /* ignore */ }
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('refreshToken');
        sessionStorage.removeItem('deviceId');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, verifyMFA, logout, fetchUser }}>
            {children}
        </AuthContext.Provider>
    );
};
