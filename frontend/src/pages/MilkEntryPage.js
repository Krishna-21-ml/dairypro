import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Plus, Trash2, Save, RefreshCw, WifiOff } from 'lucide-react';
import { milkAPI, farmersAPI, pricesAPI } from '../services/api';
import { useOfflineStore } from '../store';

const EMPTY_ROW = { card_number: '', litres: '', fat: '', amount: 0, rate: 0, farmer_id: '', farmer_name: '', milk_type: 'buffalo' };

export default function MilkEntryPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState([{ ...EMPTY_ROW }]);
  const [farmers, setFarmers] = useState({});
  const [prices, setPrices] = useState({});
  const [shift, setShift] = useState('morning');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const tableRef = useRef(null);
  const { addPendingEntry, pendingEntries, removePendingEntry, getPendingCount } = useOfflineStore();

  // Get current user from localStorage for agent_id
  const currentUser = (() => { try { return JSON.parse(localStorage.getItem('user')) } catch { return null } })();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  useEffect(() => {
    // Build farmer map keyed by card_number (case-insensitive)
    farmersAPI.list({ limit: 100 }).then(r => {
      const farmerMap = {};
      (r.data.items || []).forEach(f => {
        farmerMap[f.card_number] = f;
        farmerMap[f.card_number.toUpperCase()] = f;
        farmerMap[f.card_number.toLowerCase()] = f;
      });
      setFarmers(farmerMap);
    }).catch(() => toast.error('Could not load farmers list'));

    // Load prices - keys are "cow" and "buffalo"
    pricesAPI.current().then(r => {
      setPrices(r.data);
    }).catch(() => toast.error('Could not load milk prices. Please set prices first.'));
  }, []);

  const calcAmount = useCallback((litres, fat, milk_type) => {
    // prices keys match milk_type values: "cow" or "buffalo"
    const price = prices[milk_type];
    if (!price || !price.price_per_fat_unit) return { rate: 0, amount: 0 };
    const parsedFat = parseFloat(fat) > 10 ? parseFloat(fat) / 10 : parseFloat(fat);
    if (!parsedFat || !parseFloat(litres)) return { rate: 0, amount: 0 };
    const rate = parsedFat * price.price_per_fat_unit;
    return {
      rate: Math.round(rate * 100) / 100,
      amount: Math.round(parseFloat(litres) * rate * 100) / 100
    };
  }, [prices]);

  const updateRow = (index, field, value) => {
    setRows(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      // Auto-fill farmer name and milk type from card number
      if (field === 'card_number') {
        const farmer = farmers[value] || farmers[value?.toUpperCase()] || farmers[value?.toLowerCase()];
        if (farmer) {
          updated[index].farmer_id = farmer.id;
          updated[index].farmer_name = farmer.name;
          updated[index].milk_type = farmer.milk_type || 'buffalo';
        } else {
          updated[index].farmer_id = '';
          updated[index].farmer_name = '';
        }
      }

      // Recalculate amount whenever litres, fat, or card_number changes
      const row = updated[index];
      const litres = field === 'litres' ? value : row.litres;
      const fat    = field === 'fat'    ? value : row.fat;
      const mtype  = row.milk_type || 'buffalo';
      if (litres && fat) {
        const { rate, amount } = calcAmount(litres, fat, mtype);
        updated[index].rate   = rate;
        updated[index].amount = amount;
      }

      return updated;
    });
  };

  const handleKeyDown = (e, rowIndex, colName) => {
    const cols = ['card_number', 'litres', 'fat'];
    const colIdx = cols.indexOf(colName);
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (colName === 'fat') {
        if (rowIndex === rows.length - 1) setRows(prev => [...prev, { ...EMPTY_ROW }]);
        setTimeout(() => {
          const nextRow = tableRef.current?.querySelector(`[data-row="${rowIndex + 1}"][data-col="card_number"]`);
          nextRow?.focus();
        }, 50);
      } else {
        const nextInput = tableRef.current?.querySelector(`[data-row="${rowIndex}"][data-col="${cols[colIdx + 1]}"]`);
        nextInput?.focus();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      tableRef.current?.querySelector(`[data-row="${rowIndex + 1}"][data-col="${colName}"]`)?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      tableRef.current?.querySelector(`[data-row="${rowIndex - 1}"][data-col="${colName}"]`)?.focus();
    }
  };

  const removeRow = (index) => {
    if (rows.length === 1) { setRows([{ ...EMPTY_ROW }]); return; }
    setRows(prev => prev.filter((_, i) => i !== index));
  };

  const addRow = () => setRows(prev => [...prev, { ...EMPTY_ROW }]);

  const handleSave = async () => {
    const validRows = rows.filter(r => r.card_number && r.litres && r.fat && r.farmer_id);
    if (!validRows.length) {
      toast.error('No valid entries. Make sure card number matches a farmer and litres/fat are filled.');
      return;
    }

    const agentId = currentUser?.id || '';

    const entries = validRows.map(r => ({
      farmer_id:   r.farmer_id,
      card_number: r.card_number,
      litres:      parseFloat(r.litres),
      fat:         parseFloat(r.fat) > 10 ? parseFloat(r.fat) / 10 : parseFloat(r.fat),
      milk_type:   r.milk_type || 'buffalo',
      shift,
      date:        new Date(date).toISOString(),
      agent_id:    agentId,
    }));

    if (!isOnline) {
      entries.forEach(e => addPendingEntry(e));
      toast.success(`${entries.length} entries saved offline`);
      setRows([{ ...EMPTY_ROW }]);
      return;
    }

    setSaving(true);
    try {
      const res = await milkAPI.bulkCreate(entries);
      const { inserted, errors } = res.data;
      if (errors?.length) {
        toast.error(`${errors.length} entries failed: ${errors[0].error}`);
      } else {
        toast.success(`${inserted} entries saved!`);
        setRows([{ ...EMPTY_ROW }]);
      }
    } catch (err) {
      const detail = err.response?.data?.detail || 'Save failed';
      toast.error(detail);
      if (detail.includes('price')) {
        toast('Go to Milk Prices page and set a price first', { icon: '💡' });
      }
    } finally {
      setSaving(false);
    }
  };

  const syncOffline = async () => {
    if (!pendingEntries.length) { toast('No pending entries'); return; }
    setSyncing(true);
    let success = 0;
    for (const entry of pendingEntries) {
      try {
        await milkAPI.create(entry);
        removePendingEntry(entry._offlineId);
        success++;
      } catch {}
    }
    setSyncing(false);
    toast.success(`Synced ${success} / ${pendingEntries.length} entries`);
  };

  const totals = rows.reduce((acc, r) => ({
    litres: acc.litres + (parseFloat(r.litres) || 0),
    amount: acc.amount + (r.amount || 0)
  }), { litres: 0, amount: 0 });

  const validCount = rows.filter(r => r.farmer_id && r.litres && r.fat).length;

  return (
    <div>
      <div className="flex-between mb-6">
        <h1 className="section-title" style={{ marginBottom: 0 }}>🥛 {t('milkCollection')}</h1>
        <div className="flex-gap">
          {!isOnline && <span className="badge badge-amber"><WifiOff size={12} /> Offline</span>}
          {getPendingCount() > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={syncOffline} disabled={syncing || !isOnline}>
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              Sync {getPendingCount()} pending
            </button>
          )}
        </div>
      </div>

      {/* Price indicator */}
      <div className="card mb-4" style={{ padding: '10px 16px', display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>CURRENT PRICES:</span>
        {prices.buffalo && (
          <span style={{ fontSize: 13 }}>🐃 Buffalo: <strong style={{ color: 'var(--green-400)' }}>₹{prices.buffalo.price_per_fat_unit}/fat unit</strong></span>
        )}
        {prices.cow && (
          <span style={{ fontSize: 13 }}>🐄 Cow: <strong style={{ color: 'var(--green-400)' }}>₹{prices.cow.price_per_fat_unit}/fat unit</strong></span>
        )}
        {!prices.buffalo && !prices.cow && (
          <span style={{ color: 'var(--red-400)', fontSize: 13 }}>⚠️ No prices set — <a href="/milk-prices" style={{ color: 'var(--green-400)' }}>Set prices first</a></span>
        )}
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>Formula: Rate = Fat% × Price/fat · Amount = Litres × Rate</span>
      </div>

      <div className="card mb-6">
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>{t('date')}</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: 180 }} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>{t('shift')}</label>
            <select value={shift} onChange={e => setShift(e.target.value)} style={{ width: 160 }}>
              <option value="morning">🌅 {t('morning')}</option>
              <option value="evening">🌙 {t('evening')}</option>
            </select>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={addRow}>
              <Plus size={14} /> Add Row
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <span className="spinner" /> : <Save size={16} />}
              {saving ? 'Saving...' : `${t('save')} ${validCount > 0 ? `(${validCount})` : ''}`}
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table ref={tableRef}>
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th style={{ width: 130 }}>{t('cardNumber')}</th>
                <th>{t('farmerName')}</th>
                <th style={{ width: 120 }}>{t('litres')}</th>
                <th style={{ width: 110 }}>{t('fat')} %</th>
                <th style={{ width: 100 }}>Rate (₹)</th>
                <th style={{ width: 130 }}>Amount (₹)</th>
                <th style={{ width: 50 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => {
                const farmer = farmers[row.card_number] || farmers[row.card_number?.toUpperCase()];
                const hasError = row.card_number && row.card_number.length >= 2 && !farmer;
                return (
                  <tr key={ri}>
                    <td className="entry-cell text-muted" style={{ textAlign: 'center', fontSize: 12 }}>{ri + 1}</td>
                    <td className="entry-cell">
                      <input
                        className="entry-input"
                        data-row={ri} data-col="card_number"
                        value={row.card_number}
                        onChange={e => updateRow(ri, 'card_number', e.target.value)}
                        onKeyDown={e => handleKeyDown(e, ri, 'card_number')}
                        placeholder="A001"
                        style={{ color: hasError ? 'var(--red-400)' : undefined }}
                      />
                    </td>
                    <td className="entry-cell" style={{ fontSize: 13, color: farmer ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {farmer ? (
                        <span>{farmer.name} <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({farmer.milk_type})</span></span>
                      ) : row.card_number && row.card_number.length >= 2 ? (
                        <span style={{ color: 'var(--red-400)' }}>⚠ Not found</span>
                      ) : '—'}
                    </td>
                    <td className="entry-cell">
                      <input
                        className="entry-input"
                        data-row={ri} data-col="litres"
                        type="number" step="0.1"
                        value={row.litres}
                        onChange={e => updateRow(ri, 'litres', e.target.value)}
                        onKeyDown={e => handleKeyDown(e, ri, 'litres')}
                        placeholder="0.0"
                      />
                    </td>
                    <td className="entry-cell">
                      <input
                        className="entry-input"
                        data-row={ri} data-col="fat"
                        type="number" step="0.1"
                        value={row.fat}
                        onChange={e => updateRow(ri, 'fat', e.target.value)}
                        onKeyDown={e => handleKeyDown(e, ri, 'fat')}
                        placeholder="6.2"
                      />
                    </td>
                    <td className="entry-cell mono" style={{ textAlign: 'center', color: row.rate > 0 ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: 13 }}>
                      {row.rate > 0 ? row.rate.toFixed(2) : '—'}
                    </td>
                    <td className="entry-cell">
                      <div style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 600, color: row.amount > 0 ? 'var(--green-400)' : 'var(--text-muted)', fontSize: 14 }}>
                        {row.amount > 0 ? `₹${row.amount.toFixed(2)}` : '—'}
                      </div>
                    </td>
                    <td className="entry-cell" style={{ textAlign: 'center' }}>
                      <button className="btn btn-icon btn-danger btn-sm" onClick={() => removeRow(ri)}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: 'var(--bg-secondary)', fontWeight: 700 }}>
                <td colSpan={3} style={{ padding: '12px 16px', fontSize: 13 }}>
                  {validCount} valid entries
                </td>
                <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 14 }}>
                  {totals.litres.toFixed(1)}L
                </td>
                <td colSpan={2}></td>
                <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--green-400)', fontWeight: 700 }}>
                  ₹{totals.amount.toFixed(2)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div style={{ padding: '12px 20px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)' }}>
          💡 Tip: Press <kbd style={{ background: 'var(--bg-card)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border)' }}>Enter</kbd> to move to next cell · Fat 62 → auto converts to 6.2
        </div>
      </div>
    </div>
  );
}

