import { useState, useEffect } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi';

export default function ManageStudents() {
  const [students, setStudents] = useState([]);
  const [sections, setSections] = useState([]);
  const [filterSection, setFilterSection] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', enrollment_no: '', section_id: '', phone: '' });

  useEffect(() => {
    API.get('/department/sections').then(r => setSections(r.data)).catch(() => {});
    load();
  }, []);

  const load = () => {
    const url = filterSection ? `/department/students?section_id=${filterSection}` : '/department/students';
    API.get(url).then(r => setStudents(r.data)).catch(() => {});
  };

  useEffect(() => { load(); }, [filterSection]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await API.post('/department/students', { ...form, section_id: +form.section_id });
      toast.success('Student created!');
      setShowModal(false);
      setForm({ name: '', email: '', password: '', enrollment_no: '', section_id: '', phone: '' });
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this student?')) return;
    try { await API.delete(`/department/students/${id}`); toast.success('Deleted'); load(); }
    catch { toast.error('Failed'); }
  };

  return (
    <div className="page-container">
      <div className="page-header"><h1>Students</h1><p>Manage students in your department</p></div>
      <div className="card">
        <div className="toolbar">
          <div className="toolbar-left">
            <select className="form-control" style={{width:'200px'}} value={filterSection} onChange={e => setFilterSection(e.target.value)}>
              <option value="">All Sections</option>
              {sections.map(s => <option key={s.id} value={s.id}>Sec {s.name} — Sem {s.semester}</option>)}
            </select>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}><HiOutlinePlus /> Add Student</button>
        </div>
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead><tr><th>Enrollment</th><th>Name</th><th>Email</th><th>Section</th><th>Phone</th><th>Actions</th></tr></thead>
            <tbody>
              {students.length === 0 ? <tr><td colSpan="6" style={{textAlign:'center',padding:'40px',color:'var(--gray-400)'}}>No students</td></tr> :
              students.map(s => (
                <tr key={s.id}>
                  <td><span className="badge badge-info">{s.enrollment_no}</span></td>
                  <td style={{fontWeight:600}}>{s.name}</td>
                  <td>{s.email}</td>
                  <td>{s.section_name}</td>
                  <td>{s.phone || '—'}</td>
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
            <h2>Add Student</h2>
            <form onSubmit={handleCreate}>
              <div className="form-row">
                <div className="form-group"><label>Full Name</label><input className="form-control" placeholder="Student name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
                <div className="form-group"><label>Enrollment No</label><input className="form-control" placeholder="e.g. SRU2024CSE001" value={form.enrollment_no} onChange={e => setForm({...form, enrollment_no: e.target.value})} required /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Email</label><input type="email" className="form-control" placeholder="email@student.uni.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required /></div>
                <div className="form-group"><label>Password</label><input type="password" className="form-control" placeholder="Initial password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Section</label><select className="form-control" value={form.section_id} onChange={e => setForm({...form, section_id: e.target.value})} required><option value="">Select section</option>{sections.map(s => <option key={s.id} value={s.id}>Sec {s.name} — Sem {s.semester}</option>)}</select></div>
                <div className="form-group"><label>Phone</label><input className="form-control" placeholder="Phone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
              </div>
              <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">Create</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
