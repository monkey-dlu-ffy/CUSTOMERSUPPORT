import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import AdminControl from './components/AdminControl';
import AgentDashboard from './components/AgentDashboard';
import Archive from './components/Archive';
import ArticleManager from './components/ArticleManager';
import HelpCenter from './components/HelpCenter';
import CompanyOwnerDashboard from './components/CompanyOwnerDashboard';
import RegisterCompany from './components/RegisterCompany'; 
import GlobalSocketListener from './components/GlobalSocketListener';
import ToastContainer from './components/ui/ToastContainer';
import SupportChat from './components/SupportChat';
// Helper: get the home route for the current user's role
const getRoleHome = (role) => {
  if (role === 'Admin') return '/admin-control';
  if (role === 'Company_Owner') return '/owner-dashboard';
  if (role === 'Agent') return '/agent';
  return '/dashboard'; // Customer
};

// --- THE BOUNCER (For Protected Pages) ---
// Prevents logged-out users from seeing dashboards.
// If a logged-in user tries to access a route they're not allowed on,
// they get bounced back to THEIR OWN dashboard (not /login).
const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = sessionStorage.getItem('token');
  const userRole = sessionStorage.getItem('userRole');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    // Don't send them to /login — send them back to their own workspace
    return <Navigate to={getRoleHome(userRole)} replace />;
  }

  return children;
};

// --- THE REVERSE BOUNCER (For Public Pages) ---
// Prevents logged-in users from seeing Login/Register pages via the back button
const PublicRoute = ({ children }) => {
  const token = sessionStorage.getItem('token');
  const userRole = sessionStorage.getItem('userRole');

  if (token) {
    // Instantly route them back to their correct workspace if they hit 'back'
    return <Navigate to={getRoleHome(userRole)} replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <div className="app-container">
        <GlobalSocketListener />
        <ToastContainer />
        <Routes>
          {/* Default Route: go to role dashboard if logged in, else go to login */}
          <Route
            path="/"
            element={(() => {
              const token = sessionStorage.getItem('token');
              const userRole = sessionStorage.getItem('userRole');
              return token
                ? <Navigate to={getRoleHome(userRole)} replace />
                : <Navigate to="/login" replace />;
            })()}
          />
          
          {/* PUBLIC ROUTES - Wrapped in our Reverse Bouncer */}
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } 
          />
          <Route 
            path="/register" 
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            } 
          />
          <Route 
            path="/register-company" 
            element={
              <PublicRoute>
                <RegisterCompany />
              </PublicRoute>
            } 
          />
          
          {/* PROTECTED ROUTES - Every route has explicit allowedRoles to block URL manipulation */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['Customer']}>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin-control" 
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <AdminControl />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/owner-dashboard" 
            element={
              <ProtectedRoute allowedRoles={['Company_Owner']}>
                <CompanyOwnerDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/agent" 
            element={
              <ProtectedRoute allowedRoles={['Agent', 'Admin']}>
                <AgentDashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route path="/articles" element={<ProtectedRoute allowedRoles={['Admin', 'Company_Owner']}><ArticleManager /></ProtectedRoute>} />
          {/* Archive and Help: accessible by all authenticated roles */}
          <Route path="/archive" element={<ProtectedRoute allowedRoles={['Customer', 'Agent', 'Admin', 'Company_Owner']}><Archive /></ProtectedRoute>} />
          <Route path="/help" element={<ProtectedRoute allowedRoles={['Customer', 'Agent', 'Admin', 'Company_Owner']}><HelpCenter /></ProtectedRoute>} />
        </Routes>
        <SupportChat />
      </div>
    </Router>
  );
}

export default App;