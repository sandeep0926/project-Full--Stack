import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { analyticsService, tenantService } from '../../services/services';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, Users, DollarSign, Eye, Activity } from 'lucide-react';

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#14b8a6', '#f59e0b', '#ef4444', '#3b82f6'];

export default function DashboardPage() {
    const { user } = useAuth();
    const [analytics, setAnalytics] = useState(null);
    const [period, setPeriod] = useState('7d');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [analyticsRes] = await Promise.allSettled([
                    analyticsService.getDashboard({ period }),
                ]);
                if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value.data.data);
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        };
        fetchData();
    }, [period]);

    const stats = [
        { label: 'Total Events', value: analytics?.overview?.totalEvents?.toLocaleString() || '0', change: '+12.5%', positive: true, icon: Activity, color: 'bg-indigo-50 text-indigo-600' },
        { label: 'Unique Users', value: analytics?.overview?.uniqueUsers?.toLocaleString() || '0', change: '+8.2%', positive: true, icon: Users, color: 'bg-emerald-50 text-emerald-600' },
        { label: 'Revenue', value: `$${(analytics?.overview?.totalRevenue || 0).toFixed(2)}`, change: '+23.1%', positive: true, icon: DollarSign, color: 'bg-amber-50 text-amber-600' },
        { label: 'Page Views', value: analytics?.topPages?.reduce((a, p) => a + p.views, 0)?.toLocaleString() || '0', change: '-2.4%', positive: false, icon: Eye, color: 'bg-pink-50 text-pink-600' },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-10 h-10 border-3 border-gray-200 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Welcome */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
                        Welcome back, <span className="gradient-text">{user?.name?.split(' ')[0]}</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Here's what's happening across your platform</p>
                </div>
                <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
                    {['7d', '30d', '90d'].map((p) => (
                        <button key={p} onClick={() => setPeriod(p)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${period === p ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}>
                            {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => (
                    <div key={stat.label}
                        className="glass-card rounded-2xl p-5 group hover:-translate-y-1 hover:shadow-lg hover:shadow-gray-200/60 transition-all duration-300">
                        <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mb-3`}>
                            <stat.icon className="w-5 h-5" />
                        </div>
                        <p className="text-2xl font-extrabold tracking-tight text-gray-900">{stat.value}</p>
                        <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
                        <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${stat.positive ? 'text-emerald-600' : 'text-red-500'}`}>
                            {stat.positive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                            {stat.change}
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 glass-card rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-base font-semibold text-gray-900">Activity Overview</h3>
                            <p className="text-xs text-gray-500 mt-0.5">Events over time</p>
                        </div>
                    </div>
                    <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={analytics?.dailyEvents || []}>
                                <defs>
                                    <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f4" />
                                <XAxis dataKey="_id" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', fontSize: '12px', color: '#1e293b', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                                <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} fill="url(#colorEvents)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Device Breakdown */}
                <div className="glass-card rounded-2xl p-6">
                    <h3 className="text-base font-semibold text-gray-900 mb-1">Devices</h3>
                    <p className="text-xs text-gray-500 mb-6">Traffic by device type</p>
                    <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={analytics?.deviceBreakdown || []} cx="50%" cy="50%" innerRadius={55} outerRadius={75} dataKey="count" nameKey="_id" strokeWidth={2} stroke="#fff">
                                    {(analytics?.deviceBreakdown || []).map((_, i) => (
                                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', fontSize: '12px', color: '#1e293b', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="space-y-2 mt-2">
                        {(analytics?.deviceBreakdown || []).map((d, i) => (
                            <div key={d._id} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i] }} />
                                    <span className="text-gray-600 capitalize">{d._id || 'Unknown'}</span>
                                </div>
                                <span className="font-semibold text-gray-800">{d.count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="glass-card rounded-2xl p-6">
                    <h3 className="text-base font-semibold text-gray-900 mb-1">Revenue</h3>
                    <p className="text-xs text-gray-500 mb-6">Daily revenue trend</p>
                    <div className="h-[240px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics?.revenueData || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f4" />
                                <XAxis dataKey="_id" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', fontSize: '12px', color: '#1e293b', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                                <Bar dataKey="revenue" fill="#6366f1" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass-card rounded-2xl p-6">
                    <h3 className="text-base font-semibold text-gray-900 mb-1">Top Pages</h3>
                    <p className="text-xs text-gray-500 mb-6">Most visited pages</p>
                    <div className="space-y-3">
                        {(analytics?.topPages || []).slice(0, 8).map((page, i) => {
                            const maxViews = Math.max(...(analytics?.topPages || []).map(p => p.views));
                            const pct = maxViews > 0 ? (page.views / maxViews) * 100 : 0;
                            return (
                                <div key={page._id || i}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm text-gray-700 truncate mr-4">{page._id || 'Unknown'}</span>
                                        <span className="text-xs font-semibold text-gray-500">{page.views}</span>
                                    </div>
                                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500" style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
