import { useState, useEffect } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi';

export default function ManageSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', semester: 1, credits: 3 });

  useEffect(() => { load(); }, []);

  const load = () => API.get('/department/subjects').then(r => setSubjects(r.data)).catch(() => {});

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await API.post('/department/subjects', form);
      toast.success('Subject created!');
      setShowModal(false);
      setForm({ name: '', code: '', semester: 1, credits: 3 });
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this subject?')) return;
    try { await API.delete(`/department/subjects/${id}`); toast.success('Deleted'); load(); }
    catch { toast.error('Failed'); }
  };

  return (
    <div className="page-container">
      <div className="page-header"><h1>Subjects</h1><p>Manage subjects for your department</p></div>
      <div className="card">
        <div className="section-header">
          <h2>All Subjects</h2>
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}><HiOutlinePlus /> Add Subject</button>
        </div>
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Code</th><th>Semester</th><th>Credits</th><th>Actions</th></tr></thead>
            <tbody>
              {subjects.length === 0 ? <tr><td colSpan="5" style={{textAlign:'center',padding:'40px',color:'var(--gray-400)'}}>No subjects</td></tr> :
              subjects.map(s => (
                <tr key={s.id}>
                  <td style={{fontWeight:600}}>{s.name}</td>
                  <td><span className="badge badge-info">{s.code}</span></td>
                  <td>Sem {s.semester}</td>
                  <td>{s.credits}</td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => handleDelete(s.id)}><HiOutlineTrash /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Add Subject</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group"><label>Subject Name</label><input className="form-control" placeholder="e.g. Data Structures" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
              <div className="form-row">
                <div className="form-group"><label>Code</label><input className="form-control" placeholder="e.g. CS301" value={form.code} onChange={e => setForm({...form, code: e.target.value})} required /></div>
                <div className="form-group"><label>Semester</label><select className="form-control" value={form.semester} onChange={e => setForm({...form, semester: +e.target.value})}>{[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}</select></div>
                <div className="form-group"><label>Credits</label><input type="number" className="form-control" min="1" max="6" value={form.credits} onChange={e => setForm({...form, credits: +e.target.value})} /></div>
              </div>
              <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">Create</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
