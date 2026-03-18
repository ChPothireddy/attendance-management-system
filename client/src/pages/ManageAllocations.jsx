import { useState, useEffect } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi';

export default function ManageAllocations() {
  const [allocations, setAllocations] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ faculty_id: '', section_id: '', subject_id: '' });

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [a, f, s, sub] = await Promise.all([
        API.get('/department/allocations'),
        API.get('/department/faculty'),
        API.get('/department/sections'),
        API.get('/department/subjects'),
      ]);
      setAllocations(a.data);
      setFaculty(f.data);
      setSections(s.data);
      setSubjects(sub.data);
    } catch {}
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await API.post('/department/allocations', {
        faculty_id: +form.faculty_id, section_id: +form.section_id, subject_id: +form.subject_id,
      });
      toast.success('Allocation created!');
      setShowModal(false);
      setForm({ faculty_id: '', section_id: '', subject_id: '' });
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this allocation?')) return;
    try { await API.delete(`/department/allocations/${id}`); toast.success('Removed'); load(); }
    catch { toast.error('Failed'); }
  };

  return (
    <div className="page-container">
      <div className="page-header"><h1>Faculty Allocations</h1><p>Assign faculty to sections & subjects</p></div>
      <div className="card">
        <div className="section-header">
          <h2>All Allocations</h2>
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}><HiOutlinePlus /> New Allocation</button>
        </div>
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead><tr><th>Faculty</th><th>Section</th><th>Subject</th><th>Actions</th></tr></thead>
            <tbody>
              {allocations.length === 0 ? <tr><td colSpan="4" style={{textAlign:'center',padding:'40px',color:'var(--gray-400)'}}>No allocations</td></tr> :
              allocations.map(a => (
                <tr key={a.id}>
                  <td style={{fontWeight:600}}>{a.faculty_name}</td>
                  <td>Section {a.section_name}</td>
                  <td><span className="badge badge-info">{a.subject_code}</span> {a.subject_name}</td>
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
            <h2>New Allocation</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group"><label>Faculty</label><select className="form-control" value={form.faculty_id} onChange={e => setForm({...form, faculty_id: e.target.value})} required><option value="">Select faculty</option>{faculty.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></div>
              <div className="form-group"><label>Section</label><select className="form-control" value={form.section_id} onChange={e => setForm({...form, section_id: e.target.value})} required><option value="">Select section</option>{sections.map(s => <option key={s.id} value={s.id}>Sec {s.name} — Sem {s.semester}</option>)}</select></div>
              <div className="form-group"><label>Subject</label><select className="form-control" value={form.subject_id} onChange={e => setForm({...form, subject_id: e.target.value})} required><option value="">Select subject</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}</select></div>
              <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">Create</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
