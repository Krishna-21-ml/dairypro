import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './i18n';

import { useAuthStore } from './store';
import Layout from './components/common/Layout';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import FarmersPage from './pages/FarmersPage';
import FarmerDetailPage from './pages/FarmerDetailPage';
import MilkEntryPage from './pages/MilkEntryPage';
import MilkPricesPage from './pages/MilkPricesPage';
import DebtPage from './pages/DebtPage';
import InventoryPage from './pages/InventoryPage';
import ReportsPage from './pages/ReportsPage';
import UsersPage from './pages/UsersPage';
import NotificationsPage from './pages/NotificationsPage';

function PrivateRoute({ children, roles }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/dashboard" replace />;

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: { background: '#1a1a2e', color: '#e2e8f0', border: '1px solid #2d3748' },
        }}
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route path="/" element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="farmers" element={
            <PrivateRoute roles={['admin', 'agent']}>
              <FarmersPage />
            </PrivateRoute>
          } />
          <Route path="farmers/:id" element={<FarmerDetailPage />} />
          <Route path="milk-entry" element={
            <PrivateRoute roles={['admin', 'agent']}>
              <MilkEntryPage />
            </PrivateRoute>
          } />
          <Route path="milk-prices" element={
            <PrivateRoute roles={['admin']}>
              <MilkPricesPage />
            </PrivateRoute>
          } />
          <Route path="debt" element={<DebtPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="users" element={
            <PrivateRoute roles={['admin']}>
              <UsersPage />
            </PrivateRoute>
          } />
          <Route path="notifications" element={<NotificationsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
