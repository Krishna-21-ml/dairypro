import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Search, Edit, Trash2, Eye, MapPin } from 'lucide-react';
import { farmersAPI } from '../services/api';

const EMPTY_FORM = {
  name: '', phone: '', address: '', card_number: '',
  milk_type: 'buffalo', is_active: true,
  bank_details: { bank_name: '', account_number: '', ifsc_code: '', branch: '' },
  gps_location: { latitude: '', longitude: '' }
};

// FIX: Pydantic v2 returns detail as array of {msg, loc, type} objects
function extractError(err) {
  const detail = err.response?.data?.detail;
  if (!detail) return 'Operation failed';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map(e => {
      const field = e.loc?.slice(1).join('.') || '';
      return field ? `${field}: ${e.msg}` : e.msg;
    }).join(' | ');
  }
  return JSON.stringify(detail);
}

export default function FarmersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [farmers, setFarmers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editFarmer, setEditFarmer] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const fetchFarmers = async (p = 1, s = '') => {
    setLoading(true);
    try {
      const res = await farmersAPI.list({ page: p, limit: 20, search: s || undefined });
      setFarmers(res.data.items);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch {
      toast.error('Failed to load farmers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFarmers(page, search); }, [page]);
  useEffect(() => {
    const timer = setTimeout(() => { setPage(1); fetchFarmers(1, search); }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const openAdd = () => { setEditFarmer(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = (farmer) => {
    setEditFarmer(farmer);
    setForm({
      ...farmer,
      bank_details: farmer.bank_details || EMPTY_FORM.bank_details,
      gps_location: farmer.gps_location || EMPTY_FORM.gps_location
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    // Build clean payload — only send gps if both coords provided
    const lat = parseFloat(form.gps_location?.latitude);
    const lng = parseFloat(form.gps_location?.longitude);
    const payload = {
      name:        form.name.trim(),
      phone:       form.phone.trim(),
      address:     form.address?.trim() || '',
      card_number: form.card_number.trim(),
      milk_type:   form.milk_type,
      is_active:   form.is_active,
      bank_details: {
        bank_name:      form.bank_details?.bank_name || null,
        account_number: form.bank_details?.account_number || null,
        ifsc_code:      form.bank_details?.ifsc_code || null,
        branch:         form.bank_details?.branch || null,
      },
      // FIX: only send gps_location if both values are valid numbers
      gps_location: (!isNaN(lat) && !isNaN(lng) && lat && lng)
        ? { latitude: lat, longitude: lng }
        : null,
    };

    try {
      if (editFarmer) {
        await farmersAPI.update(editFarmer.id, payload);
        toast.success('Farmer updated successfully');
      } else {
        await farmersAPI.create(payload);
        toast.success('Farmer created successfully');
      }
      setShowModal(false);
      fetchFarmers(page, search);
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this farmer?')) return;
    try {
      await farmersAPI.delete(id);
      toast.success('Farmer deleted');
      fetchFarmers(page, search);
    } catch {
      toast.error('Delete failed');
    }
  };

  const setField = (path, value) => {
    if (path.includes('.')) {
      const [parent, child] = path.split('.');
      setForm(f => ({ ...f, [parent]: { ...f[parent], [child]: value } }));
    } else {
      setForm(f => ({ ...f, [path]: value }));
    }
  };

  return (
    <div>
      <div className="flex-between mb-6">
        <h1 className="section-title" style={{ marginBottom: 0 }}>👨‍🌾 {t('farmers')}</h1>
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus size={16} /> {t('addFarmer')}
        </button>
      </div>

      <div className="toolbar">
        <div className="search-input-wrap">
          <Search size={16} />
          <input
            className="search-input"
            placeholder={`${t('search')} by name, phone, card...`}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{total} {t('farmers')}</span>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>{t('cardNumber')}</th>
                <th>{t('name')}</th>
                <th>{t('phone')}</th>
                <th>{t('milkType')}</th>
                <th>{t('address')}</th>
                <th>{t('status')}</th>
                <th>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
              ) : farmers.length === 0 ? (
                <tr><td colSpan={7}><div className="empty-state"><p>No farmers found</p></div></td></tr>
              ) : farmers.map(f => (
                <tr key={f.id}>
                  <td><span className="badge badge-blue mono">{f.card_number}</span></td>
                  <td style={{ fontWeight: 500 }}>{f.name}</td>
                  <td className="mono">{f.phone}</td>
                  <td>
                    <span className={`badge ${f.milk_type === 'buffalo' ? 'badge-amber' : 'badge-green'}`}>
                      {f.milk_type === 'buffalo' ? '🐃' : '🐄'} {f.milk_type}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{f.address || '—'}</td>
                  <td>
                    <span className={`badge ${f.is_active ? 'badge-green' : 'badge-red'}`}>
                      {f.is_active ? t('active') : t('inactive')}
                    </span>
                  </td>
                  <td>
                    <div className="flex-gap">
                      <button className="btn btn-secondary btn-sm btn-icon" onClick={() => navigate(`/farmers/${f.id}`)} title="View">
                        <Eye size={13} />
                      </button>
                      <button className="btn btn-secondary btn-sm btn-icon" onClick={() => openEdit(f)} title="Edit">
                        <Edit size={13} />
                      </button>
                      <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDelete(f.id)} title="Delete">
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
          <span>Showing {farmers.length} of {total}</span>
          <div className="pagination-btns">
            <button className="page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>←</button>
            {Array.from({ length: Math.min(pages, 5) }, (_, i) => (
              <button key={i+1} className={`page-btn ${page === i+1 ? 'active' : ''}`} onClick={() => setPage(i+1)}>{i+1}</button>
            ))}
            <button className="page-btn" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>→</button>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <h2 className="modal-title">{editFarmer ? t('editFarmer') : t('addFarmer')}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('farmerName')} *</label>
                  <input value={form.name} onChange={e => setField('name', e.target.value)} required minLength={2} />
                </div>
                <div className="form-group">
                  <label>{t('cardNumber')} *</label>
                  <input value={form.card_number} onChange={e => setField('card_number', e.target.value)} required placeholder="e.g. A001" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{t('phone')} * (10 digits)</label>
                  <input
                    value={form.phone}
                    onChange={e => setField('phone', e.target.value)}
                    required minLength={10} maxLength={15}
                    placeholder="9876543210"
                  />
                </div>
                <div className="form-group">
                  <label>{t('milkType')}</label>
                  <select value={form.milk_type} onChange={e => setField('milk_type', e.target.value)}>
                    <option value="buffalo">🐃 {t('buffalo')}</option>
                    <option value="cow">🐄 {t('cow')}</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>{t('address')}</label>
                <input value={form.address} onChange={e => setField('address', e.target.value)} />
              </div>
              <hr className="divider" />
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }}>🏦 {t('bankDetails')}</div>
              <div className="form-row">
                <div className="form-group">
                  <label>Bank Name</label>
                  <input value={form.bank_details?.bank_name || ''} onChange={e => setField('bank_details.bank_name', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Account Number</label>
                  <input value={form.bank_details?.account_number || ''} onChange={e => setField('bank_details.account_number', e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>IFSC Code</label>
                  <input value={form.bank_details?.ifsc_code || ''} onChange={e => setField('bank_details.ifsc_code', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Branch</label>
                  <input value={form.bank_details?.branch || ''} onChange={e => setField('bank_details.branch', e.target.value)} />
                </div>
              </div>
              <hr className="divider" />
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }}>
                <MapPin size={14} style={{ display: 'inline', marginRight: 4 }} /> GPS Location (optional)
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Latitude</label>
                  <input type="number" step="any" value={form.gps_location?.latitude || ''} onChange={e => setField('gps_location.latitude', e.target.value)} placeholder="e.g. 17.3850" />
                </div>
                <div className="form-group">
                  <label>Longitude</label>
                  <input type="number" step="any" value={form.gps_location?.longitude || ''} onChange={e => setField('gps_location.longitude', e.target.value)} placeholder="e.g. 78.4867" />
                </div>
              </div>
              <div className="form-group">
                <label>{t('status')}</label>
                <select value={form.is_active ? 'true' : 'false'} onChange={e => setField('is_active', e.target.value === 'true')}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>{t('cancel')}</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="spinner" /> : (editFarmer ? '💾 Update' : '✅ Create Farmer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
