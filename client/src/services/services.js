import api from './api';

export const authService = {
    register: (data) => api.post('/auth/register', data),
    login: (data) => api.post('/auth/login', data),
    verifyMFA: (data) => api.post('/auth/verify-mfa', data),
    getMe: () => api.get('/auth/me'),
    logout: (deviceId) => api.post('/auth/logout', { deviceId }),
    forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
    resetPassword: (token, password) => api.put(`/auth/reset-password/${token}`, { password }),
    enableMFA: () => api.post('/auth/enable-mfa'),
    getDevices: () => api.get('/auth/devices'),
    revokeDevice: (deviceId) => api.delete(`/auth/devices/${deviceId}`),
};

export const tenantService = {
    create: (data) => api.post('/tenants', data),
    getCurrent: () => api.get('/tenants/current'),
    update: (data) => api.put('/tenants/current', data),
    inviteMember: (data) => api.post('/tenants/members', data),
    removeMember: (userId) => api.delete(`/tenants/members/${userId}`),
    updateMemberRole: (userId, role) => api.put(`/tenants/members/${userId}/role`, { role }),
    getAll: (params) => api.get('/tenants', { params }),
};

export const documentService = {
    create: (data) => api.post('/documents', data),
    getAll: (params) => api.get('/documents', { params }),
    getById: (id) => api.get(`/documents/${id}`),
    update: (id, data) => api.put(`/documents/${id}`, data),
    delete: (id) => api.delete(`/documents/${id}`),
    share: (id, data) => api.post(`/documents/${id}/share`, data),
    generateShareLink: (id, data) => api.post(`/documents/${id}/share-link`, data),
    getVersions: (id) => api.get(`/documents/${id}/versions`),
    restoreVersion: (id, versionNumber) => api.put(`/documents/${id}/versions/${versionNumber}`),
};

export const productService = {
    create: (data) => api.post('/products', data),
    getAll: (params) => api.get('/products', { params }),
    getById: (id) => api.get(`/products/${id}`),
    update: (id, data) => api.put(`/products/${id}`, data),
    delete: (id) => api.delete(`/products/${id}`),
    getCategories: () => api.get('/products/categories'),
    checkInventory: (id) => api.get(`/products/${id}/inventory`),
};

export const orderService = {
    create: (data) => api.post('/orders', data),
    getAll: (params) => api.get('/orders', { params }),
    getById: (id) => api.get(`/orders/${id}`),
    updateStatus: (id, data) => api.put(`/orders/${id}/status`, data),
    cancel: (id, reason) => api.put(`/orders/${id}/cancel`, { reason }),
};

export const analyticsService = {
    trackEvent: (data) => api.post('/analytics/events', data),
    getDashboard: (params) => api.get('/analytics/dashboard', { params }),
    getRealtime: () => api.get('/analytics/realtime'),
    exportData: (params) => api.get('/analytics/export', { params, responseType: 'blob' }),
    getFunnel: (params) => api.get('/analytics/funnel', { params }),
};
