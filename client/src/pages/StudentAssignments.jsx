import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { HiOutlineDownload, HiOutlineUpload } from 'react-icons/hi';

import API, { BACKEND_BASE_URL } from '../api/axios';

export default function StudentAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [uploadingId, setUploadingId] = useState(null);

  useEffect(() => {
    load();
  }, []);

  const load = () => {
    API.get('/student/assignments')
      .then((response) => setAssignments(response.data || []))
      .catch(() => toast.error('Failed to load assignments'));
  };

  const handleSubmit = async (assignmentId, file) => {
    if (!file) {
      toast.error('Choose a file first');
      return;
    }

    const payload = new FormData();
    payload.append('submission', file);
    setUploadingId(assignmentId);
    try {
      await API.post(`/student/assignments/${assignmentId}/submit`, payload);
      toast.success('Assignment submitted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Assignments</h1>
        <p>View your assignments, download files, and upload your submissions.</p>
      </div>

      <div className="card">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Subject</th>
                <th>Due Date</th>
                <th>Faculty File</th>
                <th>Status</th>
                <th>Your Submission</th>
                <th>Marks</th>
              </tr>
            </thead>
            <tbody>
              {assignments.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--gray-400)' }}>No assignments available</td></tr>
              ) : (
                assignments.map((assignment) => (
                  <tr key={assignment.assignment_id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{assignment.title}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{assignment.description || 'No description'}</div>
                    </td>
                    <td>{assignment.subject_code}</td>
                    <td>{assignment.due_date || 'N/A'}</td>
                    <td>
                      {assignment.attachment_url ? (
                        <a href={`${BACKEND_BASE_URL}${assignment.attachment_url}`} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
                          <HiOutlineDownload /> Download
                        </a>
                      ) : 'No file'}
                    </td>
                    <td>{assignment.submitted ? 'Submitted' : 'Pending'}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '220px' }}>
                        {assignment.submission_file_url && (
                          <a href={`${BACKEND_BASE_URL}${assignment.submission_file_url}`} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
                            <HiOutlineDownload /> View Submission
                          </a>
                        )}
                        <label className="btn btn-primary btn-sm" style={{ width: 'fit-content' }}>
                          <HiOutlineUpload /> {uploadingId === assignment.assignment_id ? 'Uploading...' : assignment.submitted ? 'Resubmit' : 'Submit'}
                          <input
                            type="file"
                            style={{ display: 'none' }}
                            disabled={uploadingId === assignment.assignment_id}
                            onChange={(e) => handleSubmit(assignment.assignment_id, e.target.files?.[0])}
                          />
                        </label>
                      </div>
                    </td>
                    <td>
                      {assignment.marks_awarded != null ? (
                        <div>
                          <div style={{ fontWeight: 700 }}>{assignment.marks_awarded}{assignment.max_marks ? ` / ${assignment.max_marks}` : ''}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{assignment.feedback || 'Reviewed'}</div>
                        </div>
                      ) : 'Not graded'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
