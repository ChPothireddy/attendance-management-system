import { useState, useEffect } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi';

export default function ManageBranches() {
  const [branches, setBranches] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', college_id: '' });

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [b, c] = await Promise.all([API.get('/admin/branches'), API.get('/admin/colleges')]);
      setBranches(b.data);
      setColleges(c.data);
    } catch {}
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await API.post('/admin/branches', { ...form, college_id: +form.college_id });
      toast.success('Branch created!');
      setShowModal(false);
      setForm({ name: '', code: '', college_id: '' });
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this branch?')) return;
    try { await API.delete(`/admin/branches/${id}`); toast.success('Deleted'); load(); }
    catch { toast.error('Failed'); }
  };

  return (
    <div className="page-container">
      <div className="page-header"><h1>Branches</h1><p>Manage departments across colleges</p></div>
      <div className="card">
        <div className="section-header">
          <h2>All Branches</h2>
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}><HiOutlinePlus /> Add Branch</button>
        </div>
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Code</th><th>College</th><th>Sections</th><th>Subjects</th><th>Actions</th></tr></thead>
            <tbody>
              {branches.length === 0 ? <tr><td colSpan="6" style={{textAlign:'center',padding:'40px',color:'var(--gray-400)'}}>No branches</td></tr> :
              branches.map(b => (
                <tr key={b.id}>
                  <td style={{fontWeight:600}}>{b.name}</td>
                  <td><span className="badge badge-info">{b.code}</span></td>
                  <td>{b.college_name}</td>
                  <td>{b.section_count}</td>
                  <td>{b.subject_count}</td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => handleDelete(b.id)}><HiOutlineTrash /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Add Branch</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group"><label>Branch Name</label><input className="form-control" placeholder="e.g. Computer Science" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
              <div className="form-row">
                <div className="form-group"><label>Code</label><input className="form-control" placeholder="e.g. CSE" value={form.code} onChange={e => setForm({...form, code: e.target.value})} required /></div>
                <div className="form-group"><label>College</label><select className="form-control" value={form.college_id} onChange={e => setForm({...form, college_id: e.target.value})} required><option value="">Select</option>{colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              </div>
              <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">Create</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
