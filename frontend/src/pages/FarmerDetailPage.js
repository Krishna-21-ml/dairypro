// FarmerDetailPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { farmersAPI, milkAPI, debtAPI } from '../services/api';
import { ArrowLeft, Phone, MapPin, CreditCard } from 'lucide-react';

export default function FarmerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [farmer, setFarmer] = useState(null);
  const [summary, setSummary] = useState(null);
  const [entries, setEntries] = useState([]);
  const [debt, setDebt] = useState(null);
  const now = new Date();

  useEffect(() => {
    farmersAPI.get(id).then(r => setFarmer(r.data));
    farmersAPI.summary(id, { month: now.getMonth() + 1, year: now.getFullYear() }).then(r => setSummary(r.data));
    milkAPI.list({ farmer_id: id, limit: 10 }).then(r => setEntries(r.data.items));
    debtAPI.get(id).then(r => setDebt(r.data));
  }, [id]);

  if (!farmer) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div>
      <div className="flex-gap mb-6">
        <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}><ArrowLeft size={14} /> Back</button>
        <h1 className="section-title" style={{ marginBottom: 0 }}>{farmer.name}</h1>
        <span className={`badge ${farmer.milk_type === 'buffalo' ? 'badge-amber' : 'badge-green'}`}>
          {farmer.milk_type === 'buffalo' ? '🐃' : '🐄'} {farmer.milk_type}
        </span>
      </div>

      <div className="grid-3 mb-6">
        <div className="card">
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Card Number</div>
          <div style={{ fontSize: 22, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{farmer.card_number}</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>This Month Litres</div>
          <div style={{ fontSize: 22, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--green-400)' }}>
            {summary?.total_litres?.toFixed(1) || 0}L
          </div>
        </div>
        <div className="card">
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>This Month Income</div>
          <div style={{ fontSize: 22, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--blue-400)' }}>
            ₹{summary?.total_amount?.toFixed(2) || 0}
          </div>
        </div>
      </div>

      <div className="grid-2 mb-6">
        <div className="card">
          <div className="card-title mb-4">Farmer Details</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="flex-gap"><Phone size={15} color="var(--text-muted)" /><span>{farmer.phone}</span></div>
            <div className="flex-gap"><MapPin size={15} color="var(--text-muted)" /><span>{farmer.address || '—'}</span></div>
            <div className="flex-gap"><CreditCard size={15} color="var(--text-muted)" /><span>{farmer.bank_details?.bank_name || '—'} · {farmer.bank_details?.account_number || '—'}</span></div>
          </div>
        </div>
        <div className="card">
          <div className="card-title mb-4">Debt Summary</div>
          {debt ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="flex-between"><span>Total Loan</span><span className="mono text-red">₹{debt.total_taken?.toLocaleString()}</span></div>
              <div className="flex-between"><span>Total Paid</span><span className="mono text-green">₹{debt.total_paid?.toLocaleString()}</span></div>
              <hr className="divider" />
              <div className="flex-between" style={{ fontWeight: 700 }}><span>Balance</span><span className="mono" style={{ color: debt.balance > 0 ? 'var(--amber-400)' : 'var(--green-400)', fontSize: 18 }}>₹{debt.balance?.toLocaleString()}</span></div>
            </div>
          ) : <p className="text-muted">No debt records</p>}
        </div>
      </div>

      <div className="card">
        <div className="card-title mb-4">Recent Milk Entries</div>
        <div className="table-container">
          <table>
            <thead><tr><th>Date</th><th>Shift</th><th>Litres</th><th>Fat%</th><th>Rate</th><th>Amount</th></tr></thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.id}>
                  <td>{new Date(e.date).toLocaleDateString('en-IN')}</td>
                  <td><span className={`badge ${e.shift === 'morning' ? 'badge-amber' : 'badge-purple'}`}>{e.shift}</span></td>
                  <td className="mono">{e.litres}L</td>
                  <td className="mono">{e.fat}%</td>
                  <td className="mono">₹{e.rate}</td>
                  <td className="mono text-green">₹{e.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
