import { useState, useEffect } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi';

export default function ManageSections() {
  const [sections, setSections] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', semester: 1 });

  useEffect(() => { load(); }, []);

  const load = () => API.get('/department/sections').then(r => setSections(r.data)).catch(() => {});

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await API.post('/department/sections', form);
      toast.success('Section created!');
      setShowModal(false);
      setForm({ name: '', semester: 1 });
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this section?')) return;
    try { await API.delete(`/department/sections/${id}`); toast.success('Deleted'); load(); }
    catch { toast.error('Failed'); }
  };

  return (
    <div className="page-container">
      <div className="page-header"><h1>Sections</h1><p>Manage class sections in your department</p></div>
      <div className="card">
        <div className="section-header">
          <h2>All Sections</h2>
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}><HiOutlinePlus /> Add Section</button>
        </div>
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead><tr><th>Section</th><th>Semester</th><th>Branch</th><th>Actions</th></tr></thead>
            <tbody>
              {sections.length === 0 ? <tr><td colSpan="4" style={{textAlign:'center',padding:'40px',color:'var(--gray-400)'}}>No sections</td></tr> :
              sections.map(s => (
                <tr key={s.id}>
                  <td style={{fontWeight:600}}>Section {s.name}</td>
                  <td><span className="badge badge-info">Sem {s.semester}</span></td>
                  <td>{s.branch_name}</td>
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
            <h2>Add Section</h2>
            <form onSubmit={handleCreate}>
              <div className="form-row">
                <div className="form-group"><label>Section Name</label><input className="form-control" placeholder="e.g. A" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
                <div className="form-group"><label>Semester</label><select className="form-control" value={form.semester} onChange={e => setForm({...form, semester: +e.target.value})}>{[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}</select></div>
              </div>
              <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">Create</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
