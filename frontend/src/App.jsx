import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';

// Import Pages
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Budgets from './pages/Budgets';
import Groups from './pages/Groups';
import GroupDetails from './pages/GroupDetails';
import Reports from './pages/Reports';
import AIInsights from './pages/AIInsights';
import VoiceAssistant from './pages/VoiceAssistant';
import Profile from './pages/Profile';

// Import Components
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

// Route Guard for Regular Users
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0c10',
        color: 'var(--text-secondary)'
      }}>
        Loading your workspace session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

// Layout Assembler for Protected Routes
const LayoutWrapper = ({ children, pageTitle }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="app-container">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Navbar toggleSidebar={toggleSidebar} pageTitle={pageTitle} />
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
};

// Internal router component to safely consume Auth context
const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected User Pages */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <LayoutWrapper pageTitle="Overview Dashboard">
            <Dashboard />
          </LayoutWrapper>
        </ProtectedRoute>
      } />
      
      <Route path="/transactions" element={
        <ProtectedRoute>
          <LayoutWrapper pageTitle="Transaction Ledger">
            <Transactions />
          </LayoutWrapper>
        </ProtectedRoute>
      } />

      <Route path="/budgets" element={
        <ProtectedRoute>
          <LayoutWrapper pageTitle="Budget Planning">
            <Budgets />
          </LayoutWrapper>
        </ProtectedRoute>
      } />

      <Route path="/groups" element={
        <ProtectedRoute>
          <LayoutWrapper pageTitle="Shared Groups Ledger">
            <Groups />
          </LayoutWrapper>
        </ProtectedRoute>
      } />

      <Route path="/groups/:id" element={
        <ProtectedRoute>
          <LayoutWrapper pageTitle="Group Sharing Detail">
            <GroupDetails />
          </LayoutWrapper>
        </ProtectedRoute>
      } />

      <Route path="/reports" element={
        <ProtectedRoute>
          <LayoutWrapper pageTitle="Reports & Charts Analytics">
            <Reports />
          </LayoutWrapper>
        </ProtectedRoute>
      } />

      <Route path="/ai-insights" element={
        <ProtectedRoute>
          <LayoutWrapper pageTitle="AI Financial Insights">
            <AIInsights />
          </LayoutWrapper>
        </ProtectedRoute>
      } />

      <Route path="/voice-assistant" element={
        <ProtectedRoute>
          <LayoutWrapper pageTitle="Voice Assistant Dashboard">
            <VoiceAssistant />
          </LayoutWrapper>
        </ProtectedRoute>
      } />

      <Route path="/profile" element={
        <ProtectedRoute>
          <LayoutWrapper pageTitle="Profile Configuration">
            <Profile />
          </LayoutWrapper>
        </ProtectedRoute>
      } />

      {/* Fallback Redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

import { LanguageProvider } from './context/LanguageContext';
import { CurrencyProvider } from './context/CurrencyContext';

const App = () => {
  return (
    <Router>
      <LanguageProvider>
        <CurrencyProvider>
          <AuthProvider>
            <NotificationProvider>
              <AppRoutes />
            </NotificationProvider>
          </AuthProvider>
        </CurrencyProvider>
      </LanguageProvider>
    </Router>
  );
};

export default App;
