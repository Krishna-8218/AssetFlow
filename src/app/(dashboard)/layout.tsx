'use client';

import React, { useState, useEffect, createContext, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Building2,
  Package,
  ArrowLeftRight,
  CalendarDays,
  Wrench,
  ClipboardCheck,
  BarChart3,
  History,
  Bell,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  ChevronDown
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { NAV_ITEMS, ROLE_LABELS, ROLE_COLORS } from '@/lib/constants';

interface UserSession {
  userId: string;
  email: string;
  name: string;
  role: string;
  departmentId?: string | null;
}

interface AuthContextType {
  user: UserSession | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
  refreshUser: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'session' }),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        router.push('/login');
      }
    } catch (err) {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
    
    // Load theme
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.body.setAttribute('data-theme', savedTheme);
    } else {
      document.body.setAttribute('data-theme', 'light');
    }
  }, [router]);

  // Fetch unread notifications count
  useEffect(() => {
    if (!user) return;
    async function fetchUnreadCount() {
      try {
        const res = await fetch('/api/notifications?count=true');
        if (res.ok) {
          const data = await res.json();
          setUnreadNotifications(data.count);
        }
      } catch (err) {
        // Silent error
      }
    }
    fetchUnreadCount();
    // Poll every 30s
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    document.body.setAttribute('data-theme', nextTheme);
    toast.success(`Switched to ${nextTheme} mode`);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
      toast.success('Logged out successfully');
      router.push('/login');
      router.refresh();
    } catch (err) {
      toast.error('Logout failed');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div className="spinner" style={{ width: '40px', height: '40px' }} />
          <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Initializing AssetFlow session...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // Filter navigation items by role
  const allowedNavItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(user.role)
  );

  const getIconComponent = (name: string) => {
    switch (name) {
      case 'LayoutDashboard': return <LayoutDashboard size={18} />;
      case 'Building2': return <Building2 size={18} />;
      case 'Package': return <Package size={18} />;
      case 'ArrowLeftRight': return <ArrowLeftRight size={18} />;
      case 'CalendarDays': return <CalendarDays size={18} />;
      case 'Wrench': return <Wrench size={18} />;
      case 'ClipboardCheck': return <ClipboardCheck size={18} />;
      case 'BarChart3': return <BarChart3 size={18} />;
      case 'History': return <History size={18} />;
      case 'Bell': return <Bell size={18} />;
      default: return <Package size={18} />;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout: handleLogout, refreshUser: fetchSession }}>
      <div className="app-layout">
        <Toaster position="top-right" />
        
        {/* Sidebar Nav */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <div className="logo-text">
              <span>AF</span> AssetFlow
            </div>
            <button
              className="btn btn-ghost btn-sm"
              style={{ marginLeft: 'auto', display: 'none' }}
              onClick={() => setSidebarOpen(false)}
            >
              <X size={18} />
            </button>
          </div>
          
          <nav className="sidebar-nav">
            {allowedNavItems.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-nav-item ${active ? 'active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  {getIconComponent(item.icon)}
                  {item.label}
                  {item.label === 'Notifications' && unreadNotifications > 0 && (
                    <span className="badge badge-danger" style={{ marginLeft: 'auto', padding: '2px 8px', fontSize: '10px' }}>
                      {unreadNotifications}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
          
          <div className="sidebar-footer">
            <div className="avatar">
              {user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </div>
            <div className="user-info">
              <div className="user-name">{user.name}</div>
              <span className={`badge badge-${ROLE_COLORS[user.role]}`} style={{ padding: '2px 6px', fontSize: '9px', textTransform: 'uppercase' }}>
                {ROLE_LABELS[user.role]}
              </span>
            </div>
            <button className="btn btn-ghost btn-icon btn-sm" style={{ border: 'none' }} onClick={handleLogout} title="Sign Out">
              <LogOut size={16} />
            </button>
          </div>
        </aside>

        {/* Top Header */}
        <header className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              className="btn btn-icon btn-sm"
              style={{ display: 'none', border: 'none' }}
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu size={20} />
            </button>
            <div>
              <div className="page-title" style={{ fontSize: '18px', marginBottom: 0 }}>
                {pathname === '/dashboard' && 'Operations Dashboard'}
                {pathname.startsWith('/organization') && 'Organization Setup'}
                {pathname.startsWith('/assets') && 'Asset Management'}
                {pathname.startsWith('/allocation') && 'Allocation & Transfers'}
                {pathname.startsWith('/booking') && 'Resource Booking'}
                {pathname.startsWith('/maintenance') && 'Maintenance & Repairs'}
                {pathname.startsWith('/audit') && 'Asset Auditing'}
                {pathname.startsWith('/reports') && 'Reports & Analytics'}
                {pathname.startsWith('/activity') && 'Audit Log Trail'}
                {pathname.startsWith('/notifications') && 'Notification Center'}
              </div>
            </div>
          </div>

          <div className="header-actions">
            {/* Theme toggle */}
            <button className="btn btn-icon btn-sm" style={{ border: 'none' }} onClick={toggleTheme}>
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            {/* Notification center shortcut */}
            <div className="icon-btn-container">
              <Link href="/notifications" className="btn btn-icon btn-sm" style={{ border: 'none' }}>
                <Bell size={18} />
                {unreadNotifications > 0 && (
                  <span className="notification-badge">{unreadNotifications}</span>
                )}
              </Link>
            </div>

            {/* User Profile dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                className="btn btn-ghost"
                style={{ gap: '8px', padding: '6px 12px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              >
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{user.name}</span>
                <ChevronDown size={14} />
              </button>
              
              {profileDropdownOpen && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setProfileDropdownOpen(false)} />
                  <div className="card" style={{
                    position: 'absolute',
                    right: 0,
                    top: '46px',
                    width: '200px',
                    zIndex: 999,
                    boxShadow: 'var(--shadow-lg)'
                  }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Logged in as</div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', wordBreak: 'break-all' }}>{user.email}</div>
                    </div>
                    <Link
                      href="/notifications"
                      className="sidebar-nav-item"
                      style={{ borderRadius: 0, padding: '10px 16px', fontSize: '13px' }}
                      onClick={() => setProfileDropdownOpen(false)}
                    >
                      Notifications
                    </Link>
                    <button
                      className="sidebar-nav-item"
                      style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', borderRadius: 0, padding: '10px 16px', fontSize: '13px' }}
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        handleLogout();
                      }}
                    >
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="main-content">
          {children}
        </main>
      </div>

      <style jsx global>{`
        /* Display sidebar toggles on tablet/mobile screens */
        @media (max-width: 1024px) {
          .header button[style*="display: none"] {
            display: flex !important;
          }
          .sidebar button[style*="display: none"] {
            display: flex !important;
          }
        }
      `}</style>
    </AuthContext.Provider>
  );
}
