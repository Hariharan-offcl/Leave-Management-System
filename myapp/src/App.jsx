import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';

// Layout
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';
import PrincipalDashboard from './pages/PrincipalDashboard';
import HodDashboard from './pages/HodDashboard';
import StaffDashboard from './pages/StaffDashboard';
import StudentDashboard from './pages/StudentDashboard';
import Directory from './pages/Directory';
import LeaveHistory from './pages/LeaveHistory';
import Settings from './pages/Settings';

const PrivateRoute = ({ children, allowedRoles }) => {
  const { currentUser, loading } = useAppContext();

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--erp-bg)', color: 'var(--erp-primary)', fontWeight: 600 }}>📡 Connecting to Smart-ERP Cloud...</div>;

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const DashboardRouter = () => {
  const { currentUser, loading } = useAppContext();
  
  if (loading) return null;
  if (!currentUser) return <Navigate to="/login" replace />;

  switch (currentUser.role) {
    case 'PRINCIPAL':
      return <Navigate to="/dashboard/principal" replace />;
    case 'HOD':
      return <Navigate to="/dashboard/hod" replace />;
    case 'STAFF':
      return <Navigate to="/dashboard/staff" replace />;
    case 'STUDENT':
      return <Navigate to="/dashboard/student" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
};

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={<DashboardRouter />} />
          
          <Route path="/dashboard" element={<Layout />}>
            <Route path="principal" element={
              <PrivateRoute allowedRoles={['PRINCIPAL']}>
                <PrincipalDashboard />
              </PrivateRoute>
            } />
            <Route path="hod" element={
              <PrivateRoute allowedRoles={['HOD']}>
                <HodDashboard />
              </PrivateRoute>
            } />
            <Route path="staff" element={
              <PrivateRoute allowedRoles={['STAFF']}>
                <StaffDashboard />
              </PrivateRoute>
            } />
            <Route path="student" element={
              <PrivateRoute allowedRoles={['STUDENT']}>
                <StudentDashboard />
              </PrivateRoute>
            } />
            <Route path="directory" element={
              <PrivateRoute allowedRoles={['PRINCIPAL', 'HOD', 'STAFF']}>
                <Directory />
              </PrivateRoute>
            } />
            <Route path="history" element={
              <PrivateRoute>
                <LeaveHistory />
              </PrivateRoute>
            } />
            <Route path="settings" element={
              <PrivateRoute allowedRoles={['PRINCIPAL']}>
                <Settings />
              </PrivateRoute>
            } />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
