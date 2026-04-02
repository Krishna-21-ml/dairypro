import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Plus, Search, Edit, Trash2, Shield } from 'lucide-react';
import { usersAPI } from '../services/api';
import { useAuthStore } from '../store';

const EMPTY_FORM = { name: '', email: '', phone: '', role: 'agent', password: '', is_active: true, language: 'en' };

export default function UsersPage() {
  const { t } = useTranslation();
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async (p = 1) => {
    setLoading(true);
    try {
      const res = await usersAPI.list({ page: p, limit: 20, search: search || undefined, role: roleFilter || undefined });
      setUsers(res.data.items);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(page); }, [page, roleFilter]);
  useEffect(() => {
    const timer = setTimeout(() => { setPage(1); fetchUsers(1); }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const openAdd = () => { setEditUser(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = (user) => { setEditUser(user); setForm({ ...EMPTY_FORM, ...user, password: '' }); setShowModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editUser) {
        const { password, ...updateData } = form;
        await usersAPI.update(editUser.id, updateData);
        toast.success('User updated');
      } else {
        await usersAPI.create(form);
        toast.success('User created');
      }
      setShowModal(false);
      fetchUsers(page);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Operation failed');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (id === currentUser?.id) { toast.error("Can't delete yourself"); return; }
    if (!window.confirm('Delete this user?')) return;
    try {
      await usersAPI.delete(id);
      toast.success('User deleted');
      fetchUsers(page);
    } catch { toast.error('Delete failed'); }
  };

  const ROLE_BADGE = { admin: 'badge-purple', agent: 'badge-blue', farmer: 'badge-green' };
  const ROLE_ICON = { admin: '👑', agent: '🤝', farmer: '🌾' };

  return (
    <div>
      <div className="flex-between mb-6">
        <h1 className="section-title" style={{ marginBottom: 0 }}>👥 {t('users')}</h1>
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus size={16} /> Add User
        </button>
      </div>

      <div className="toolbar">
        <div className="search-input-wrap" style={{ flex: 1 }}>
          <Search size={16} />
          <input className="search-input" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ width: 140 }}>
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="agent">Agent</option>
          <option value="farmer">Farmer</option>
        </select>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{total} users</span>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Language</th>
                <th>Status</th>
                <th>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={7}><div className="empty-state"><p>No users found</p></div></td></tr>
              ) : users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--green-500), var(--green-700))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                        {u.name?.[0]?.toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 500 }}>{u.name}</span>
                      {u.id === currentUser?.id && <span className="badge badge-green" style={{ fontSize: 10 }}>You</span>}
                    </div>
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{u.email}</td>
                  <td className="mono">{u.phone || '—'}</td>
                  <td>
                    <span className={`badge ${ROLE_BADGE[u.role]}`}>
                      {ROLE_ICON[u.role]} {u.role}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-blue">{u.language?.toUpperCase() || 'EN'}</span>
                  </td>
                  <td>
                    <span className={`badge ${u.is_active ? 'badge-green' : 'badge-red'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="flex-gap">
                      <button className="btn btn-secondary btn-sm btn-icon" onClick={() => openEdit(u)}>
                        <Edit size={13} />
                      </button>
                      <button
                        className="btn btn-danger btn-sm btn-icon"
                        onClick={() => handleDelete(u.id)}
                        disabled={u.id === currentUser?.id}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pagination" style={{ padding: '12px 20px' }}>
          <span>Showing {users.length} of {total}</span>
          <div className="pagination-btns">
            <button className="page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>←</button>
            {Array.from({ length: Math.min(pages, 5) }, (_, i) => (
              <button key={i + 1} className={`page-btn ${page === i + 1 ? 'active' : ''}`} onClick={() => setPage(i + 1)}>{i + 1}</button>
            ))}
            <button className="page-btn" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>→</button>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">{editUser ? 'Edit User' : 'Add User'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} required disabled={!!editUser} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Phone</label>
                  <input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value}))}>
                    <option value="admin">👑 Admin</option>
                    <option value="agent">🤝 Agent</option>
                    <option value="farmer">🌾 Farmer</option>
                  </select>
                </div>
              </div>
              {!editUser && (
                <div className="form-group">
                  <label>Password *</label>
                  <input type="password" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} required minLength={6} />
                </div>
              )}
              <div className="form-row">
                <div className="form-group">
                  <label>Language</label>
                  <select value={form.language} onChange={e => setForm(f => ({...f, language: e.target.value}))}>
                    <option value="en">🇬🇧 English</option>
                    <option value="te">🇮🇳 Telugu</option>
                    <option value="ta">🇮🇳 Tamil</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={form.is_active ? 'true' : 'false'} onChange={e => setForm(f => ({...f, is_active: e.target.value === 'true'}))}>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>{t('cancel')}</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="spinner" /> : t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
