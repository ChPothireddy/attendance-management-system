import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HiOutlineAcademicCap } from 'react-icons/hi';
import './Login.css';

const demoAccounts = [
  { label: 'Super Admin', email: 'superadmin@demo.com', password: 'superadmin123' },
  { label: 'Dept Admin',  email: 'admin@demo.com',      password: 'admin123' },
  { label: 'Faculty',     email: 'anil@demo.com',       password: 'faculty123' },
  { label: 'Student',     email: 'sa0@demo.com',        password: 'student123' },
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (account) => {
    setEmail(account.email);
    setPassword(account.password);
    setError('');
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo"><HiOutlineAcademicCap /></div>
          <h1>Welcome Back</h1>
          <p>Sign in to your attendance portal</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              className="form-control"
              placeholder="you@university.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="login-footer-link">
          New college? <Link to="/register">Register here</Link>
        </div>

        <div className="login-demo">
          <p>Demo Accounts</p>
          <div className="demo-accounts">
            {demoAccounts.map((acc) => (
              <button type="button" key={acc.label} className="demo-btn" onClick={() => fillDemo(acc)}>
                {acc.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
