import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { notificationsAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    notificationsAPI.list()
      .then(r => setNotifications(r.data.notifications || []))
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, []);

  const markRead = async (id) => {
    await notificationsAPI.markRead(id).catch(() => {});
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    await Promise.all(unread.map(n => notificationsAPI.markRead(n.id).catch(() => {})));
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast.success('All marked as read');
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div>
      <div className="flex-between mb-6">
        <div>
          <h1 className="section-title" style={{ marginBottom: 4 }}>🔔 Notifications</h1>
          {unreadCount > 0 && <span className="badge badge-green">{unreadCount} unread</span>}
        </div>
        {unreadCount > 0 && (
          <button className="btn btn-secondary btn-sm" onClick={markAllRead}>
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="page-loader"><div className="spinner" /></div>
      ) : notifications.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Bell size={48} />
            <h3>No notifications</h3>
            <p>You're all caught up!</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {notifications.map(n => (
            <div
              key={n.id}
              className="card"
              style={{
                padding: '16px 20px',
                cursor: !n.read ? 'pointer' : 'default',
                borderColor: !n.read ? 'var(--green-600)' : undefined,
                background: !n.read ? 'rgba(45,164,78,0.04)' : undefined,
                transition: 'all 0.15s',
              }}
              onClick={() => !n.read && markRead(n.id)}
            >
              <div className="flex-between">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    background: 'rgba(45,164,78,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16
                  }}>
                    {n.type === 'stock' ? '📦' : n.type === 'payment' ? '💰' : n.type === 'milk' ? '🥛' : '🔔'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{n.title || 'Notification'}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{n.body || n.message}</div>
                    {n.created_at && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                        {new Date(n.created_at).toLocaleString('en-IN')}
                      </div>
                    )}
                  </div>
                </div>
                {!n.read && (
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green-500)', flexShrink: 0, marginTop: 6 }} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
