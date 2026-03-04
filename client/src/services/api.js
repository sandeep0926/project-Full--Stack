import axios from 'axios';

const api = axios.create({
    baseURL: '/api/v1',
    headers: { 'Content-Type': 'application/json' },
});

// Request interceptor - add auth token
api.interceptors.request.use((config) => {
    const token = sessionStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Response interceptor - handle token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const refreshToken = sessionStorage.getItem('refreshToken');
                if (!refreshToken) throw new Error('No refresh token');
                const { data } = await axios.post('/api/v1/auth/refresh-token', { refreshToken });
                sessionStorage.setItem('accessToken', data.data.accessToken);
                sessionStorage.setItem('refreshToken', data.data.refreshToken);
                originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                sessionStorage.removeItem('accessToken');
                sessionStorage.removeItem('refreshToken');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export default api;
