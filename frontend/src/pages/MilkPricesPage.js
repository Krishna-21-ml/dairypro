import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { pricesAPI } from '../services/api';

const PRESETS = [5, 6, 7, 7.5, 8, 8.5, 9, 10];

function PriceCard({ type, price, onQuickSet }) {
  const isBuf = type === 'buffalo';
  const exampleFat = 6.2;
  const exampleLitres = 10;
  const exampleRate = price ? (exampleFat * price.price_per_fat_unit).toFixed(2) : '—';
  const exampleAmount = price ? (exampleLitres * exampleFat * price.price_per_fat_unit).toFixed(2) : '—';

  return (
    <div className="card" style={{ borderTop: `3px solid ${isBuf ? '#f59e0b' : '#10b981'}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <span style={{ fontSize: 36 }}>{isBuf ? '🐃' : '🐄'}</span>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            {type} Milk
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, fontFamily: 'var(--font-mono)', color: isBuf ? '#f59e0b' : '#10b981' }}>
            {price ? `₹${price.price_per_fat_unit}` : '—'}
            <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-muted)' }}>/fat unit</span>
          </div>
        </div>
      </div>

      {price && (
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '10px 12px', marginBottom: 12, fontSize: 12 }}>
          <div style={{ color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>EXAMPLE (Fat 6.2%, 10 Litres)</div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Rate: <strong>₹{exampleRate}/L</strong></span>
            <span>Amount: <strong style={{ color: '#10b981' }}>₹{exampleAmount}</strong></span>
          </div>
        </div>
      )}

      {price && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
          Last updated: {new Date(price.effective_from).toLocaleString('en-IN')}
          {price.notes && <span> · {price.notes}</span>}
        </div>
      )}

      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>QUICK SET:</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {PRESETS.map(p => (
          <button
            key={p}
            onClick={() => onQuickSet(type, p)}
            style={{
              padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)',
              background: price?.price_per_fat_unit === p ? (isBuf ? '#f59e0b' : '#10b981') : 'var(--bg-secondary)',
              color: price?.price_per_fat_unit === p ? '#000' : 'var(--text-primary)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-mono)'
            }}
          >
            ₹{p}
          </button>
        ))}
      </div>
    </div>
  );
}

function LiveCalculator({ prices }) {
  const [fat, setFat] = useState(6.2);
  const [litres, setLitres] = useState(10);
  const [milkType, setMilkType] = useState('buffalo');

  const price = prices[milkType];
  const parsedFat = fat > 10 ? fat / 10 : fat;
  const rate = price ? parsedFat * price.price_per_fat_unit : 0;
  const amount = rate * litres;

  return (
    <div className="card">
      <div className="card-title mb-4">🧮 Live Calculator</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Milk Type</label>
          <select value={milkType} onChange={e => setMilkType(e.target.value)}>
            <option value="buffalo">🐃 Buffalo</option>
            <option value="cow">🐄 Cow</option>
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Fat %</label>
          <input type="number" step="0.1" min="0" max="15" value={fat}
            onChange={e => setFat(parseFloat(e.target.value) || 0)} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Litres</label>
          <input type="number" step="0.1" min="0" value={litres}
            onChange={e => setLitres(parseFloat(e.target.value) || 0)} />
        </div>
      </div>
      {price ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          {[
            ['Fat Used', `${parsedFat.toFixed(1)}%`, '#94a3b8'],
            ['Rate/Litre', `₹${rate.toFixed(2)}`, '#f59e0b'],
            ['Total Amount', `₹${amount.toFixed(2)}`, '#10b981'],
          ].map(([label, value, color]) => (
            <div key={label} style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)', color }}>{value}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>
          ⚠️ No price set for {milkType} milk yet
        </div>
      )}
      <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: 6 }}>
        Formula: <strong>Rate = Fat% × ₹{price?.price_per_fat_unit || '?'}</strong> · <strong>Amount = {litres}L × ₹{rate.toFixed(2)} = ₹{amount.toFixed(2)}</strong>
      </div>
    </div>
  );
}

export default function MilkPricesPage() {
  const [prices, setPrices] = useState({});
  const [history, setHistory] = useState([]);
  const [historyType, setHistoryType] = useState('buffalo');
  const [form, setForm] = useState({ milk_type: 'buffalo', price_per_fat_unit: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [pr, hi] = await Promise.all([
        pricesAPI.current(),
        pricesAPI.history({ milk_type: historyType, limit: 30 })
      ]);
      setPrices(pr.data);
      setHistory(hi.data);
    } catch { toast.error('Failed to load prices'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    pricesAPI.history({ milk_type: historyType, limit: 30 })
      .then(r => setHistory(r.data)).catch(() => {});
  }, [historyType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.price_per_fat_unit || parseFloat(form.price_per_fat_unit) <= 0) {
      toast.error('Enter a valid price'); return;
    }
    setSubmitting(true);
    try {
      await pricesAPI.set({
        milk_type: form.milk_type,
        price_per_fat_unit: parseFloat(form.price_per_fat_unit),
        notes: form.notes,
        effective_from: new Date().toISOString()
      });
      toast.success(`✅ ${form.milk_type} milk price set to ₹${form.price_per_fat_unit}/fat unit`);
      setForm(f => ({ ...f, price_per_fat_unit: '', notes: '' }));
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update price');
    } finally { setSubmitting(false); }
  };

  const handleQuickSet = async (type, price) => {
    setSubmitting(true);
    try {
      await pricesAPI.set({
        milk_type: type,
        price_per_fat_unit: price,
        notes: 'Quick set',
        effective_from: new Date().toISOString()
      });
      toast.success(`✅ ${type} milk → ₹${price}/fat unit`);
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed');
    } finally { setSubmitting(false); }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 className="section-title" style={{ marginBottom: 0 }}>🏷️ Milk Prices</h1>
        <button className="btn btn-secondary btn-sm" onClick={loadAll} disabled={loading}>
          {loading ? '...' : '🔄 Refresh'}
        </button>
      </div>

      {/* Price cards */}
      <div className="grid-2 mb-6">
        <PriceCard type="buffalo" price={prices.buffalo} onQuickSet={handleQuickSet} />
        <PriceCard type="cow" price={prices.cow} onQuickSet={handleQuickSet} />
      </div>

      {/* Live calculator */}
      <div className="mb-6">
        <LiveCalculator prices={prices} />
      </div>

      {/* Set new price form + history */}
      <div className="grid-2">
        <div className="card">
          <div className="card-title mb-4">✏️ Set Custom Price</div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Milk Type</label>
              <select value={form.milk_type} onChange={e => setForm(f => ({ ...f, milk_type: e.target.value }))}>
                <option value="buffalo">🐃 Buffalo</option>
                <option value="cow">🐄 Cow</option>
              </select>
            </div>
            <div className="form-group">
              <label>Price per Fat Unit (₹) *</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 700 }}>₹</span>
                <input
                  type="number" step="0.01" min="0.01"
                  value={form.price_per_fat_unit}
                  onChange={e => setForm(f => ({ ...f, price_per_fat_unit: e.target.value }))}
                  required placeholder="e.g. 8.50"
                  style={{ paddingLeft: 28 }}
                />
              </div>
              {form.price_per_fat_unit && (
                <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '6px 10px', borderRadius: 6 }}>
                  Preview: Fat 6.2% × ₹{form.price_per_fat_unit} = <strong>₹{(6.2 * parseFloat(form.price_per_fat_unit || 0)).toFixed(2)}/L</strong> · 10L = <strong style={{ color: '#10b981' }}>₹{(10 * 6.2 * parseFloat(form.price_per_fat_unit || 0)).toFixed(2)}</strong>
                </div>
              )}
            </div>
            <div className="form-group">
              <label>Notes (optional)</label>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="e.g. Seasonal rate increase" />
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting}
              style={{ width: '100%', justifyContent: 'center' }}>
              {submitting ? '⏳ Saving...' : '💾 Set Price'}
            </button>
          </form>

          <div style={{ marginTop: 16, padding: '12px', background: 'rgba(16,185,129,0.1)', borderRadius: 8, border: '1px solid rgba(16,185,129,0.2)', fontSize: 12 }}>
            <strong style={{ color: '#10b981' }}>Formula:</strong>
            <div style={{ marginTop: 4, color: 'var(--text-muted)', lineHeight: 1.8 }}>
              Rate = Fat% × Price/fat unit<br />
              Amount = Litres × Rate<br />
              <strong>Example:</strong> 10L, Fat 6.2%, ₹{form.price_per_fat_unit || '8'}/unit → ₹{(6.2 * parseFloat(form.price_per_fat_unit || 8)).toFixed(2)}/L → ₹{(10 * 6.2 * parseFloat(form.price_per_fat_unit || 8)).toFixed(2)}
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div className="card-title">📋 Price History</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {['buffalo', 'cow'].map(t => (
                <button key={t} onClick={() => setHistoryType(t)}
                  className={`btn btn-sm ${historyType === t ? 'btn-primary' : 'btn-secondary'}`}>
                  {t === 'buffalo' ? '🐃' : '🐄'} {t}
                </button>
              ))}
            </div>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Price/Fat</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>No history yet</td></tr>
                ) : history.map((p, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: 12 }}>{new Date(p.effective_from).toLocaleString('en-IN')}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: historyType === 'buffalo' ? '#f59e0b' : '#10b981' }}>
                      ₹{p.price_per_fat_unit}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
