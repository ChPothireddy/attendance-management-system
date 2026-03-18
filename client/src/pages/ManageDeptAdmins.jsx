import { useState, useEffect } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi';

export default function ManageDeptAdmins() {
  const [admins, setAdmins] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [branches, setBranches] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', college_id: '', branch_id: '', phone: '' });

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [a, c, b] = await Promise.all([
        API.get('/admin/dept-admins'),
        API.get('/admin/colleges'),
        API.get('/admin/branches'),
      ]);
      setAdmins(a.data);
      setColleges(c.data);
      setBranches(b.data);
    } catch {}
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await API.post('/admin/dept-admins', { ...form, college_id: +form.college_id, branch_id: +form.branch_id });
      toast.success('Dept Admin created!');
      setShowModal(false);
      setForm({ name: '', email: '', password: '', college_id: '', branch_id: '', phone: '' });
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this admin?')) return;
    try { await API.delete(`/admin/dept-admins/${id}`); toast.success('Deleted'); load(); }
    catch { toast.error('Failed'); }
  };

  const filteredBranches = form.college_id ? branches.filter(b => b.college_id === +form.college_id) : branches;

  return (
    <div className="page-container">
      <div className="page-header"><h1>Department Admins</h1><p>Manage department administrators</p></div>
      <div className="card">
        <div className="section-header">
          <h2>All Dept Admins</h2>
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}><HiOutlinePlus /> Add Admin</button>
        </div>
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Email</th><th>College</th><th>Branch</th><th>Actions</th></tr></thead>
            <tbody>
              {admins.length === 0 ? <tr><td colSpan="5" style={{textAlign:'center',padding:'40px',color:'var(--gray-400)'}}>No admins</td></tr> :
              admins.map(a => (
                <tr key={a.id}>
                  <td style={{fontWeight:600}}>{a.name}</td>
                  <td>{a.email}</td>
                  <td>{a.college_name}</td>
                  <td><span className="badge badge-info">{a.branch_name}</span></td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => handleDelete(a.id)}><HiOutlineTrash /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Add Dept Admin</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group"><label>Name</label><input className="form-control" placeholder="Dr. Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
              <div className="form-row">
                <div className="form-group"><label>Email</label><input type="email" className="form-control" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required /></div>
                <div className="form-group"><label>Password</label><input type="password" className="form-control" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>College</label><select className="form-control" value={form.college_id} onChange={e => setForm({...form, college_id: e.target.value})} required><option value="">Select</option>{colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                <div className="form-group"><label>Branch</label><select className="form-control" value={form.branch_id} onChange={e => setForm({...form, branch_id: e.target.value})} required><option value="">Select</option>{filteredBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
              </div>
              <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">Create</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
