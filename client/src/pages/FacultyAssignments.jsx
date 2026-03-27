import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { HiOutlineDocumentAdd, HiOutlineDownload, HiOutlineUpload } from 'react-icons/hi';

import API from '../api/axios';

export default function FacultyAssignments() {
  const [allocations, setAllocations] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [grading, setGrading] = useState({});
  const [form, setForm] = useState({
    title: '',
    description: '',
    section_key: '',
    due_date: '',
    marks_slot: '',
    max_marks: '',
    attachment: null,
  });

  const sectionOptions = useMemo(() => {
    const unique = new Map();
    allocations.forEach((allocation) => {
      const key = `${allocation.section_id}-${allocation.subject_code}`;
      if (!unique.has(key)) unique.set(key, allocation);
    });
    return Array.from(unique.values());
  }, [allocations]);

  const filteredAssignments = selectedSection
    ? assignments.filter((assignment) => assignment.section_id === Number(selectedSection))
    : assignments;

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!selectedAssignment) return;
    API.get(`/faculty/assignments/${selectedAssignment.assignment_id}/submissions`)
      .then((response) => {
        setSubmissions(response.data);
        const nextGrading = {};
        response.data.forEach((row) => {
          nextGrading[row.student_id] = {
            marks_awarded: row.marks_awarded ?? '',
            feedback: row.feedback || '',
          };
        });
        setGrading(nextGrading);
      })
      .catch(() => {
        setSubmissions([]);
      });
  }, [selectedAssignment]);

  const load = async () => {
    try {
      const [allocationsRes, assignmentsRes] = await Promise.all([
        API.get('/faculty/allocations'),
        API.get('/faculty/assignments'),
      ]);
      setAllocations(allocationsRes.data || []);
      setAssignments(assignmentsRes.data || []);
    } catch {
      toast.error('Failed to load assignments');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const selectedAlloc = sectionOptions.find((option) => `${option.section_id}-${option.subject_code}` === form.section_key);
    if (!selectedAlloc) {
      toast.error('Select a section and subject');
      return;
    }

    const payload = new FormData();
    payload.append('title', form.title);
    payload.append('description', form.description);
    payload.append('subject_code', selectedAlloc.subject_code);
    payload.append('section_id', selectedAlloc.section_id);
    payload.append('due_date', form.due_date);
    if (form.marks_slot) payload.append('marks_slot', form.marks_slot);
    if (form.max_marks) payload.append('max_marks', form.max_marks);
    if (form.attachment) payload.append('attachment', form.attachment);

    try {
      await API.post('/faculty/assignments', payload);
      toast.success('Assignment created');
      setForm({
        title: '',
        description: '',
        section_key: '',
        due_date: '',
        marks_slot: '',
        max_marks: '',
        attachment: null,
      });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handleGrade = async (studentId) => {
    if (!selectedAssignment) return;
    try {
      await API.post(`/faculty/assignments/${selectedAssignment.assignment_id}/submissions/${studentId}/grade`, grading[studentId]);
      toast.success('Submission graded');
      const response = await API.get(`/faculty/assignments/${selectedAssignment.assignment_id}/submissions`);
      setSubmissions(response.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Assignments</h1>
        <p>Create assignments for your sections, review submissions, and grade them.</p>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="section-header">
          <h2>Create Assignment</h2>
          <span className="badge badge-info"><HiOutlineDocumentAdd /> Faculty Upload</span>
        </div>
        <form onSubmit={handleCreate}>
          <div className="form-row">
            <div className="form-group">
              <label>Section & Subject</label>
              <select className="form-control" value={form.section_key} onChange={(e) => setForm({ ...form, section_key: e.target.value })} required>
                <option value="">Select section and subject</option>
                {sectionOptions.map((option) => (
                  <option key={`${option.section_id}-${option.subject_code}`} value={`${option.section_id}-${option.subject_code}`}>
                    Section {option.section_name} - {option.subject_code} ({option.subject_name})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Due Date</label>
              <input type="date" className="form-control" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Title</label>
              <input className="form-control" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Assignment title" required />
            </div>
            <div className="form-group">
              <label>Marks Slot</label>
              <select className="form-control" value={form.marks_slot} onChange={(e) => setForm({ ...form, marks_slot: e.target.value })}>
                <option value="">No marks sync</option>
                <option value="assignment1">Assignment 1</option>
                <option value="assignment2">Assignment 2</option>
              </select>
            </div>
            <div className="form-group">
              <label>Max Marks</label>
              <input type="number" className="form-control" value={form.max_marks} onChange={(e) => setForm({ ...form, max_marks: e.target.value })} min="1" placeholder="Optional" />
            </div>
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea className="form-control" rows="4" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Instructions for students" />
          </div>
          <div className="form-group">
            <label>Attachment</label>
            <input type="file" className="form-control" onChange={(e) => setForm({ ...form, attachment: e.target.files?.[0] || null })} />
          </div>
          <div className="modal-actions">
            <button type="submit" className="btn btn-primary">
              <HiOutlineUpload /> Create Assignment
            </button>
          </div>
        </form>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="toolbar">
          <div className="toolbar-left">
            <h2>Assignment List</h2>
          </div>
          <select className="form-control" style={{ width: '220px' }} value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)}>
            <option value="">All Sections</option>
            {[...new Map(assignments.map((assignment) => [assignment.section_id, assignment])).values()].map((assignment) => (
              <option key={assignment.section_id} value={assignment.section_id}>
                Section {assignment.section_name}
              </option>
            ))}
          </select>
        </div>
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Section</th>
                <th>Subject</th>
                <th>Due Date</th>
                <th>Submitted</th>
                <th>File</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssignments.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--gray-400)' }}>No assignments yet</td></tr>
              ) : (
                filteredAssignments.map((assignment) => (
                  <tr key={assignment.assignment_id} style={{ cursor: 'pointer' }} onClick={() => setSelectedAssignment(assignment)}>
                    <td style={{ fontWeight: 600 }}>{assignment.title}</td>
                    <td>{assignment.section_name}</td>
                    <td>{assignment.subject_code}</td>
                    <td>{assignment.due_date || 'N/A'}</td>
                    <td>{assignment.submissions_count}/{assignment.total_students}</td>
                    <td>
                      {assignment.attachment_url ? (
                        <a href={`http://localhost:5000${assignment.attachment_url}`} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
                          <HiOutlineDownload /> View
                        </a>
                      ) : 'No file'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedAssignment && (
        <div className="card">
          <div className="section-header">
            <h2>Submissions for {selectedAssignment.title}</h2>
            <span className="badge badge-info">{selectedAssignment.subject_code}</span>
          </div>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Student</th>
                  <th>Status</th>
                  <th>Submission</th>
                  <th>Marks</th>
                  <th>Feedback</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((row) => (
                  <tr key={row.student_id}>
                    <td><span className="badge badge-info">{row.roll_no}</span></td>
                    <td>{row.student_name}</td>
                    <td>{row.submitted ? 'Submitted' : 'Pending'}</td>
                    <td>
                      {row.file_url ? (
                        <a href={`http://localhost:5000${row.file_url}`} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
                          <HiOutlineDownload /> Open
                        </a>
                      ) : 'No submission'}
                    </td>
                    <td>
                      <input
                        type="number"
                        className="form-control"
                        style={{ width: '90px' }}
                        value={grading[row.student_id]?.marks_awarded ?? ''}
                        onChange={(e) => setGrading({
                          ...grading,
                          [row.student_id]: { ...grading[row.student_id], marks_awarded: e.target.value },
                        })}
                        disabled={!row.submitted}
                      />
                    </td>
                    <td>
                      <input
                        className="form-control"
                        value={grading[row.student_id]?.feedback ?? ''}
                        onChange={(e) => setGrading({
                          ...grading,
                          [row.student_id]: { ...grading[row.student_id], feedback: e.target.value },
                        })}
                        disabled={!row.submitted}
                      />
                    </td>
                    <td>
                      <button className="btn btn-primary btn-sm" disabled={!row.submitted} onClick={() => handleGrade(row.student_id)}>
                        Save Grade
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
