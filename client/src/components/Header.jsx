import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, Bell, Menu } from 'lucide-react';

export default function Header({ title, subtitle, onMenuClick }) {
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');

    return (
        <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-30">
            <div className="flex items-center gap-4">
                <button
                    onClick={onMenuClick}
                    className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                >
                    <Menu className="w-5 h-5" />
                </button>
                <div>
                    <h2 className="text-lg font-bold tracking-tight text-gray-900">{title}</h2>
                    {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
                </div>
            </div>

            <div className="flex items-center gap-3">
                {/* Search */}
                <div className="hidden md:flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-4 py-2 focus-within:border-primary/50 focus-within:bg-white focus-within:shadow-sm transition-all min-w-[240px]">
                    <Search className="w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent border-none outline-none text-sm text-gray-700 placeholder:text-gray-400 w-full"
                    />
                    <kbd className="hidden lg:inline-flex text-[10px] text-gray-400 border border-gray-200 rounded px-1.5 py-0.5 font-mono bg-white">⌘K</kbd>
                </div>

                {/* Notifications */}
                <button className="relative p-2.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full ring-2 ring-white" />
                </button>

                {/* User Avatar */}
                <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
                    <div className="w-8 h-8 bg-accent-gradient rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm">
                        {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="hidden sm:block">
                        <p className="text-sm font-medium text-gray-800">{user?.name}</p>
                        <p className="text-[10px] text-gray-400 capitalize">{user?.role || 'user'}</p>
                    </div>
                </div>
            </div>
        </header>
    );
}
