import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import AuthShell from './auth/AuthShell.jsx';
const API_URL = import.meta.env.VITE_API_URL;
// ─── tiny building-block icon ───────────────────────────────────────────────
const OrgIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    <line x1="12" y1="12" x2="12" y2="12.01" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// ─── main component ──────────────────────────────────────────────────────────
const Login = () => {
  const navigate = useNavigate();

  // step: 'credentials' | 'org_picker'
  const [step, setStep] = useState('credentials');

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [orgs, setOrgs]           = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(null); // { _id, name }
  const [pendingUser, setPendingUser] = useState(null);  // { email, password }

  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  // ── Step 1: validate credentials ──────────────────────────────────────────
  const handleCredentials = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email: formData.email,
        password: formData.password,
      });
      const data = response.data;

      // Non-customer roles → token comes back immediately
      if (data.token) {
        persistSession(data);
        routeByRole(data.role);
        return;
      }

      // Customer → server asks us to pick an org
      if (data.status === 'org_selection_required') {
        setOrgs(data.organizations || []);
        setPendingUser({ email: formData.email, password: formData.password });
        setStep('org_picker');
        return;
      }

      setError('Unexpected server response. Please try again.');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials or server error');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: confirm chosen org ────────────────────────────────────────────
  const handleOrgConfirm = async () => {
    if (!selectedOrg) return;
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email: pendingUser.email,
        password: pendingUser.password,
        selectedOrganizationId: selectedOrg._id,
      });
      const data = response.data;
      persistSession(data);
      routeByRole(data.role);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not complete login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── helpers ───────────────────────────────────────────────────────────────
  const persistSession = (data) => {
    sessionStorage.setItem('token',          data.token);
    sessionStorage.setItem('userRole',       data.role);
    sessionStorage.setItem('userId',         data._id);
    sessionStorage.setItem('userName',       data.name);
    sessionStorage.setItem('userEmail',      data.email);
    if (data.organizationId) {
      sessionStorage.setItem('organizationId', data.organizationId);
    }
    if (data.organizationName) {
      sessionStorage.setItem('organizationName', data.organizationName);
    }
  };

  const routeByRole = (role) => {
    if (role === 'Admin')         navigate('/admin-control',    { replace: true });
    else if (role === 'Company_Owner') navigate('/owner-dashboard', { replace: true });
    else if (role === 'Agent')    navigate('/agent',            { replace: true });
    else                          navigate('/dashboard',        { replace: true });
  };

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const goBack = () => {
    setStep('credentials');
    setSelectedOrg(null);
    setOrgs([]);
    setError('');
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <AuthShell
      title={step === 'credentials' ? 'Login' : 'Choose workspace'}
      subtitle={
        step === 'credentials'
          ? 'Enter your credentials to continue to your dashboard.'
          : 'Select the organization you want to raise support requests for.'
      }
      error={error}
      footer={
        step === 'credentials' ? (
          <>Don't have an account? <Link to="/register">Register here</Link></>
        ) : (
          <button
            onClick={goBack}
            style={{ background: 'none', border: 'none', cursor: 'pointer',
                     color: 'var(--ar-accent)', fontWeight: 600, fontSize: 13 }}
          >
            ← Back to sign in
          </button>
        )
      }
    >
      {/* ── STEP 1: credentials form ── */}
      {step === 'credentials' && (
        <form onSubmit={handleCredentials}>
          <div className="ar-field">
            <label className="ar-label" htmlFor="email">Email address</label>
            <input
              id="email"
              className="ar-input"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
          </div>

          <div className="ar-field">
            <label className="ar-label" htmlFor="password">Password</label>
            <input
              id="password"
              className="ar-input"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
            />
          </div>

          <button className="ar-button" type="submit" disabled={loading}>
            {loading ? 'Verifying…' : 'Continue'}
          </button>
        </form>
      )}

      {/* ── STEP 2: org picker ── */}
      {step === 'org_picker' && (
        <div>
          <style>{ORG_PICKER_CSS}</style>

          {orgs.length === 0 ? (
            <p style={{ color: 'var(--ar-muted)', fontSize: 14 }}>
              No organizations found. Please contact your administrator.
            </p>
          ) : (
            <div className="op-list">
              {orgs.map((org) => {
                const isSelected = selectedOrg?._id === org._id;
                return (
                  <button
                    key={org._id}
                    type="button"
                    className={`op-card ${isSelected ? 'op-card--selected' : ''}`}
                    onClick={() => setSelectedOrg(org)}
                  >
                    <span className="op-card-icon">
                      <OrgIcon />
                    </span>
                    <span className="op-card-name">{org.name}</span>
                    {isSelected && (
                      <span className="op-card-check">
                        <CheckIcon />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <button
            className="ar-button"
            type="button"
            disabled={!selectedOrg || loading}
            onClick={handleOrgConfirm}
            style={{ marginTop: 24 }}
          >
            {loading
              ? 'Signing in…'
              : selectedOrg
                ? `Sign in to ${selectedOrg.name}`
                : 'Select an organization'}
          </button>
        </div>
      )}
    </AuthShell>
  );
};

// ── org picker card styles ────────────────────────────────────────────────────
const ORG_PICKER_CSS = `
.op-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 320px;
  overflow-y: auto;
  padding-right: 4px;
}

.op-card {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px 16px;
  border: 1.5px solid var(--ar-line);
  border-radius: 6px;
  background: #f0ede6;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.18s, background 0.18s, box-shadow 0.18s;
  font-family: var(--ar-sans);
  font-size: 14px;
  color: var(--ar-ink-text);
}

.op-card:hover {
  border-color: var(--ar-accent);
  background: #ede8df;
  box-shadow: 0 2px 8px rgba(168,115,47,0.10);
}

.op-card--selected {
  border-color: var(--ar-accent);
  background: rgba(168,115,47,0.08);
  box-shadow: 0 2px 12px rgba(168,115,47,0.14);
}

.op-card-icon {
  flex-shrink: 0;
  color: var(--ar-accent);
  display: flex;
  align-items: center;
}

.op-card-name {
  flex: 1;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.op-card-check {
  flex-shrink: 0;
  color: var(--ar-accent);
  display: flex;
  align-items: center;
}

/* scrollbar */
.op-list::-webkit-scrollbar { width: 4px; }
.op-list::-webkit-scrollbar-track { background: transparent; }
.op-list::-webkit-scrollbar-thumb { background: var(--ar-line); border-radius: 2px; }
`;

export default Login;
