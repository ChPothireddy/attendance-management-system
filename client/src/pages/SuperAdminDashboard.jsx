import { useState, useEffect } from 'react';
import API from '../api/axios';
import { HiOutlineOfficeBuilding, HiOutlineViewGrid, HiOutlineUserGroup, HiOutlineAcademicCap, HiOutlineUsers, HiOutlineBookOpen, HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi';
import toast from 'react-hot-toast';

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState({});
  const [colleges, setColleges] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', address: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, collegesRes] = await Promise.all([
        API.get('/admin/stats'),
        API.get('/admin/colleges'),
      ]);
      setStats(statsRes.data);
      setColleges(collegesRes.data);
    } catch {}
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await API.post('/admin/colleges', form);
      toast.success('College created!');
      setShowModal(false);
      setForm({ name: '', code: '', address: '' });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this college?')) return;
    try {
      await API.delete(`/admin/colleges/${id}`);
      toast.success('College deleted');
      loadData();
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Super Admin Dashboard</h1>
        <p>Manage colleges, branches, and administrators</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon purple"><HiOutlineOfficeBuilding /></div>
          <div className="stat-info"><h3>{stats.colleges || 0}</h3><p>Colleges</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><HiOutlineViewGrid /></div>
          <div className="stat-info"><h3>{stats.branches || 0}</h3><p>Branches</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><HiOutlineUserGroup /></div>
          <div className="stat-info"><h3>{stats.dept_admins || 0}</h3><p>Dept Admins</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon pink"><HiOutlineAcademicCap /></div>
          <div className="stat-info"><h3>{stats.faculty || 0}</h3><p>Faculty</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red"><HiOutlineUsers /></div>
          <div className="stat-info"><h3>{stats.students || 0}</h3><p>Students</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue"><HiOutlineBookOpen /></div>
          <div className="stat-info"><h3>{stats.subjects || 0}</h3><p>Subjects</p></div>
        </div>
      </div>

      <div className="card">
        <div className="section-header">
          <h2>Colleges</h2>
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
            <HiOutlinePlus /> Add College
          </button>
        </div>
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>Address</th>
                <th>Branches</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {colleges.length === 0 ? (
                <tr><td colSpan="5" style={{textAlign:'center',padding:'40px',color:'var(--gray-400)'}}>No colleges yet</td></tr>
              ) : colleges.map(c => (
                <tr key={c.id}>
                  <td style={{fontWeight:600}}>{c.name}</td>
                  <td><span className="badge badge-info">{c.code}</span></td>
                  <td>{c.address || '—'}</td>
                  <td>{c.branch_count}</td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id)}>
                      <HiOutlineTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Create College</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>College Name</label>
                <input className="form-control" placeholder="e.g. Sunrise University" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Code</label>
                <input className="form-control" placeholder="e.g. SRU" value={form.code} onChange={e => setForm({...form, code: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Address</label>
                <input className="form-control" placeholder="Address (optional)" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
