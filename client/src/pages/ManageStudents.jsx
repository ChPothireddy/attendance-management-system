import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi';

import API from '../api/axios';

const emptyForm = {
  name: '',
  email: '',
  password: '',
  roll_no: '',
  batch_id: '',
  section_id: '',
  phone: '',
};

export default function ManageStudents() {
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [sections, setSections] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [filterSection, setFilterSection] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (selectedBatch) {
      setForm((old) => ({ ...old, batch_id: selectedBatch.id.toString(), section_id: '' }));
    }
  }, [selectedBatch]);

  const resetForm = (batch = selectedBatch) => {
    setForm({
      ...emptyForm,
      batch_id: batch?.id ? batch.id.toString() : '',
    });
  };

  const openModal = () => {
    resetForm();
    setShowModal(true);
  };

  const load = async () => {
    try {
      const [studentsRes, batchesRes, sectionsRes] = await Promise.all([
        API.get('/department/students'),
        API.get('/department/batches'),
        API.get('/department/sections/flat'),
      ]);
      setStudents(studentsRes.data || []);
      setBatches(batchesRes.data || []);
      setSections(sectionsRes.data || []);
    } catch (err) {
      toast.error('Failed to load data');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await API.post('/department/students', {
        ...form,
        batch_id: Number(form.batch_id),
        section_id: Number(form.section_id),
      });
      toast.success('Student created!');
      setShowModal(false);
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

  const handleDeleteBatch = async (batchId) => {
    if (!confirm('Delete ALL students in this batch? This cannot be undone.')) return;
    try {
      await API.delete(`/department/batches/${batchId}/students`);
      toast.success('All batch students deleted!');
      setSelectedBatch(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const batchStats = batches.map((batch) => {
    const batchStudents = students.filter((student) => student.batch_id == batch.id);
    const batchSections = sections.filter((section) => section.batch_id == batch.id);
    return {
      ...batch,
      studentCount: batchStudents.length,
      sectionCount: batchSections.length,
    };
  });

  const filteredStudents = selectedBatch
    ? students.filter((student) => student.batch_id == selectedBatch.id && (!filterSection || student.section_id == filterSection))
    : [];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Students</h1>
        <p>Manage students in your department</p>
      </div>

      {!selectedBatch ? (
        <div className="card">
          <div className="section-header">
            <h2>Batches</h2>
            <button className="btn btn-primary btn-sm" onClick={openModal}>
              <HiOutlinePlus /> Add Student
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))', gap: '16px' }}>
            {batchStats.map((batch) => (
              <div
                key={batch.id}
                className="batch-card"
                onClick={() => setSelectedBatch(batch)}
                style={{ border: '1px solid var(--gray-200)', borderRadius: '8px', padding: '16px', cursor: 'pointer', background: 'var(--white)' }}
              >
                <h3>{batch.name}</h3>
                <p>{batch.program_name || 'Program not set'}</p>
                <p>Students: {batch.studentCount}</p>
                <p>Sections: {batch.sectionCount}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="toolbar">
            <div className="toolbar-left">
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedBatch(null)} style={{ marginRight: '8px' }}>
                Back to Batches
              </button>
              <select className="form-control" style={{ width: '150px' }} value={filterSection} onChange={(e) => setFilterSection(e.target.value)}>
                <option value="">All Sections</option>
                {sections.filter((section) => section.batch_id == selectedBatch.id).map((section) => (
                  <option key={section.id} value={section.id}>
                    Sec {section.name}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-primary btn-sm" onClick={openModal}>
                <HiOutlinePlus /> Add Student
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => handleDeleteBatch(selectedBatch.id)} title="Delete all students in this batch">
                <HiOutlineTrash /> Delete All
              </button>
            </div>
          </div>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Name</th>
                  <th>Section</th>
                  <th>Batch</th>
                  <th>Attendance %</th>
                  <th>Marks</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-400)' }}>
                      No students
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => (
                    <tr key={student.id}>
                      <td><span className="badge badge-info">{student.roll_no}</span></td>
                      <td style={{ fontWeight: 600 }}>{student.name}</td>
                      <td>{student.section_name}</td>
                      <td>{student.batch_name}</td>
                      <td>{student.attendance_pct}%</td>
                      <td>{student.marks}</td>
                      <td>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(student.id)}>
                          <HiOutlineTrash />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add Student</h2>
            <form onSubmit={handleCreate}>
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name</label>
                  <input className="form-control" placeholder="Student name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Roll No</label>
                  <input className="form-control" placeholder="e.g. 22CS001" value={form.roll_no} onChange={(e) => setForm({ ...form, roll_no: e.target.value })} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" className="form-control" placeholder="email@student.edu" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input type="password" className="form-control" placeholder="Initial password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Batch</label>
                  <select className="form-control" value={form.batch_id} onChange={(e) => setForm({ ...form, batch_id: e.target.value, section_id: '' })} required>
                    <option value="">Select batch</option>
                    {batches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.name}{batch.program_name ? ` - ${batch.program_name}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Section</label>
                  <select className="form-control" value={form.section_id} onChange={(e) => setForm({ ...form, section_id: e.target.value })} required disabled={!form.batch_id}>
                    <option value="">Select section</option>
                    {sections.filter((section) => section.batch_id == form.batch_id).map((section) => (
                      <option key={section.id} value={section.id}>
                        Sec {section.name} - Sem {section.current_semester}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Phone</label>
                  <input className="form-control" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
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
