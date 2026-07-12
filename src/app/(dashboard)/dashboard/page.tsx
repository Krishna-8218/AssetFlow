'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Package,
  Users,
  Wrench,
  CalendarDays,
  ArrowLeftRight,
  Clock,
  AlertTriangle,
  Database,
  PlusCircle,
  CalendarRange
} from 'lucide-react';
import { useAuth } from '../layout';
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { formatDistanceToNow, format } from 'date-fns';

const COLORS = ['#6366f1', '#10b981', '#fbbf24', '#f87171', '#3b82f6', '#8b5cf6', '#64748b'];

interface DashboardData {
  stats: {
    assetsAvailable: number;
    assetsAllocated: number;
    maintenanceToday: number;
    activeBookings: number;
    pendingTransfers: number;
    upcomingReturns: number;
    overdueReturns: number;
    totalAssets: number;
  };
  recentActivity: any[];
  overdueAllocations: any[];
  upcomingBookings: any[];
  assetsByStatus: any[];
  assetsByDepartment: any[];
  assetsByCategory: any[];
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch('/api/dashboard');
        if (res.ok) {
          const d = await res.json();
          setData(d);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ height: '40px', width: '250px' }} className="skeleton" />
        <div className="grid grid-cols-4 gap-md">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="skeleton skeleton-card" style={{ height: '110px' }} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-lg mt-4">
          <div className="skeleton" style={{ height: '350px' }} />
          <div className="skeleton" style={{ height: '350px' }} />
        </div>
      </div>
    );
  }

  if (!data) return <div className="empty-state">Failed to load dashboard.</div>;

  const { stats, recentActivity, overdueAllocations, upcomingBookings, assetsByStatus, assetsByDepartment, assetsByCategory } = data;

  const canQuickActionRegister = user?.role === 'ADMIN' || user?.role === 'ASSET_MANAGER';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Welcome Area */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '24px' }}>Welcome back, {user?.name}</h1>
          <p className="page-subtitle">Here is what is happening with your organization's assets today.</p>
        </div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', background: 'var(--bg-secondary)', padding: '8px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          {format(new Date(), 'EEEE, MMMM dd, yyyy')}
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-4 gap-md">
        <div className="stat-card" style={{ '--accent-color': 'var(--success)' } as React.CSSProperties}>
          <div className="stat-card-info">
            <span className="stat-card-value">{stats.assetsAvailable}</span>
            <span className="stat-card-label">Assets Available</span>
          </div>
          <div className="stat-card-icon">
            <Package size={22} />
          </div>
        </div>

        <div className="stat-card" style={{ '--accent-color': 'var(--info)' } as React.CSSProperties}>
          <div className="stat-card-info">
            <span className="stat-card-value">{stats.assetsAllocated}</span>
            <span className="stat-card-label">Assets Allocated</span>
          </div>
          <div className="stat-card-icon">
            <Users size={22} />
          </div>
        </div>

        <div className="stat-card" style={{ '--accent-color': 'var(--warning)' } as React.CSSProperties}>
          <div className="stat-card-info">
            <span className="stat-card-value">{stats.maintenanceToday}</span>
            <span className="stat-card-label">Active Repairs</span>
          </div>
          <div className="stat-card-icon">
            <Wrench size={22} />
          </div>
        </div>

        <div className="stat-card" style={{ '--accent-color': 'var(--secondary)' } as React.CSSProperties}>
          <div className="stat-card-info">
            <span className="stat-card-value">{stats.activeBookings}</span>
            <span className="stat-card-label">Ongoing Bookings</span>
          </div>
          <div className="stat-card-icon">
            <CalendarDays size={22} />
          </div>
        </div>

        <div className="stat-card" style={{ '--accent-color': 'var(--neutral)' } as React.CSSProperties}>
          <div className="stat-card-info">
            <span className="stat-card-value">{stats.pendingTransfers}</span>
            <span className="stat-card-label">Pending Transfers</span>
          </div>
          <div className="stat-card-icon">
            <ArrowLeftRight size={22} />
          </div>
        </div>

        <div className="stat-card" style={{ '--accent-color': 'var(--info)' } as React.CSSProperties}>
          <div className="stat-card-info">
            <span className="stat-card-value">{stats.upcomingReturns}</span>
            <span className="stat-card-label">Upcoming Returns</span>
          </div>
          <div className="stat-card-icon">
            <Clock size={22} />
          </div>
        </div>

        <div className="stat-card" style={{ '--accent-color': 'var(--danger)' } as React.CSSProperties}>
          <div className="stat-card-info">
            <span className="stat-card-value" style={{ color: stats.overdueReturns > 0 ? 'var(--danger)' : 'inherit' }}>
              {stats.overdueReturns}
            </span>
            <span className="stat-card-label">Overdue Returns</span>
            {stats.overdueReturns > 0 && (
              <span className="stat-card-trend" style={{ color: 'var(--danger)' }}>
                <AlertTriangle size={12} /> Needs attention
              </span>
            )}
          </div>
          <div className="stat-card-icon" style={{ background: stats.overdueReturns > 0 ? 'var(--danger-bg)' : 'var(--bg-tertiary)' }}>
            <AlertTriangle size={22} style={{ color: stats.overdueReturns > 0 ? 'var(--danger)' : 'var(--text-muted)' }} />
          </div>
        </div>

        <div className="stat-card" style={{ '--accent-color': 'var(--primary)' } as React.CSSProperties}>
          <div className="stat-card-info">
            <span className="stat-card-value">{stats.totalAssets}</span>
            <span className="stat-card-label">Total Assets</span>
          </div>
          <div className="stat-card-icon">
            <Database size={22} />
          </div>
        </div>
      </div>

      {/* Quick Actions Row */}
      <div className="card p-4">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ fontWeight: 600, fontSize: '15px' }}>Quick Actions:</div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {canQuickActionRegister && (
              <Link href="/assets" style={{ textDecoration: 'none' }}>
                <button className="btn btn-primary btn-sm">
                  <PlusCircle size={16} /> Register Asset
                </button>
              </Link>
            )}
            <Link href="/booking" style={{ textDecoration: 'none' }}>
              <button className="btn btn-secondary btn-sm">
                <CalendarRange size={16} /> Book Resource
              </button>
            </Link>
            <Link href="/maintenance" style={{ textDecoration: 'none' }}>
              <button className="btn btn-outline btn-sm">
                <Wrench size={16} /> Raise Maintenance Request
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Overdue Warning Alert Box (Sticky if overdue returns exist) */}
      {overdueAllocations.length > 0 && (
        <div className="card" style={{ borderLeft: '6px solid var(--danger)', background: 'var(--danger-bg)' }}>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger)', fontWeight: 700 }}>
              <AlertTriangle size={18} /> Overdue Returns Flagged for Immediate Action
            </div>
            <div className="table-container">
              <table className="table" style={{ background: 'transparent' }}>
                <thead>
                  <tr>
                    <th>Asset Tag</th>
                    <th>Asset Name</th>
                    <th>Currently Held By</th>
                    <th>Expected Return Date</th>
                  </tr>
                </thead>
                <tbody>
                  {overdueAllocations.map((alloc) => (
                    <tr key={alloc.id}>
                      <td style={{ fontWeight: 600, color: 'var(--danger)' }}>{alloc.asset.assetTag}</td>
                      <td>{alloc.asset.name}</td>
                      <td>{alloc.allocatedTo.name}</td>
                      <td>{format(new Date(alloc.expectedReturnDate), 'MMM dd, yyyy')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Chart Section */}
      <div className="grid grid-cols-2 gap-lg">
        
        {/* Chart 1: Status */}
        <div className="card">
          <div className="card-header">
            <h3 className="section-title" style={{ marginBottom: 0 }}>Asset Lifecycle Status Distribution</h3>
          </div>
          <div className="card-body">
            {assetsByStatus.length === 0 ? (
              <div className="empty-state" style={{ height: '300px' }}>No active assets.</div>
            ) : (
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={assetsByStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {assetsByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Department Allocation */}
        <div className="card">
          <div className="card-header">
            <h3 className="section-title" style={{ marginBottom: 0 }}>Asset Count by Department</h3>
          </div>
          <div className="card-body">
            {assetsByDepartment.length === 0 ? (
              <div className="empty-state" style={{ height: '300px' }}>No assets allocated to departments.</div>
            ) : (
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={assetsByDepartment}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Recent activity and Upcoming Bookings */}
      <div className="grid grid-cols-2 gap-lg">
        
        {/* Timelines of Activity Logs */}
        <div className="card">
          <div className="card-header">
            <h3 className="section-title" style={{ marginBottom: 0 }}>Recent Activity Log</h3>
          </div>
          <div className="card-body">
            {recentActivity.length === 0 ? (
              <div className="empty-state">No activities recorded.</div>
            ) : (
              <div className="timeline">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="timeline-item">
                    <div className="timeline-item-header">
                      <div className="timeline-item-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700 }}>{activity.user.name}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({activity.role.replace('_', ' ')})</span>
                      </div>
                      <span className="timeline-item-date">
                        {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="timeline-item-desc" style={{ marginTop: '4px' }}>
                      {activity.action} - <span style={{ color: 'var(--primary)', fontWeight: 500 }}>{activity.entityType}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Upcoming bookings list */}
        <div className="card">
          <div className="card-header">
            <h3 className="section-title" style={{ marginBottom: 0 }}>Upcoming Resource Bookings</h3>
          </div>
          <div className="card-body">
            {upcomingBookings.length === 0 ? (
              <div className="empty-state" style={{ padding: '32px' }}>
                <span className="empty-state-icon"><CalendarDays size={24} /></span>
                <div className="empty-state-title">No Bookings Scheduled</div>
                <div className="empty-state-desc">There are no upcoming bookings for shared vehicles or rooms.</div>
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Resource</th>
                      <th>Booked By</th>
                      <th>Time Slot</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingBookings.map((booking) => (
                      <tr key={booking.id}>
                        <td style={{ fontWeight: 600 }}>{booking.asset.name}</td>
                        <td>{booking.bookedBy.name}</td>
                        <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {format(new Date(booking.startTime), 'MMM dd, HH:mm')} - {format(new Date(booking.endTime), 'HH:mm')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
