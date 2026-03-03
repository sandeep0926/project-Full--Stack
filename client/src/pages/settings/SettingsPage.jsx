import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authService, tenantService } from '../../services/services';
import { Shield, Smartphone, Trash2, AlertTriangle, CheckCircle, Users, UserPlus, Crown } from 'lucide-react';

export default function SettingsPage() {
    const { user, fetchUser } = useAuth();
    const [activeTab, setActiveTab] = useState('security');
    const [devices, setDevices] = useState([]);
    const [mfaEnabled, setMfaEnabled] = useState(user?.mfaEnabled || false);
    const [backupCodes, setBackupCodes] = useState(null);
    const [tenant, setTenant] = useState(null);
    const [members, setMembers] = useState([]);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('member');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => { fetchDevices(); fetchTenant(); }, []);

    const fetchDevices = async () => { try { const { data } = await authService.getDevices(); setDevices(data.data.devices); } catch { } };
    const fetchTenant = async () => { try { const { data } = await tenantService.getCurrent(); setTenant(data.data.tenant); setMembers(data.data.tenant?.members || []); } catch { } };

    const toggleMFA = async () => {
        setLoading(true);
        try { const { data } = await authService.enableMFA(); setMfaEnabled(true); setBackupCodes(data.data.backupCodes); setMessage('MFA enabled!'); await fetchUser(); }
        catch (err) { setMessage(err.response?.data?.error?.message || 'Failed'); }
        finally { setLoading(false); }
    };

    const revokeDevice = async (deviceId) => {
        try { await authService.revokeDevice(deviceId); setDevices(devices.filter(d => d.deviceId !== deviceId)); setMessage('Device revoked'); } catch { }
    };

    const inviteMember = async () => {
        if (!inviteEmail) return;
        setLoading(true);
        try { await tenantService.inviteMember({ email: inviteEmail, role: inviteRole }); setMessage(`Invited ${inviteEmail}`); setInviteEmail(''); fetchTenant(); }
        catch (err) { setMessage(err.response?.data?.error?.message || 'Failed'); }
        finally { setLoading(false); }
    };

    const removeMember = async (userId) => {
        if (!confirm('Remove this member?')) return;
        try { await tenantService.removeMember(userId); fetchTenant(); setMessage('Member removed'); } catch { }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Settings</h1>
                <p className="text-sm text-gray-500 mt-1">Manage security and team settings</p>
            </div>

            {message && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> {message}
                    <button onClick={() => setMessage('')} className="ml-auto text-emerald-400 hover:text-emerald-600">✕</button>
                </div>
            )}

            <div className="flex gap-1 border-b border-gray-200">
                {['security', 'team', 'account'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2.5 text-sm font-medium capitalize transition-all ${activeTab === tab ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-gray-700'}`}>{tab}</button>
                ))}
            </div>

            {activeTab === 'security' && (
                <div className="space-y-6">
                    <div className="glass-card rounded-2xl p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center"><Shield className="w-5 h-5 text-primary" /></div>
                                <div><h3 className="text-base font-semibold text-gray-900">Two-Factor Authentication</h3><p className="text-xs text-gray-500">Add an extra layer of security</p></div>
                            </div>
                            <button onClick={toggleMFA} disabled={loading || mfaEnabled}
                                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${mfaEnabled ? 'bg-emerald-50 text-emerald-600' : 'bg-accent-gradient text-white hover:shadow-lg hover:shadow-primary/20'}`}>
                                {mfaEnabled ? '✓ Enabled' : 'Enable MFA'}
                            </button>
                        </div>
                        {backupCodes && (
                            <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-100">
                                <p className="text-sm font-semibold text-amber-700 mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Save your backup codes</p>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {backupCodes.map((code, i) => <code key={i} className="px-3 py-1.5 bg-white rounded-lg text-sm font-mono text-gray-700 text-center shadow-sm">{code}</code>)}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="glass-card rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-4"><Smartphone className="w-5 h-5 text-primary" /><h3 className="text-base font-semibold text-gray-900">Active Sessions</h3></div>
                        <div className="space-y-3">
                            {devices.length === 0 ? <p className="text-sm text-gray-400">No active sessions found</p> :
                                devices.map((device, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center gap-3"><Smartphone className="w-4 h-4 text-gray-400" /><div><p className="text-sm font-medium text-gray-800">{device.deviceName || 'Unknown Device'}</p><p className="text-xs text-gray-400">{device.ip} · {device.lastActive ? new Date(device.lastActive).toLocaleString() : 'N/A'}</p></div></div>
                                        <button onClick={() => revokeDevice(device.deviceId)} className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'team' && (
                <div className="space-y-6">
                    <div className="glass-card rounded-2xl p-6">
                        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2"><UserPlus className="w-5 h-5 text-primary" /> Invite Member</h3>
                        <div className="flex flex-wrap gap-3">
                            <input type="email" placeholder="Email address" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                                className="flex-1 min-w-[200px] px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all text-sm" />
                            <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
                                className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600 outline-none cursor-pointer">
                                <option value="member">Member</option><option value="admin">Admin</option><option value="viewer">Viewer</option>
                            </select>
                            <button onClick={inviteMember} disabled={loading} className="px-5 py-2.5 bg-accent-gradient text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50">Invite</button>
                        </div>
                    </div>
                    <div className="glass-card rounded-2xl p-6">
                        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Team Members ({members.length})</h3>
                        <div className="space-y-2">
                            {members.map((member, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-accent-gradient flex items-center justify-center text-sm font-bold text-white">{member.user?.name?.charAt(0) || '?'}</div>
                                        <div><p className="text-sm font-medium text-gray-800 flex items-center gap-1.5">{member.user?.name || 'Unknown'}{member.role === 'owner' && <Crown className="w-3.5 h-3.5 text-amber-500" />}</p><p className="text-xs text-gray-400">{member.user?.email}</p></div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-gray-500 capitalize px-2 py-1 rounded-lg bg-gray-50 border border-gray-200">{member.role}</span>
                                        {member.role !== 'owner' && ['admin', 'superadmin'].includes(user?.role) && (
                                            <button onClick={() => removeMember(member.user?._id || member.user)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'account' && (
                <div className="space-y-6">
                    <div className="glass-card rounded-2xl p-6">
                        <h3 className="text-base font-semibold text-gray-900 mb-4">Account Information</h3>
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-accent-gradient flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-primary/20">{user?.name?.charAt(0)?.toUpperCase()}</div>
                            <div>
                                <p className="text-lg font-bold text-gray-900">{user?.name}</p>
                                <p className="text-sm text-gray-500">{user?.email}</p>
                                <p className="text-xs text-gray-400 capitalize mt-0.5">Role: {user?.role} · Plan: {user?.subscription?.plan || 'free'}</p>
                            </div>
                        </div>
                    </div>
                    {tenant && (
                        <div className="glass-card rounded-2xl p-6">
                            <h3 className="text-base font-semibold text-gray-900 mb-4">Organization</h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between"><span className="text-gray-500">Name</span><span className="text-gray-800 font-medium">{tenant.name}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Plan</span><span className="text-gray-800 capitalize font-medium">{tenant.subscription?.plan}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Members</span><span className="text-gray-800 font-medium">{tenant.members?.length || 0}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Status</span><span className="text-emerald-600 text-xs font-semibold bg-emerald-50 px-2 py-0.5 rounded-full capitalize">{tenant.subscription?.status}</span></div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
