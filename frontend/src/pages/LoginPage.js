import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';
import { useAuthStore } from '../store';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authAPI.login(form.email, form.password);
      login(res.data.user, res.data.access_token);
      toast.success(`Welcome back, ${res.data.user.name}!`);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg-pattern" />
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">🐄</div>
          <h1 className="login-title">DairyPro</h1>
          <p className="login-subtitle">Dairy Management System</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label>{t('email')}</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="admin@dairy.com"
              required
            />
          </div>

          <div className="form-group">
            <label>{t('password')}</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: '8px' }}
          >
            {loading ? <span className="spinner" /> : t('signIn')}
          </button>
        </form>

        <div style={{ marginTop: '28px', padding: '16px', background: 'var(--bg-primary)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
          <strong style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Demo Credentials</strong>
          <div>Admin: admin@dairy.com / Admin@123</div>
          <div>Agent: agent1@dairy.com / Agent@123</div>
        </div>
      </div>
    </div>
  );
}
