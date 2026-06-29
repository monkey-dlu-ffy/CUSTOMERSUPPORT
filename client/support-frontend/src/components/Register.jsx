import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthShell from '../components/auth/AuthShell';

const API_URL = import.meta.env.VITE_API_URL.replace(/\/$/, "");
console.log("API_URL =", API_URL);

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Form Validation Logic
  const validateForm = () => {
    if (!formData.name || !formData.email || !formData.password) {
      return 'All fields are required.';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
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
    setError(''); // Clear error when user types
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
      const response = await axios.post(`${API_URL}/api/auth/register`, {
        name: formData.name,
        email: formData.email,
        password: formData.password
      });

      console.log('Registration successful:', response.data);
      
      // Overwrite the history stack so they can't click 'back' to this form
      navigate('/login', { replace: true });
      
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
  eyebrow="New Account"
  title="Create your account"
  subtitle="Set up access to your workspace in a minute."
  error={error}
  footer={
    <div className="flex flex-col gap-2 text-center">
      <span>
        Already have an account? <Link to="/login" className="text-primary font-bold">Login here</Link>
      </span>
      <span>
        Are you a business? <Link to="/register-company" className="text-primary font-bold">Register your company</Link>
      </span>
    </div>
  }
>
      <form onSubmit={handleSubmit}>
        <div className="ar-field">
          <label className="ar-label" htmlFor="name">Name</label>
          <input id="name" className="ar-input" type="text" name="name" value={formData.name} onChange={handleChange} />
        </div>
        <div className="ar-field">
          <label className="ar-label" htmlFor="email">Email</label>
          <input id="email" className="ar-input" type="email" name="email" value={formData.email} onChange={handleChange} />
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
          {loading ? 'Registering...' : 'Create account'}
        </button>
      </form>
    </AuthShell>
  );
};

export default Register;