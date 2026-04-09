import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { HiOutlineAcademicCap } from 'react-icons/hi';
import './Login.css';

const initialForm = {
  college_name: '',
  admin_name: '',
  admin_email: '',
  password: '',
};

export default function RegisterCollege() {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await API.post('/admin/register-college', form);
      await login(form.admin_email, form.password);
      toast.success('College registered successfully');
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page auth-page-register">
      <div className="login-card register-card">
        <div className="login-header">
          <div className="login-logo"><HiOutlineAcademicCap /></div>
          <h1>Create College Workspace</h1>
          <p>Register your college and start with a super admin dashboard right away.</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>College Name</label>
            <input
              className="form-control"
              placeholder="ABC University"
              value={form.college_name}
              onChange={(e) => handleChange('college_name', e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Super Admin Name</label>
            <input
              className="form-control"
              placeholder="Admin name"
              value={form.admin_name}
              onChange={(e) => handleChange('admin_name', e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Super Admin Email</label>
            <input
              type="email"
              className="form-control"
              placeholder="superadmin@college.edu"
              value={form.admin_email}
              onChange={(e) => handleChange('admin_email', e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="Create a password"
              value={form.password}
              onChange={(e) => handleChange('password', e.target.value)}
              required
            />
          </div>
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Creating workspace...' : 'Register and Continue'}
          </button>
        </form>

        <div className="login-footer-link">
          Already have a super admin account? <Link to="/login">Login here</Link>
        </div>
      </div>
    </div>
  );
}
