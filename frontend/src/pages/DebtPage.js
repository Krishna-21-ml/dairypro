import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Search, Plus, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { farmersAPI, debtAPI } from '../services/api';

export default function DebtPage() {
  const { t } = useTranslation();
  const [farmers, setFarmers] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [debt, setDebt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showLoan, setShowLoan] = useState(false);
  const [showRepay, setShowRepay] = useState(false);
  const [loanForm, setLoanForm] = useState({ amount: '', description: '', date: new Date().toISOString().split('T')[0] });
  const [repayForm, setRepayForm] = useState({ amount: '', description: '', date: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.length > 1) {
        farmersAPI.list({ search, limit: 10 }).then(r => setFarmers(r.data.items));
      } else if (!search) {
        farmersAPI.list({ limit: 20 }).then(r => setFarmers(r.data.items));
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const selectFarmer = async (farmer) => {
    setSelectedFarmer(farmer);
    setLoading(true);
    try {
      const res = await debtAPI.get(farmer.id);
      setDebt(res.data);
    } catch { setDebt(null); } finally { setLoading(false); }
  };

  const handleAddLoan = async (e) => {
    e.preventDefault();
    try {
      await debtAPI.addLoan({ farmer_id: selectedFarmer.id, amount: parseFloat(loanForm.amount), description: loanForm.description, date: new Date(loanForm.date).toISOString() });
      toast.success('Loan added');
      setShowLoan(false);
      selectFarmer(selectedFarmer);
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const handleRepay = async (e) => {
    e.preventDefault();
    const amount = parseFloat(repayForm.amount);
    if (amount > debt?.balance) { toast.error(`Amount exceeds balance (₹${debt?.balance})`); return; }
    try {
      await debtAPI.addRepayment({ debt_id: selectedFarmer.id, amount, description: repayForm.description, date: new Date(repayForm.date).toISOString() });
      toast.success('Repayment recorded');
      setShowRepay(false);
      selectFarmer(selectedFarmer);
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  return (
    <div>
      <h1 className="section-title">💰 {t('debt')}</h1>
      <div className="grid-2">
        {/* Farmer list */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <div className="search-input-wrap">
              <Search size={16} />
              <input className="search-input" placeholder="Search farmer..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {farmers.map(f => (
              <div
                key={f.id}
                onClick={() => selectFarmer(f)}
                style={{
                  padding: '14px 20px', cursor: 'pointer',
                  background: selectedFarmer?.id === f.id ? 'rgba(45,164,78,0.08)' : undefined,
                  borderBottom: '1px solid var(--border-light)',
                  transition: 'background 0.1s'
                }}
              >
                <div style={{ fontWeight: 600 }}>{f.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{f.card_number} · {f.phone}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Debt detail */}
        <div>
          {!selectedFarmer ? (
            <div className="card"><div className="empty-state"><p>Select a farmer to view debt</p></div></div>
          ) : loading ? (
            <div className="card"><div className="page-loader"><div className="spinner" /></div></div>
          ) : (
            <>
              <div className="card mb-4">
                <div className="flex-between mb-4">
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{selectedFarmer.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Card: {selectedFarmer.card_number}</div>
                  </div>
                  <div className="flex-gap">
                    <button className="btn btn-danger btn-sm" onClick={() => setShowLoan(true)}>
                      <ArrowDownCircle size={14} /> {t('addLoan')}
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowRepay(true)} disabled={!debt?.balance || debt.balance <= 0}>
                      <ArrowUpCircle size={14} /> {t('addRepayment')}
                    </button>
                  </div>
                </div>
                <div className="grid-3">
                  <div style={{ textAlign: 'center', padding: 16, background: 'var(--bg-primary)', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>{t('totalTaken')}</div>
                    <div style={{ fontSize: 20, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--red-400)' }}>₹{debt?.total_taken?.toLocaleString() || 0}</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: 16, background: 'var(--bg-primary)', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>{t('totalPaid')}</div>
                    <div style={{ fontSize: 20, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--green-400)' }}>₹{debt?.total_paid?.toLocaleString() || 0}</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: 16, background: 'var(--bg-primary)', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>{t('balance')}</div>
                    <div style={{ fontSize: 20, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--amber-400)' }}>₹{debt?.balance?.toLocaleString() || 0}</div>
                  </div>
                </div>
              </div>

              {/* Transaction history */}
              <div className="card">
                <div className="card-title mb-4">Transaction History</div>
                <div className="table-container">
                  <table>
                    <thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Description</th></tr></thead>
                    <tbody>
                      {!debt?.transactions?.length ? (
                        <tr><td colSpan={4}><p className="text-muted" style={{ padding: 16 }}>No transactions yet</p></td></tr>
                      ) : [...(debt?.transactions || [])].reverse().map((tx, i) => (
                        <tr key={i}>
                          <td style={{ fontSize: 12 }}>{new Date(tx.date).toLocaleDateString('en-IN')}</td>
                          <td>
                            <span className={`badge ${tx.type === 'loan' ? 'badge-red' : 'badge-green'}`}>
                              {tx.type === 'loan' ? '↓ Loan' : '↑ Repay'}
                            </span>
                          </td>
                          <td className="mono" style={{ fontWeight: 600, color: tx.type === 'loan' ? 'var(--red-400)' : 'var(--green-400)' }}>
                            {tx.type === 'loan' ? '-' : '+'}₹{tx.amount?.toLocaleString()}
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{tx.description || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Loan modal */}
      {showLoan && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowLoan(false)}>
          <div className="modal">
            <div className="modal-header"><h2 className="modal-title">Add Loan</h2><button className="modal-close" onClick={() => setShowLoan(false)}>✕</button></div>
            <form onSubmit={handleAddLoan}>
              <div className="form-group"><label>Amount (₹) *</label><input type="number" step="0.01" value={loanForm.amount} onChange={e => setLoanForm(f => ({...f, amount: e.target.value}))} required /></div>
              <div className="form-group"><label>Date</label><input type="date" value={loanForm.date} onChange={e => setLoanForm(f => ({...f, date: e.target.value}))} /></div>
              <div className="form-group"><label>Description</label><input value={loanForm.description} onChange={e => setLoanForm(f => ({...f, description: e.target.value}))} /></div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowLoan(false)}>Cancel</button>
                <button type="submit" className="btn btn-danger">Add Loan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Repayment modal */}
      {showRepay && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowRepay(false)}>
          <div className="modal">
            <div className="modal-header"><h2 className="modal-title">Add Repayment</h2><button className="modal-close" onClick={() => setShowRepay(false)}>✕</button></div>
            {debt?.balance > 0 && <div className="alert alert-warning" style={{ marginBottom: 16 }}>Outstanding balance: ₹{debt.balance?.toLocaleString()}</div>}
            <form onSubmit={handleRepay}>
              <div className="form-group"><label>Amount (₹) *</label><input type="number" step="0.01" max={debt?.balance} value={repayForm.amount} onChange={e => setRepayForm(f => ({...f, amount: e.target.value}))} required /></div>
              <div className="form-group"><label>Date</label><input type="date" value={repayForm.date} onChange={e => setRepayForm(f => ({...f, date: e.target.value}))} /></div>
              <div className="form-group"><label>Description</label><input value={repayForm.description} onChange={e => setRepayForm(f => ({...f, description: e.target.value}))} /></div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowRepay(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Record Repayment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
