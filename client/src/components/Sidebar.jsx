import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard, FileText, ShoppingCart, BarChart3, Shield,
    Users, Settings, LogOut, Package, ClipboardList,
    Zap, CreditCard
} from 'lucide-react';

const navItems = [
    {
        section: 'Overview', items: [
            { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        ]
    },
    {
        section: 'Projects', items: [
            { to: '/collaboration', icon: FileText, label: 'Documents', badge: 'Live' },
            { to: '/ecommerce/products', icon: Package, label: 'Products' },
            { to: '/ecommerce/orders', icon: ClipboardList, label: 'Orders' },
            { to: '/analytics', icon: BarChart3, label: 'Analytics' },
        ]
    },
    {
        section: 'Admin', items: [
            { to: '/settings/team', icon: Users, label: 'Team', roles: ['admin', 'superadmin'] },
            { to: '/settings/security', icon: Shield, label: 'Security', roles: ['admin', 'superadmin'] },
            { to: '/settings/billing', icon: CreditCard, label: 'Billing', roles: ['admin', 'superadmin'] },
            { to: '/settings', icon: Settings, label: 'Settings', roles: ['admin', 'superadmin'] },
        ]
    },
];

export default function Sidebar({ isOpen, onClose }) {
    const { user, logout } = useAuth();

    return (
        <>
            {isOpen && (
                <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={onClose} />
            )}

            <aside className={`fixed top-0 left-0 bottom-0 w-[260px] bg-white border-r border-gray-200 flex flex-col z-50 transition-transform duration-300 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                {/* Logo */}
                <div className="px-5 py-5 flex items-center gap-3 border-b border-gray-100">
                    <div className="w-9 h-9 bg-accent-gradient rounded-xl flex items-center justify-center shadow-md shadow-primary/20">
                        <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-[15px] font-bold tracking-tight text-gray-900">Enterprise</h1>
                        <p className="text-[10px] text-gray-400 font-medium">Full Stack Platform</p>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 overflow-y-auto">
                    {navItems.map((section) => (
                        (() => {
                            const visibleItems = section.items.filter(
                                (item) => !item.roles || item.roles.includes(user?.role)
                            );
                            if (visibleItems.length === 0) return null;
                            return (
                                <div key={section.section} className="mb-6">
                                    <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                                        {section.section}
                                    </p>
                                    {visibleItems.map((item) => (
                                        <NavLink
                                            key={item.to}
                                            to={item.to}
                                            onClick={onClose}
                                            className={({ isActive }) =>
                                                `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                                                    isActive
                                                        ? 'bg-primary/8 text-primary shadow-sm'
                                                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                                                }`
                                            }
                                        >
                                            <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                                            <span>{item.label}</span>
                                            {item.badge && (
                                                <span className="ml-auto text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">
                                                    {item.badge}
                                                </span>
                                            )}
                                        </NavLink>
                                    ))}
                                </div>
                            );
                        })()
                    ))}
                </nav>

                {/* User Profile */}
                <div className="p-3 border-t border-gray-100">
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group">
                        <div className="w-8 h-8 bg-accent-gradient rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm">
                            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{user?.name || 'User'}</p>
                            <p className="text-[11px] text-gray-400 truncate">{user?.email}</p>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); logout(); }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                            title="Logout"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}
