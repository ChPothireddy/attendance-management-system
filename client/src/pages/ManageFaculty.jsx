import { useState, useEffect } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi';

export default function ManageFaculty() {
  const [faculty, setFaculty] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });

  useEffect(() => { load(); }, []);
  const load = () => API.get('/department/faculty').then(r => setFaculty(r.data)).catch(() => {});

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await API.post('/department/faculty', form);
      toast.success('Faculty created!');
      setShowModal(false);
      setForm({ name: '', email: '', password: '', phone: '' });
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this faculty member?')) return;
    try { await API.delete(`/department/faculty/${id}`); toast.success('Deleted'); load(); }
    catch { toast.error('Failed'); }
  };

  return (
    <div className="page-container">
      <div className="page-header"><h1>Faculty</h1><p>Manage faculty members in your department</p></div>
      <div className="card">
        <div className="section-header">
          <h2>All Faculty</h2>
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}><HiOutlinePlus /> Add Faculty</button>
        </div>
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Actions</th></tr></thead>
            <tbody>
              {faculty.length === 0 ? <tr><td colSpan="4" style={{textAlign:'center',padding:'40px',color:'var(--gray-400)'}}>No faculty</td></tr> :
              faculty.map(f => (
                <tr key={f.id}>
                  <td style={{fontWeight:600}}>{f.name}</td>
                  <td>{f.email}</td>
                  <td>{f.phone || '—'}</td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => handleDelete(f.id)}><HiOutlineTrash /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Add Faculty</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group"><label>Full Name</label><input className="form-control" placeholder="Prof. Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
              <div className="form-row">
                <div className="form-group"><label>Email</label><input type="email" className="form-control" placeholder="email@university.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required /></div>
                <div className="form-group"><label>Password</label><input type="password" className="form-control" placeholder="Initial password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required /></div>
              </div>
              <div className="form-group"><label>Phone</label><input className="form-control" placeholder="Phone number" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
              <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">Create</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
