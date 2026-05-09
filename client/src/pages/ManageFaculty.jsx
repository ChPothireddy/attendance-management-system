import { useState, useEffect } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi';

export default function ManageFaculty() {
  const [faculty, setFaculty] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState(null);
  const [allocatingFaculty, setAllocatingFaculty] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [batches, setBatches] = useState([]);
  const [sections, setSections] = useState([]);
  const [allocForm, setAllocForm] = useState({ batch_id: '', section_id: '', subject_code: '' });
  const [filteredSubjects, setFilteredSubjects] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', designation: '' });

  useEffect(() => {
    load();
    API.get('/department/subjects').then(r => setSubjects(r.data)).catch(() => {});
    API.get('/department/batches').then(r => setBatches(r.data)).catch(() => {});
    API.get('/department/sections/flat').then(r => setSections(r.data)).catch(() => {});
  }, []);
  const load = () => API.get('/department/faculty').then(r => setFaculty(r.data)).catch(() => {});

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await API.post('/department/faculty', form);
      toast.success('Faculty created!');
      setShowModal(false);
      setForm({ name: '', email: '', password: '', phone: '', designation: '' });
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this faculty member?')) return;
    try { await API.delete(`/department/faculty/${id}`); toast.success('Deleted'); load(); }
    catch { toast.error('Failed'); }
  };

  const handleEdit = (faculty) => {
    setEditingFaculty(faculty);
    setForm({ name: faculty.name, email: faculty.email, phone: faculty.phone || '', designation: faculty.designation || '' });
  };

  const handleAllocate = (facultyId) => {
    setAllocatingFaculty(facultyId);
    setAllocForm({ batch_id: '', section_id: '', subject_code: '' });
    setFilteredSubjects([]);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await API.put(`/department/faculty/${editingFaculty.id}`, form);
      toast.success('Faculty updated!');
      setEditingFaculty(null);
      setForm({ name: '', email: '', password: '', phone: '', designation: '' });
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const loadSubjectsForSection = async (sectionId) => {
    if (!sectionId) {
      setFilteredSubjects([]);
      return;
    }
    try {
      const res = await API.get(`/department/subjects?section_id=${sectionId}`);
      const matched = res.data || [];
      if (!matched.length) {
        const section = sections.find((s) => String(s.id) === String(sectionId));
        if (section) {
          const fallback = subjects.filter((subject) => subject.semester === section.current_semester);
          setFilteredSubjects(fallback);
          return;
        }
      }
      setFilteredSubjects(matched);
    } catch (err) {
      setFilteredSubjects([]);
      toast.error('Failed to load subjects for section');
    }
  };

  const handleClearAllocations = async (facultyId) => {
    if (!confirm('Clear all allocations for this faculty member?')) return;
    try {
      await API.delete(`/department/faculty/${facultyId}/allocations`);
      toast.success('All allocations cleared');
      load();
    } catch (err) { toast.error('Failed to clear allocations'); }
  };

  const handleAllocSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        batch_id: +allocForm.batch_id,
        section_id: +allocForm.section_id,
        subject_code: allocForm.subject_code,
      };
      await API.post(`/department/faculty/${allocatingFaculty}/allocations`, payload);
      toast.success('Allocated');
      setAllocatingFaculty(null);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
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
            <thead><tr><th>ID</th><th>Name</th><th>Allocated Subjects (Section-Code)</th><th>Actions</th></tr></thead>
            <tbody>
              {faculty.length === 0 ? <tr><td colSpan="4" style={{textAlign:'center',padding:'40px',color:'var(--gray-400)'}}>No faculty</td></tr> :
              faculty.map(f => (
                <tr key={f.id}>
                  <td style={{fontWeight:600}}>{f.id}</td>
                  <td>{f.name}</td>
                  <td>
                    <div style={{display:'flex', gap:'6px', flexWrap:'wrap'}}>
                      {f.allocations.length === 0 ? 'None' : f.allocations.map((a, idx) => (
                        <span key={idx} style={{background:'var(--blue-100)', color:'var(--blue-700)', padding:'4px 8px', borderRadius:'4px', fontSize:'12px', fontWeight:'500', display:'inline-flex', alignItems:'center', gap:'6px'}}>
                          {a.display}
                          <button type="button" style={{border:'none', background:'transparent', color:'var(--red-600)', cursor:'pointer', fontWeight:'bold'}} onClick={async () => {
                            if (!confirm('Delete this allocation?')) return;
                            try {
                              await API.delete('/department/allocations', { data: { faculty_id: f.id, batch_id: a.batch_id, section_id: a.section_id, subject_code: a.subject_code } });
                              toast.success('Allocation removed');
                              load();
                            } catch (err) { toast.error(err.response?.data?.error || 'Failed to delete allocation'); }
                          }}>×</button>
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div style={{display:'flex', gap:'4px'}}>
                      <button className="btn btn-info btn-sm" onClick={() => handleEdit(f)}>Edit</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleAllocate(f.id)}>Allocate</button>
                      <button className="btn btn-warning btn-sm" onClick={() => handleClearAllocations(f.id)} disabled={f.allocations.length === 0}>Clear All</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(f.id)}><HiOutlineTrash /></button>
                    </div>
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
            <h2>Add Faculty</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group"><label>Full Name</label><input className="form-control" placeholder="Prof. Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
              <div className="form-row">
                <div className="form-group"><label>Email</label><input type="email" className="form-control" placeholder="email@university.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required /></div>
                <div className="form-group"><label>Password</label><input type="password" className="form-control" placeholder="Initial password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required /></div>
              </div>
              <div className="form-group"><label>Phone</label><input className="form-control" placeholder="Phone number" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
              <div className="form-group"><label>Designation</label><input className="form-control" placeholder="e.g., Assistant Professor" value={form.designation} onChange={e => setForm({...form, designation: e.target.value})} /></div>
              <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">Create</button></div>
            </form>
          </div>
        </div>
      )}
      {editingFaculty && (
        <div className="modal-overlay" onClick={() => setEditingFaculty(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Edit Faculty</h2>
            <form onSubmit={handleUpdate}>
              <div className="form-group"><label>Full Name</label><input className="form-control" placeholder="Prof. Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
              <div className="form-group"><label>Email</label><input type="email" className="form-control" placeholder="email@university.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required /></div>
              <div className="form-group"><label>Phone</label><input className="form-control" placeholder="Phone number" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
              <div className="form-group"><label>Designation</label><input className="form-control" placeholder="e.g., Assistant Professor" value={form.designation} onChange={e => setForm({...form, designation: e.target.value})} /></div>
              <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setEditingFaculty(null)}>Cancel</button><button type="submit" className="btn btn-primary">Update</button></div>
            </form>
          </div>
        </div>
      )}
      {allocatingFaculty && (
        <div className="modal-overlay" onClick={() => setAllocatingFaculty(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Allocate Subject</h2>
            <form onSubmit={handleAllocSubmit}>
              <div className="form-row">
                <div className="form-group"><label>Batch</label><select className="form-control" value={allocForm.batch_id} onChange={e => setAllocForm({...allocForm, batch_id: e.target.value, section_id: ''})} required><option value="">Select batch</option>{batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
                <div className="form-group"><label>Section</label><select className="form-control" value={allocForm.section_id} onChange={e => { setAllocForm({...allocForm, section_id: e.target.value, subject_code: ''}); loadSubjectsForSection(e.target.value); }} required disabled={!allocForm.batch_id}><option value="">Select section</option>{sections.filter(s => s.batch_id == allocForm.batch_id).map(s => <option key={s.id} value={s.id}>Sec {s.name} (Sem {s.current_semester})</option>)}</select></div>
              </div>
              <div className="form-group"><label>Subject</label><select className="form-control" value={allocForm.subject_code} onChange={e => setAllocForm({...allocForm, subject_code: e.target.value})} required>
                <option value="">Select subject</option>
                {filteredSubjects.map(s => <option key={s.code} value={s.code}>{s.code} - {s.name}</option>)}
              </select></div>
              <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setAllocatingFaculty(null)}>Cancel</button><button type="submit" className="btn btn-primary">Allocate</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
