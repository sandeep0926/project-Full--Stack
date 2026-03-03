import { useState, useEffect, useRef } from 'react';
import { analyticsService } from '../../services/services';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { Download, TrendingUp, Eye, ShoppingCart, Zap } from 'lucide-react';

const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#14b8a6', '#f59e0b'];

export default function AnalyticsPage() {
    const [dashboard, setDashboard] = useState(null);
    const [realtime, setRealtime] = useState(null);
    const [funnel, setFunnel] = useState(null);
    const [period, setPeriod] = useState('30d');
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [exporting, setExporting] = useState(false);
    const intervalRef = useRef(null);

    useEffect(() => { fetchDashboard(); fetchFunnel(); startRealtime(); return () => { if (intervalRef.current) clearInterval(intervalRef.current); }; }, [period]);

    const fetchDashboard = async () => { try { const { data } = await analyticsService.getDashboard({ period }); setDashboard(data.data); } catch { } finally { setLoading(false); } };
    const fetchFunnel = async () => { try { const { data } = await analyticsService.getFunnel({ period }); setFunnel(data.data.funnel); } catch { }; };
    const startRealtime = () => {
        const fetch = async () => { try { const { data } = await analyticsService.getRealtime(); setRealtime(data.data); } catch { } };
        fetch(); intervalRef.current = setInterval(fetch, 10000);
    };
    const handleExport = async () => {
        setExporting(true);
        try { const response = await analyticsService.exportData({ format: 'csv', period }); const url = window.URL.createObjectURL(new Blob([response.data])); const link = document.createElement('a'); link.href = url; link.download = `analytics_${period}.csv`; link.click(); window.URL.revokeObjectURL(url); }
        catch { } finally { setExporting(false); }
    };

    const funnelStages = [
        { name: 'Page Views', key: 'page_view', icon: Eye },
        { name: 'Product Views', key: 'product_view', icon: ShoppingCart },
        { name: 'Add to Cart', key: 'add_to_cart', icon: ShoppingCart },
        { name: 'Checkout', key: 'checkout_start', icon: Zap },
        { name: 'Purchase', key: 'purchase', icon: TrendingUp },
    ];

    if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-10 h-10 border-3 border-gray-200 border-t-primary rounded-full animate-spin" /></div>;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Analytics</h1>
                    <p className="text-sm text-gray-500 mt-1">Real-time insights and data</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
                        {['7d', '30d', '90d'].map(p => (
                            <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${period === p ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                {p === '7d' ? '7D' : p === '30d' ? '30D' : '90D'}
                            </button>
                        ))}
                    </div>
                    <button onClick={handleExport} disabled={exporting} className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50 shadow-sm">
                        <Download className={`w-4 h-4 ${exporting ? 'animate-bounce' : ''}`} /> Export CSV
                    </button>
                </div>
            </div>

            <div className="flex gap-1 border-b border-gray-200 pb-1">
                {['overview', 'realtime', 'funnel'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all capitalize ${activeTab === tab ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-gray-700'}`}>
                        {tab === 'realtime' ? 'Real-Time' : tab}
                    </button>
                ))}
            </div>

            {activeTab === 'overview' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="glass-card rounded-2xl p-6">
                            <h3 className="text-base font-semibold text-gray-900 mb-1">Events Over Time</h3>
                            <p className="text-xs text-gray-500 mb-4">Daily event count</p>
                            <div className="h-[260px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={dashboard?.dailyEvents || []}>
                                        <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} /></linearGradient></defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f4" />
                                        <XAxis dataKey="_id" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
                                        <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                                        <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} fill="url(#ag)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="glass-card rounded-2xl p-6">
                            <h3 className="text-base font-semibold text-gray-900 mb-1">Event Types</h3>
                            <p className="text-xs text-gray-500 mb-4">Activity breakdown</p>
                            <div className="h-[260px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dashboard?.userActivity || []} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f4" />
                                        <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
                                        <YAxis type="category" dataKey="_id" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} width={100} />
                                        <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                                        <Bar dataKey="count" fill="#6366f1" radius={[0, 6, 6, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="glass-card rounded-2xl p-6">
                            <h3 className="text-base font-semibold text-gray-900 mb-4">Top Pages</h3>
                            <div className="space-y-3">
                                {(dashboard?.topPages || []).map((page, i) => {
                                    const max = Math.max(...(dashboard?.topPages || []).map(p => p.views));
                                    return (<div key={i}><div className="flex justify-between mb-1"><span className="text-sm text-gray-700">{page._id || 'Unknown'}</span><span className="text-xs font-semibold text-gray-500">{page.views}</span></div><div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-primary to-secondary" style={{ width: `${(page.views / max) * 100}%` }} /></div></div>);
                                })}
                            </div>
                        </div>
                        <div className="glass-card rounded-2xl p-6">
                            <h3 className="text-base font-semibold text-gray-900 mb-4">Device Breakdown</h3>
                            <div className="h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={dashboard?.deviceBreakdown || []} cx="50%" cy="50%" innerRadius={55} outerRadius={78} dataKey="count" nameKey="_id" strokeWidth={2} stroke="#fff">
                                            {(dashboard?.deviceBreakdown || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex justify-center gap-4 mt-2">
                                {(dashboard?.deviceBreakdown || []).map((d, i) => (
                                    <div key={i} className="flex items-center gap-1.5 text-xs text-gray-500"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} /><span className="capitalize">{d._id || 'Unknown'}</span></div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'realtime' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="glass-card rounded-2xl p-6 border-2 border-primary/20 animate-pulse-glow">
                            <div className="flex items-center gap-3 mb-3"><div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse" /><span className="text-sm font-medium text-gray-500">Active Now</span></div>
                            <p className="text-4xl font-extrabold gradient-text">{realtime?.activeUsers || 0}</p>
                            <p className="text-xs text-gray-400 mt-1">users in last 5 minutes</p>
                        </div>
                        <div className="glass-card rounded-2xl p-6">
                            <span className="text-sm font-medium text-gray-500">Recent Events</span>
                            <p className="text-4xl font-extrabold gradient-text mt-2">{realtime?.recentEvents?.length || 0}</p>
                            <p className="text-xs text-gray-400 mt-1">events in last 5 minutes</p>
                        </div>
                    </div>
                    <div className="glass-card rounded-2xl p-6">
                        <h3 className="text-base font-semibold text-gray-900 mb-4">Live Event Feed</h3>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                            {(realtime?.recentEvents || []).map((event, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-primary animate-pulse" /><div><p className="text-sm font-medium text-gray-800 capitalize">{event.eventType?.replace(/_/g, ' ')}</p><p className="text-xs text-gray-400">{event.page || 'N/A'}</p></div></div>
                                    <span className="text-xs text-gray-400">{new Date(event.createdAt).toLocaleTimeString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'funnel' && (
                <div className="glass-card rounded-2xl p-6">
                    <h3 className="text-base font-semibold text-gray-900 mb-6">Conversion Funnel</h3>
                    <div className="space-y-4">
                        {funnelStages.map((stage, i) => {
                            const data = funnel?.find(f => f._id === stage.key);
                            const count = data?.count || 0;
                            const maxCount = Math.max(...(funnel || []).map(f => f.count || 0), 1);
                            const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                            const prev = i > 0 ? funnel?.find(f => f._id === funnelStages[i - 1].key) : null;
                            const convRate = prev?.count > 0 ? ((count / prev.count) * 100).toFixed(1) : '100';
                            return (
                                <div key={stage.key} className="animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2"><stage.icon className="w-4 h-4 text-primary" /><span className="text-sm font-medium text-gray-800">{stage.name}</span></div>
                                        <div className="flex items-center gap-3"><span className="text-sm font-bold text-gray-900">{count.toLocaleString()}</span>{i > 0 && <span className="text-xs text-gray-400">{convRate}% conv.</span>}</div>
                                    </div>
                                    <div className="h-8 bg-gray-100 rounded-xl overflow-hidden"><div className="h-full rounded-xl bg-gradient-to-r from-primary to-secondary transition-all duration-700" style={{ width: `${pct}%` }} /></div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
