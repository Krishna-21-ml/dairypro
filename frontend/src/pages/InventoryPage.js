import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Plus, Search, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { inventoryAPI } from '../services/api';

const EMPTY_FORM = {
  name: '', category: 'feed', quantity: '', unit: 'kg',
  low_stock_threshold: 10, price_per_unit: '', description: '', supplier: ''
};

const CATEGORIES = ['feed', 'medicine', 'equipment', 'other'];

export default function InventoryPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const fetchItems = async (p = 1) => {
    setLoading(true);
    try {
      const res = await inventoryAPI.list({
        page: p, limit: 20,
        search: search || undefined,
        category: category || undefined,
        low_stock_only: lowStockOnly || undefined,
      });
      setItems(res.data.items);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch {
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(page); }, [page, category, lowStockOnly]);

  useEffect(() => {
    const timer = setTimeout(() => { setPage(1); fetchItems(1); }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const openAdd = () => { setEditItem(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = (item) => { setEditItem(item); setForm({ ...EMPTY_FORM, ...item }); setShowModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        quantity: parseFloat(form.quantity),
        low_stock_threshold: parseFloat(form.low_stock_threshold),
        price_per_unit: form.price_per_unit ? parseFloat(form.price_per_unit) : null,
      };
      if (editItem) {
        await inventoryAPI.update(editItem.id, payload);
        toast.success('Item updated');
      } else {
        await inventoryAPI.create(payload);
        toast.success('Item added');
      }
      setShowModal(false);
      fetchItems(page);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this item?')) return;
    try {
      await inventoryAPI.delete(id);
      toast.success('Item deleted');
      fetchItems(page);
    } catch { toast.error('Delete failed'); }
  };

  const lowStockCount = items.filter(i => i.is_low_stock).length;

  return (
    <div>
      <div className="flex-between mb-6">
        <div>
          <h1 className="section-title" style={{ marginBottom: 4 }}>📦 {t('inventory')}</h1>
          {lowStockCount > 0 && (
            <div className="alert alert-warning" style={{ margin: 0, padding: '6px 12px', display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              <AlertTriangle size={14} />
              {lowStockCount} items below threshold
            </div>
          )}
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus size={16} /> Add Item
        </button>
      </div>

      <div className="toolbar">
        <div className="search-input-wrap" style={{ flex: 1 }}>
          <Search size={16} />
          <input
            className="search-input"
            placeholder="Search items..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select value={category} onChange={e => setCategory(e.target.value)} style={{ width: 140 }}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={lowStockOnly} onChange={e => setLowStockOnly(e.target.checked)} />
          Low stock only
        </label>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Category</th>
                <th>Quantity</th>
                <th>Min Threshold</th>
                <th>Price/Unit</th>
                <th>Status</th>
                <th>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7}><div className="empty-state"><p>No items found</p></div></td></tr>
              ) : items.map(item => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 500 }}>{item.name}</td>
                  <td>
                    <span className={`badge ${item.category === 'feed' ? 'badge-green' : item.category === 'medicine' ? 'badge-blue' : item.category === 'equipment' ? 'badge-amber' : 'badge-purple'}`}>
                      {item.category}
                    </span>
                  </td>
                  <td className="mono" style={{ fontWeight: 600, color: item.is_low_stock ? 'var(--red-400)' : 'var(--text-primary)' }}>
                    {item.quantity} {item.unit}
                  </td>
                  <td className="mono">{item.low_stock_threshold} {item.unit}</td>
                  <td className="mono">{item.price_per_unit ? `₹${item.price_per_unit}` : '—'}</td>
                  <td>
                    {item.is_low_stock
                      ? <span className="badge badge-red"><AlertTriangle size={10} /> Low Stock</span>
                      : <span className="badge badge-green">OK</span>
                    }
                  </td>
                  <td>
                    <div className="flex-gap">
                      <button className="btn btn-secondary btn-sm btn-icon" onClick={() => openEdit(item)}>
                        <Edit size={13} />
                      </button>
                      <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDelete(item.id)}>
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
          <span>Showing {items.length} of {total}</span>
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
              <h2 className="modal-title">{editItem ? 'Edit Item' : 'Add Item'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Item Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Unit</label>
                  <select value={form.unit} onChange={e => setForm(f => ({...f, unit: e.target.value}))}>
                    {['kg', 'g', 'l', 'ml', 'piece', 'bag', 'box'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Quantity *</label>
                  <input type="number" step="0.01" value={form.quantity} onChange={e => setForm(f => ({...f, quantity: e.target.value}))} required />
                </div>
                <div className="form-group">
                  <label>Low Stock Threshold</label>
                  <input type="number" step="0.01" value={form.low_stock_threshold} onChange={e => setForm(f => ({...f, low_stock_threshold: e.target.value}))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Price per Unit (₹)</label>
                  <input type="number" step="0.01" value={form.price_per_unit} onChange={e => setForm(f => ({...f, price_per_unit: e.target.value}))} />
                </div>
                <div className="form-group">
                  <label>Supplier</label>
                  <input value={form.supplier} onChange={e => setForm(f => ({...f, supplier: e.target.value}))} />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} />
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
