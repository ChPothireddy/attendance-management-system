import { useState, useEffect } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';
import { HiOutlineCheck, HiOutlineX, HiOutlineClock, HiOutlineClipboardList } from 'react-icons/hi';

export default function MarkAttendance() {
  const [allocations, setAllocations] = useState([]);
  const [selectedAlloc, setSelectedAlloc] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    API.get('/faculty/allocations').then(r => setAllocations(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedAlloc) return;
    API.get(`/faculty/students/${selectedAlloc.section_id}`).then(r => {
      setStudents(r.data);
      const init = {};
      r.data.forEach(s => { init[s.id] = 'present'; });
      setAttendance(init);
    }).catch(() => {});
  }, [selectedAlloc]);

  // Load existing attendance for this date
  useEffect(() => {
    if (!selectedAlloc || !date) return;
    API.get(`/faculty/attendance?subject_id=${selectedAlloc.subject_id}&section_id=${selectedAlloc.section_id}&date=${date}`)
      .then(r => {
        if (r.data.length > 0) {
          const existing = {};
          r.data.forEach(a => { existing[a.student_id] = a.status; });
          setAttendance(prev => ({ ...prev, ...existing }));
        }
      }).catch(() => {});
  }, [selectedAlloc, date]);

  const toggleStatus = (studentId) => {
    setAttendance(prev => {
      const current = prev[studentId] || 'present';
      const next = current === 'present' ? 'late' : current === 'late' ? 'absent' : 'present';
      return { ...prev, [studentId]: next };
    });
  };

  const markAll = (status) => {
    const updated = {};
    students.forEach(s => { updated[s.id] = status; });
    setAttendance(updated);
  };

  const handleSubmit = async () => {
    if (!selectedAlloc || students.length === 0) return;
    setSaving(true);
    try {
      const records = students.map(s => ({ student_id: s.id, status: attendance[s.id] || 'present' }));
      await API.post('/faculty/attendance', {
        subject_id: selectedAlloc.subject_id,
        section_id: selectedAlloc.section_id,
        date,
        records,
      });
      toast.success('Attendance saved!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const presentCount = Object.values(attendance).filter(v => v === 'present').length;
  const lateCount = Object.values(attendance).filter(v => v === 'late').length;
  const absentCount = Object.values(attendance).filter(v => v === 'absent').length;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Mark Attendance</h1>
        <p>Select a class and mark attendance for your students</p>
      </div>

      <div className="card" style={{marginBottom:'20px'}}>
        <div className="form-row">
          <div className="form-group">
            <label>Select Class</label>
            <select className="form-control" value={selectedAlloc ? allocations.indexOf(selectedAlloc) : ''} onChange={e => setSelectedAlloc(allocations[+e.target.value] || null)}>
              <option value="">Choose section & subject</option>
              {allocations.map((a, i) => (
                <option key={a.id} value={i}>Section {a.section_name} — {a.subject_code} ({a.subject_name})</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Date</label>
            <input type="date" className="form-control" value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </div>
      </div>

      {selectedAlloc && students.length > 0 && (
        <div className="card">
          <div className="toolbar">
            <div className="toolbar-left" style={{gap:'8px'}}>
              <span style={{fontSize:'0.85rem',color:'var(--gray-500)'}}>Quick actions:</span>
              <button className="btn btn-success btn-sm" onClick={() => markAll('present')}>All Present</button>
              <button className="btn btn-danger btn-sm" onClick={() => markAll('absent')}>All Absent</button>
            </div>
            <div style={{display:'flex',gap:'16px',fontSize:'0.85rem'}}>
              <span style={{color:'var(--success-600)',fontWeight:600}}><HiOutlineCheck style={{verticalAlign:'middle'}} /> {presentCount}</span>
              <span style={{color:'var(--warning-500)',fontWeight:600}}><HiOutlineClock style={{verticalAlign:'middle'}} /> {lateCount}</span>
              <span style={{color:'var(--danger-500)',fontWeight:600}}><HiOutlineX style={{verticalAlign:'middle'}} /> {absentCount}</span>
            </div>
          </div>

          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Enrollment</th>
                  <th>Student Name</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => {
                  const status = attendance[s.id] || 'present';
                  return (
                    <tr key={s.id} style={{cursor:'pointer'}} onClick={() => toggleStatus(s.id)}>
                      <td>{i + 1}</td>
                      <td><span className="badge badge-info">{s.enrollment_no}</span></td>
                      <td style={{fontWeight:600}}>{s.name}</td>
                      <td>
                        <div style={{display:'flex',gap:'6px'}}>
                          <button className={`btn btn-sm ${status === 'present' ? 'btn-success' : 'btn-secondary'}`} onClick={e => { e.stopPropagation(); setAttendance(p => ({...p, [s.id]: 'present'})); }} style={{minWidth:'36px'}}>
                            <HiOutlineCheck />
                          </button>
                          <button className={`btn btn-sm ${status === 'late' ? 'btn-primary' : 'btn-secondary'}`} onClick={e => { e.stopPropagation(); setAttendance(p => ({...p, [s.id]: 'late'})); }} style={{minWidth:'36px',background: status === 'late' ? 'linear-gradient(135deg, var(--warning-400), var(--warning-500))' : undefined}}>
                            <HiOutlineClock />
                          </button>
                          <button className={`btn btn-sm ${status === 'absent' ? 'btn-danger' : 'btn-secondary'}`} onClick={e => { e.stopPropagation(); setAttendance(p => ({...p, [s.id]: 'absent'})); }} style={{minWidth:'36px'}}>
                            <HiOutlineX />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{marginTop:'20px',display:'flex',justifyContent:'flex-end'}}>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>
        </div>
      )}

      {selectedAlloc && students.length === 0 && (
        <div className="card"><div className="empty-state"><div className="icon"><HiOutlineClipboardList /></div><p>No students in this section</p></div></div>
      )}
    </div>
  );
}
