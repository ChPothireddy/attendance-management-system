import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { HiOutlinePencil, HiOutlinePlus, HiOutlineTrash, HiOutlineUpload } from 'react-icons/hi';

import API from '../api/axios';

const emptyForm = {
  name: '',
  email: '',
  password: '',
  roll_no: '',
  batch_id: '',
  program_id: '',
  section_id: '',
  phone: '',
  student_type: 'Regular',
  passport_number: '',
  category: '',
  entrance_marks: 0,
};

export default function ManageStudents() {
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [sections, setSections] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingStudent, setEditingStudent] = useState(null);
  const [filters, setFilters] = useState({ batch_id: '', program_id: '', semester: '', type: '', attendance_under_75: false });
  const [bulkFile, setBulkFile] = useState(null);

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditingStudent(null);
  };

  const load = async () => {
    try {
      const [stu, bt, pr, sec] = await Promise.all([
        API.get('/department/students'),
        API.get('/department/batches'),
        API.get('/department/programs'),
        API.get('/department/sections/flat'),
      ]);
      setStudents(stu.data || []);
      setBatches(bt.data || []);
      setPrograms(pr.data || []);
      setSections(sec.data || []);
    } catch (err) {
      toast.error('Failed to load data');
    }
  };

  const openEditModal = (student) => {
    setEditingStudent(student);
    setForm({
      name: student.name || '',
      email: student.email || '',
      password: '',
      roll_no: student.roll_no || '',
      batch_id: student.batch_id || '',
      program_id: student.program_id || '',
      section_id: student.section_id || '',
      phone: student.phone || '',
      student_type: student.student_type || 'Regular',
      passport_number: student.passport_number || '',
      category: student.category || '',
      entrance_marks: student.entrance_marks || 0,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        batch_id: Number(form.batch_id),
        section_id: Number(form.section_id),
      };
      if (editingStudent && !payload.password) {
        delete payload.password;
      }

      if (editingStudent) {
        await API.put(`/department/students/${editingStudent.id}`, payload);
        toast.success('Student updated!');
      } else {
        await API.post('/department/students', payload);
        toast.success('Student created!');
      }
      closeModal();
      resetForm();
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this student?')) return;
    try {
      await API.delete(`/department/students/${id}`);
      toast.success('Deleted');
      load();
    } catch {
      toast.error('Failed');
    }
  };

  const handleBulkUpload = async () => {
    if (!bulkFile) { toast.error('Select a file first'); return; }
    const formData = new FormData();
    formData.append('file', bulkFile);
    try {
      const res = await API.post('/department/students/bulk', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(`Imported ${res.data.created} students`);
      if (res.data.errors && res.data.errors.length > 0) {
        toast.error(`Errors: ${res.data.errors.length}. Check console.`);
        console.error('bulk upload errors', res.data.errors);
      }
      setBulkFile(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Bulk upload failed');
    }
  };

  const updateFilter = (key, value) => setFilters((old) => ({ ...old, [key]: value }));

  const handleClearStudents = async () => {
    if (!confirm('Delete all student data?')) return;
    try {
      await API.post('/department/students/reset', { students: [] });
      toast.success('All students cleared');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to clear students');
    }
  };

  const filteredStudents = students
    .filter((student) => (!filters.batch_id || String(student.batch_id) === String(filters.batch_id)))
    .filter((student) => (!filters.program_id || String(student.program_id) === String(filters.program_id)))
    .filter((student) => (!filters.semester || String(student.section_current_semester || student.semester || '') === String(filters.semester)))
    .filter((student) => (!filters.type || String(student.student_type) === String(filters.type)))
    .filter((student) => (!filters.attendance_under_75 || Number(student.attendance_pct) < 75));

  return (
    <div className="page-container">
      <div className="page-header"><h1>Students</h1><p>Manage students in your department</p></div>

      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="section-header"><h2>Filters</h2></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '8px' }}>
          <select className="form-control" value={filters.batch_id} onChange={(e) => updateFilter('batch_id', e.target.value)}>
            <option value="">All Batches</option>
            {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select className="form-control" value={filters.program_id} onChange={(e) => updateFilter('program_id', e.target.value)}>
            <option value="">All Programs</option>
            {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select className="form-control" value={filters.semester} onChange={(e) => updateFilter('semester', e.target.value)}>
            <option value="">All Semesters</option>
            {[1,2,3,4,5,6,7,8].map((n) => <option key={n} value={n}>Sem {n}</option>)}
          </select>
          <select className="form-control" value={filters.type} onChange={(e) => updateFilter('type', e.target.value)}>
            <option value="">All Types</option>
            {['Regular', 'Foreigner', 'NRI'].map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input type="checkbox" checked={filters.attendance_under_75} onChange={(e) => updateFilter('attendance_under_75', e.target.checked)} />
            {'Attendance < 75%'}
          </label>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setShowModal(true); }}><HiOutlinePlus /> Add Student</button>
            <button className="btn btn-warning btn-sm" onClick={handleClearStudents}>Clear All Students</button>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => setBulkFile(e.target.files?.[0] || null)} />
            <button className="btn btn-secondary btn-sm" onClick={handleBulkUpload} disabled={!bulkFile}><HiOutlineUpload /> Bulk Upload</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="data-table-wrapper">
          <table className="data-table student-data-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Roll No</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Type</th>
                <th>Passport</th>
                <th>Category</th>
                <th>Entrance Marks</th>
                <th>Attendance %</th>
                <th>Total Marks</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr><td colSpan="12" style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-400)' }}>No students found</td></tr>
              ) : (
                filteredStudents.map((student, idx) => (
                  <tr key={student.id}>
                    <td>{idx + 1}</td>
                    <td>{student.roll_no}</td>
                    <td>{student.name}</td>
                    <td>{student.email}</td>
                    <td>{student.phone}</td>
                    <td>{student.student_type}</td>
                    <td>{student.passport_number || '-'}</td>
                    <td>{student.category || '-'}</td>
                    <td>{student.entrance_marks || 0}</td>
                    <td>{student.attendance_pct || 0}%</td>
                    <td>{student.total_marks || 0}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-secondary btn-sm btn-icon" type="button" onClick={() => openEditModal(student)} title="Edit student"><HiOutlinePencil /></button>
                        <button className="btn btn-danger btn-sm btn-icon" type="button" onClick={() => handleDelete(student.id)} title="Delete student"><HiOutlineTrash /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingStudent ? 'Edit Student' : 'Add Student'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group"><label>Full Name</label><input className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                <div className="form-group"><label>Roll No</label><input className="form-control" value={form.roll_no} onChange={(e) => setForm({ ...form, roll_no: e.target.value })} required /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Email</label><input type="email" className="form-control" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
                <div className="form-group"><label>Password</label><input type="password" className="form-control" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editingStudent} placeholder={editingStudent ? 'Leave blank to keep current password' : ''} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Batch</label><select className="form-control" value={form.batch_id} onChange={(e) => setForm({ ...form, batch_id: e.target.value, section_id: '' })} required><option value="">Select batch</option>{batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.name}</option>)}</select></div>
                <div className="form-group"><label>Program</label><select className="form-control" value={form.program_id} onChange={(e) => setForm({ ...form, program_id: e.target.value })} required><option value="">Select program</option>{programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Section</label><select className="form-control" value={form.section_id} onChange={(e) => setForm({ ...form, section_id: e.target.value })} required disabled={!form.batch_id}><option value="">Select section</option>{sections.filter((section) => section.batch_id == form.batch_id).map((section) => <option key={section.id} value={section.id}>{section.name} (Sem {section.current_semester})</option>)}</select></div>
                <div className="form-group"><label>Type</label><select className="form-control" value={form.student_type} onChange={(e) => setForm({ ...form, student_type: e.target.value })}><option value="Regular">Regular</option><option value="Foreigner">Foreigner</option><option value="NRI">NRI</option></select></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Passport</label><input className="form-control" value={form.passport_number} onChange={(e) => setForm({ ...form, passport_number: e.target.value })} /></div>
                <div className="form-group"><label>Category</label><input className="form-control" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
                <div className="form-group"><label>Entrance Marks</label><input type="number" className="form-control" value={form.entrance_marks} onChange={(e) => setForm({ ...form, entrance_marks: Number(e.target.value) })} min="0" /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Phone</label><input className="form-control" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              </div>
              <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button><button type="submit" className="btn btn-primary">{editingStudent ? 'Update' : 'Create'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
