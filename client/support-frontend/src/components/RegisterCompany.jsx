import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthShell from '../components/auth/AuthShell';

const API_URL = import.meta.env.VITE_API_URL;

const RegisterCompany = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    companyName: '',
    ownerName: '',
    ownerEmail: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    if (!formData.companyName || !formData.ownerName || !formData.ownerEmail || !formData.password) {
      return 'All fields are required.';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.ownerEmail)) {
      return 'Please enter a valid email address.';
    }
    if (formData.password.length < 6) {
      return 'Password must be at least 6 characters long.';
    }
    if (formData.password !== formData.confirmPassword) {
      return 'Passwords do not match.';
    }
    return null;
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(''); 
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/register-company`, {
        companyName: formData.companyName,
        ownerName: formData.ownerName,
        ownerEmail: formData.ownerEmail,
        password: formData.password
      });

      // B2B registration usually auto-logs the owner in
      const { token, user } = response.data;
      sessionStorage.setItem('token', token);
      sessionStorage.setItem('userRole', user.role);

      console.log('Company created successfully:', response.data);
      
      // Send them straight to the owner dashboard!
      navigate('/owner-dashboard', { replace: true });
      
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register company. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="For Business"
      title="Register your Company"
      subtitle="Create your workspace and start supporting your customers."
      error={error}
      footer={
        <>
          Already registered? <Link to="/login">Login here</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <div className="ar-field">
          <label className="ar-label" htmlFor="companyName">Company Name</label>
          <input id="companyName" className="ar-input" type="text" name="companyName" value={formData.companyName} onChange={handleChange} placeholder="e.g. Stark Industries" />
        </div>
        <div className="ar-field">
          <label className="ar-label" htmlFor="ownerName">Your Name</label>
          <input id="ownerName" className="ar-input" type="text" name="ownerName" value={formData.ownerName} onChange={handleChange} />
        </div>
        <div className="ar-field">
          <label className="ar-label" htmlFor="ownerEmail">Work Email</label>
          <input id="ownerEmail" className="ar-input" type="email" name="ownerEmail" value={formData.ownerEmail} onChange={handleChange} placeholder="name@yourcompany.com" />
        </div>
        <div className="ar-field">
          <label className="ar-label" htmlFor="password">Password</label>
          <input id="password" className="ar-input" type="password" name="password" value={formData.password} onChange={handleChange} />
        </div>
        <div className="ar-field">
          <label className="ar-label" htmlFor="confirmPassword">Confirm password</label>
          <input id="confirmPassword" className="ar-input" type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} />
        </div>
        <button className="ar-button" type="submit" disabled={loading}>
          {loading ? 'Creating Workspace...' : 'Create Company Workspace'}
        </button>
      </form>
    </AuthShell>
  );
};

export default RegisterCompany;