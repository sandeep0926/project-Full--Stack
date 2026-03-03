import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex min-h-screen bg-surface">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div className="flex-1 lg:ml-[260px] min-h-screen">
                <Header onMenuClick={() => setSidebarOpen(true)} />
                <main className="p-6 max-w-[1440px]">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
