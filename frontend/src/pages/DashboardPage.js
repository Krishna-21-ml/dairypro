import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { dashboardAPI } from '../services/api';
import { useAuthStore } from '../store';
import { Milk, TrendingUp, AlertTriangle, Users } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler);

const chartOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1c2333', borderColor: '#30363d', borderWidth: 1, titleColor: '#e6edf3', bodyColor: '#8b949e', padding: 10 } },
  scales: {
    x: { grid: { color: '#21262d' }, ticks: { color: '#6e7681', font: { size: 11 } } },
    y: { grid: { color: '#21262d' }, ticks: { color: '#6e7681', font: { size: 11 } } }
  }
};

function StatCard({ icon: Icon, value, label, color, change }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${color}`}><Icon size={22} color={`var(--${color === 'green' ? 'green-400' : color === 'amber' ? 'amber-400' : color === 'red' ? 'red-400' : 'blue-400'})`} /></div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {change && <div className={`stat-change ${change > 0 ? 'up' : 'down'}`}>{change > 0 ? '↑' : '↓'} {Math.abs(change)}%</div>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        let res;
        if (user?.role === 'admin') res = await dashboardAPI.admin();
        else if (user?.role === 'agent') res = await dashboardAPI.agent();
        else res = await dashboardAPI.farmer();
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [user]);

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;
  if (!data) return <div>Failed to load dashboard</div>;

  const fmt = (n) => n?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) || '0';
  const fmtCurrency = (n) => `₹${fmt(n)}`;

  // Admin Dashboard
  if (user?.role === 'admin') {
    const trendLabels = data.milk_trend?.map(d => d.date?.slice(5)) || [];
    const litreData = data.milk_trend?.map(d => d.litres) || [];
    const incomeData = data.milk_trend?.map(d => d.income) || [];

    return (
      <div>
        <div className="flex-between mb-6">
          <h1 className="section-title" style={{ marginBottom: 0 }}>Admin Dashboard</h1>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>

        <div className="grid-stats mb-6">
          <StatCard icon={Milk} value={`${fmt(data.total_litres_month)}L`} label={t('totalMilk')} color="green" />
          <StatCard icon={TrendingUp} value={fmtCurrency(data.total_income_month)} label={t('totalIncome')} color="blue" />
          <StatCard icon={AlertTriangle} value={fmtCurrency(data.total_debt)} label={t('totalDebt')} color="amber" />
          <StatCard icon={Users} value={data.total_farmers} label={t('totalFarmers')} color="green" />
        </div>

        <div className="grid-2 mb-6">
          <div className="card">
            <div className="card-header">
              <div><div className="card-title">Milk Collection Trend</div><div className="card-subtitle">Last 7 days (Litres)</div></div>
            </div>
            <div className="chart-wrap">
              <Bar data={{
                labels: trendLabels,
                datasets: [{
                  data: litreData,
                  backgroundColor: 'rgba(45,164,78,0.7)',
                  borderRadius: 6,
                }]
              }} options={chartOptions} />
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div><div className="card-title">Daily Revenue</div><div className="card-subtitle">Last 7 days (₹)</div></div>
            </div>
            <div className="chart-wrap">
              <Line data={{
                labels: trendLabels,
                datasets: [{
                  data: incomeData,
                  borderColor: '#60a5fa',
                  backgroundColor: 'rgba(96,165,250,0.1)',
                  fill: true,
                  tension: 0.4,
                  pointBackgroundColor: '#60a5fa',
                }]
              }} options={chartOptions} />
            </div>
          </div>
        </div>

        <div className="grid-2">
          <div className="card">
            <div className="card-header"><div className="card-title">Top Agents This Month</div></div>
            <div className="table-container">
              <table>
                <thead><tr><th>Agent ID</th><th>Total Litres</th><th>Revenue</th></tr></thead>
                <tbody>
                  {data.top_agents?.map((a, i) => (
                    <tr key={i}>
                      <td><span className="badge badge-blue">{a._id?.slice(-6)}</span></td>
                      <td className="table-num">{fmt(a.total_litres)}L</td>
                      <td className="table-num text-green">{fmtCurrency(a.total_income)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">⚠️ Low Stock Alerts</div>
              <span className="badge badge-red">{data.low_stock_alerts?.length} items</span>
            </div>
            {data.low_stock_alerts?.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>✅ All stock levels are good</p>
            ) : (
              <div className="table-container">
                <table>
                  <thead><tr><th>Item</th><th>Qty</th><th>Min</th></tr></thead>
                  <tbody>
                    {data.low_stock_alerts?.map((item, i) => (
                      <tr key={i}>
                        <td>{item.name}</td>
                        <td className="table-num text-red">{item.quantity} {item.unit}</td>
                        <td className="table-num text-muted">{item.low_stock_threshold}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Agent Dashboard
  if (user?.role === 'agent') {
    const trendLabels = data.trend?.map(d => d.date?.slice(5)) || [];
    const litreData = data.trend?.map(d => d.litres) || [];

    return (
      <div>
        <h1 className="section-title">Agent Dashboard</h1>
        <div className="grid-stats mb-6">
          <StatCard icon={Milk} value={`${fmt(data.today_litres)}L`} label="Today's Collection" color="green" />
          <StatCard icon={TrendingUp} value={fmtCurrency(data.today_amount)} label="Today's Revenue" color="blue" />
          <StatCard icon={Milk} value={`${fmt(data.monthly_litres)}L`} label="Monthly Collection" color="amber" />
          <StatCard icon={Users} value={data.farmer_count} label="My Farmers" color="green" />
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">7-Day Milk Collection</div></div>
          <div className="chart-wrap">
            <Bar data={{
              labels: trendLabels,
              datasets: [{ data: litreData, backgroundColor: 'rgba(45,164,78,0.7)', borderRadius: 6 }]
            }} options={chartOptions} />
          </div>
        </div>
      </div>
    );
  }

  // Farmer Dashboard
  return (
    <div>
      <h1 className="section-title">My Dashboard</h1>
      <div className="grid-stats mb-6">
        <StatCard icon={Milk} value={`${fmt(data.monthly_litres)}L`} label="Monthly Milk" color="green" />
        <StatCard icon={TrendingUp} value={fmtCurrency(data.monthly_income)} label="Monthly Income" color="blue" />
        <StatCard icon={AlertTriangle} value={fmtCurrency(data.debt_balance)} label="Debt Balance" color="amber" />
      </div>
      <div className="card">
        <div className="card-header"><div className="card-title">Recent Milk Entries</div></div>
        <div className="table-container">
          <table>
            <thead><tr><th>Date</th><th>Litres</th><th>Fat%</th><th>Amount</th></tr></thead>
            <tbody>
              {data.recent_entries?.map((e, i) => (
                <tr key={i}>
                  <td>{new Date(e.date).toLocaleDateString('en-IN')}</td>
                  <td className="table-num">{e.litres}L</td>
                  <td className="table-num">{e.fat}%</td>
                  <td className="table-num text-green">{fmtCurrency(e.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
