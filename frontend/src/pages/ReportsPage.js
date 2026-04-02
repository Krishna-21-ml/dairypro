import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { FileText, Download } from 'lucide-react';
import { reportsAPI } from '../services/api';
import { useAuthStore } from '../store';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ReportsPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('income');

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const generate = async () => {
    setLoading(true);
    try {
      let res;
      if (reportType === 'income') res = await reportsAPI.monthlyIncome({ month, year });
      else res = await reportsAPI.agentRevenue({ month, year });
      setData(res.data);
    } catch (err) {
      toast.error('Failed to generate report');
    } finally { setLoading(false); }
  };

  const downloadPDF = () => {
    if (!data) return;
    const doc = new jsPDF();
    doc.setFont('helvetica');
    doc.setFontSize(18);
    doc.text('DairyPro - Monthly Report', 14, 22);
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Period: ${monthNames[month-1]} ${year}`, 14, 32);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 40);

    if (reportType === 'income' && data.farmers) {
      doc.setTextColor(0);
      doc.setFontSize(14);
      doc.text('Farmer Income Report', 14, 55);

      autoTable(doc, {
        startY: 62,
        head: [['Card No', 'Farmer Name', 'Total Litres', 'Avg Fat%', 'Total Amount']],
        body: data.farmers.map(f => [
          f.card_number,
          f.farmer_name,
          `${f.total_litres?.toFixed(1)}L`,
          `${f.avg_fat?.toFixed(1)}%`,
          `Rs ${f.total_amount?.toFixed(2)}`
        ]),
        foot: [['', 'TOTAL', `${data.total_litres?.toFixed(1)}L`, '', `Rs ${data.total_amount?.toFixed(2)}`]],
        styles: { fontSize: 10, cellPadding: 4 },
        headStyles: { fillColor: [45, 164, 78], textColor: 255 },
        footStyles: { fillColor: [30, 30, 40], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 250, 245] },
      });
    }

    doc.save(`DairyPro_Report_${monthNames[month-1]}_${year}.pdf`);
    toast.success('PDF downloaded');
  };

  return (
    <div>
      <h1 className="section-title">📊 {t('reports')}</h1>

      <div className="card mb-6">
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Report Type</label>
            <select value={reportType} onChange={e => setReportType(e.target.value)} style={{ width: 200 }}>
              <option value="income">Farmer Income</option>
              {user?.role === 'admin' && <option value="agent">Agent Revenue</option>}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>{t('selectMonth')}</label>
            <select value={month} onChange={e => setMonth(parseInt(e.target.value))} style={{ width: 140 }}>
              {monthNames.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>{t('selectYear')}</label>
            <select value={year} onChange={e => setYear(parseInt(e.target.value))} style={{ width: 110 }}>
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" onClick={generate} disabled={loading}>
            {loading ? <span className="spinner" /> : <FileText size={16} />}
            {t('generate')}
          </button>
          {data && (
            <button className="btn btn-secondary" onClick={downloadPDF}>
              <Download size={16} /> {t('downloadPDF')}
            </button>
          )}
        </div>
      </div>

      {data && reportType === 'income' && (
        <>
          <div className="grid-3 mb-6">
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>TOTAL LITRES</div>
              <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--green-400)' }}>{data.total_litres?.toFixed(1)}L</div>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>TOTAL AMOUNT</div>
              <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--blue-400)' }}>₹{data.total_amount?.toFixed(2)}</div>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>FARMERS</div>
              <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{data.farmers?.length}</div>
            </div>
          </div>
          <div className="card" style={{ padding: 0 }}>
            <div className="table-container">
              <table>
                <thead><tr><th>Card No</th><th>Farmer</th><th>Litres</th><th>Avg Fat%</th><th>Entries</th><th>Amount</th></tr></thead>
                <tbody>
                  {data.farmers?.map((f, i) => (
                    <tr key={i}>
                      <td><span className="badge badge-blue mono">{f.card_number || '—'}</span></td>
                      <td style={{ fontWeight: 500 }}>{f.farmer_name}</td>
                      <td className="mono">{f.total_litres?.toFixed(1)}L</td>
                      <td className="mono">{f.avg_fat?.toFixed(1)}%</td>
                      <td className="mono">{f.entries}</td>
                      <td className="mono text-green" style={{ fontWeight: 600 }}>₹{f.total_amount?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--bg-secondary)', fontWeight: 700 }}>
                    <td colSpan={2} style={{ padding: '12px 16px' }}>TOTAL</td>
                    <td className="mono" style={{ padding: '12px 16px' }}>{data.total_litres?.toFixed(1)}L</td>
                    <td colSpan={2}></td>
                    <td className="mono text-green" style={{ padding: '12px 16px', fontWeight: 700 }}>₹{data.total_amount?.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}

      {data && reportType === 'agent' && (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-container">
            <table>
              <thead><tr><th>Agent</th><th>Farmers Served</th><th>Total Litres</th><th>Total Revenue</th><th>Entries</th></tr></thead>
              <tbody>
                {data.agents?.map((a, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{a.agent_name}</td>
                    <td className="mono">{a.farmer_count}</td>
                    <td className="mono">{a.total_litres?.toFixed(1)}L</td>
                    <td className="mono text-green" style={{ fontWeight: 600 }}>₹{a.total_revenue?.toFixed(2)}</td>
                    <td className="mono">{a.entries}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!data && !loading && (
        <div className="empty-state">
          <FileText size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
          <h3>Select parameters and click Generate</h3>
        </div>
      )}
    </div>
  );
}
