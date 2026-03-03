import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/services';

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
            const token = localStorage.getItem('accessToken');
            if (!token) { setLoading(false); return; }
            const { data } = await authService.getMe();
            setUser(data.data.user);
        } catch {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchUser(); }, [fetchUser]);

    const login = async (credentials) => {
        const { data } = await authService.login(credentials);
        if (data.data.requiresMFA) return data.data;
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        setUser(data.data.user);
        return data.data;
    };

    const register = async (userData) => {
        const { data } = await authService.register(userData);
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        setUser(data.data.user);
        return data.data;
    };

    const verifyMFA = async (mfaData) => {
        const { data } = await authService.verifyMFA(mfaData);
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        setUser(data.data.user);
        return data.data;
    };

    const logout = async () => {
        try {
            const deviceId = localStorage.getItem('deviceId');
            await authService.logout(deviceId);
        } catch { /* ignore */ }
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('deviceId');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, verifyMFA, logout, fetchUser }}>
            {children}
        </AuthContext.Provider>
    );
};
