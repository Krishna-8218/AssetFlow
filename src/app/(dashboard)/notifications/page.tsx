'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Check, Eye, Trash2, MailOpen, AlertTriangle, CalendarDays, Wrench, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../layout';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationCenterPage() {
  const { refreshUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) setNotifications(await res.json());
    } catch (e) {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id })
      });
      if (res.ok) {
        setNotifications(prev => 
          prev.map(n => n.id === id ? { ...n, isRead: true } : n)
        );
        refreshUser(); // Updates bell unread count in layout
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true })
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        toast.success('All notifications marked as read');
        refreshUser();
      }
    } catch (e) {
      toast.error('Operation failed');
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'OVERDUE_RETURN':
      case 'DISCREPANCY_DETECTED':
        return <AlertTriangle size={18} style={{ color: 'var(--danger)' }} />;
      case 'BOOKING_CONFIRMED':
      case 'BOOKING_REMINDER':
        return <CalendarDays size={18} style={{ color: 'var(--secondary)' }} />;
      case 'MAINTENANCE_APPROVED':
      case 'MAINTENANCE_COMPLETED':
        return <Wrench size={18} style={{ color: 'var(--warning)' }} />;
      case 'ASSET_ASSIGNED':
      case 'TRANSFER_APPROVED':
        return <Check size={18} style={{ color: 'var(--success)' }} />;
      default:
        return <Bell size={18} style={{ color: 'var(--primary)' }} />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px', margin: 'auto' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Notification Center</h1>
          <p className="page-subtitle">Stay informed about your asset allocations, transfer approvals, and system schedules.</p>
        </div>
        {notifications.some(n => !n.isRead) && (
          <button className="btn btn-secondary btn-sm" onClick={handleMarkAllAsRead}>
            <MailOpen size={14} /> Mark all read
          </button>
        )}
      </div>

      {/* Notifications list */}
      <div className="card">
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}><div className="spinner" style={{ margin: 'auto' }} /></div>
          ) : notifications.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <span className="empty-state-icon"><Bell size={24} /></span>
              <div className="empty-state-title">No notifications</div>
              <div className="empty-state-desc">You are all caught up! There are no alert cards in your ledger.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {notifications.map((n) => (
                <div 
                  key={n.id} 
                  className="card p-4 animate-fadeIn" 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    borderLeft: `4px solid ${n.isRead ? 'var(--border-color)' : 'var(--primary)'}`,
                    background: n.isRead ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
                    opacity: n.isRead ? 0.8 : 1
                  }}
                >
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ background: 'var(--bg-secondary)', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                      {getAlertIcon(n.type)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>{n.title}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>{n.message}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </div>
                    </div>
                  </div>

                  {!n.isRead && (
                    <button 
                      className="btn btn-ghost btn-icon btn-sm" 
                      style={{ border: 'none' }} 
                      onClick={() => handleMarkAsRead(n.id)} 
                      title="Mark as Read"
                    >
                      <Check size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
