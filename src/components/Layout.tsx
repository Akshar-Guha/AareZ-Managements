import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { NAV_ITEMS } from '@/constants/nav';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react'; // Import useState
import { Menu, X } from 'lucide-react'; // Import icons for hamburger menu

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false); // State for mobile sidebar

  const { pathname } = useLocation();
  const title = NAV_ITEMS.find(i => pathname.startsWith(i.path))?.label || 'Dashboard';

  return (
    <div className="h-screen flex flex-col md:flex-row">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col 
                   ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
                   w-[var(--sidebar-width)] bg-white border-r border-slate-200 p-4 
                   transition-transform duration-300 ease-in-out md:translate-x-0 md:static`}
      >
        <div className="text-xl font-semibold mb-6">
          <div className="text-slate-900">Aarez HealthCare</div>
          <div className="text-xs text-slate-500 -mt-1">Management System</div>
        </div>
        <nav className="space-y-1 flex-1">
          {NAV_ITEMS.filter(item => {
            if (!user) return false;
            if (user.role === 'admin') return item.path !== '/mr'; // Admin sees everything except MR Dashboard
            if (user.role === 'mr') return item.path === '/mr';    // MR sees only MR Dashboard
            if (user.role === 'user') return item.path !== '/mr';  // 'user' sees everything except MR Dashboard
            return false;
          }).map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              onClick={() => setSidebarOpen(false)} // Close sidebar on navigation
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm ${
                  isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-100'
                }`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="border-t pt-3 text-sm text-slate-600">
          <div className="flex items-center justify-between">
            <span>{user?.name || 'Admin User'}</span>
            <button
              onClick={() => { logout().then(() => navigate('/login')); }}
              className="text-red-600 hover:underline"
            >
              Logout
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto bg-slate-50">
        <header className="h-14 border-b bg-white px-4 flex items-center justify-between shadow-sm md:px-6">
          <div className="flex items-center gap-4">
            <button 
              className="md:hidden p-1 rounded-md text-slate-600 hover:bg-slate-100"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu size={24} />
            </button>
            <div className="text-lg font-medium">{title}</div>
          </div>
          <div className="text-sm text-slate-500 hidden md:block">{user?.name || 'Admin User'}</div>
        </header>
        <div className="p-4 md:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
