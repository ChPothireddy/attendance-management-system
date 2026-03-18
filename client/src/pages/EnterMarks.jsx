import { useState, useEffect } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';

export default function EnterMarks() {
  const [allocations, setAllocations] = useState([]);
  const [selectedAlloc, setSelectedAlloc] = useState(null);
  const [students, setStudents] = useState([]);
  const [examType, setExamType] = useState('mid1');
  const [maxMarks, setMaxMarks] = useState(30);
  const [marks, setMarks] = useState({});
  const [saving, setSaving] = useState(false);

  const examTypes = [
    { value: 'mid1', label: 'Mid Term 1', max: 30 },
    { value: 'mid2', label: 'Mid Term 2', max: 30 },
    { value: 'quiz1', label: 'Quiz 1', max: 10 },
    { value: 'quiz2', label: 'Quiz 2', max: 10 },
    { value: 'assignment1', label: 'Assignment 1', max: 10 },
    { value: 'assignment2', label: 'Assignment 2', max: 10 },
    { value: 'final', label: 'Final Exam', max: 100 },
  ];

  useEffect(() => {
    API.get('/faculty/allocations').then(r => setAllocations(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedAlloc) return;
    API.get(`/faculty/students/${selectedAlloc.section_id}`).then(r => {
      setStudents(r.data);
      const init = {};
      r.data.forEach(s => { init[s.id] = { obtained_marks: 0, remarks: '' }; });
      setMarks(init);
    }).catch(() => {});
  }, [selectedAlloc]);

  // Load existing marks
  useEffect(() => {
    if (!selectedAlloc || !examType) return;
    API.get(`/faculty/marks?subject_id=${selectedAlloc.subject_id}&section_id=${selectedAlloc.section_id}&exam_type=${examType}`)
      .then(r => {
        if (r.data.length > 0) {
          const existing = {};
          r.data.forEach(m => { existing[m.student_id] = { obtained_marks: m.obtained_marks, remarks: m.remarks || '' }; });
          setMarks(prev => ({ ...prev, ...existing }));
        }
      }).catch(() => {});
  }, [selectedAlloc, examType]);

  const handleExamChange = (value) => {
    setExamType(value);
    const et = examTypes.find(e => e.value === value);
    if (et) setMaxMarks(et.max);
  };

  const updateMark = (studentId, field, value) => {
    setMarks(prev => ({ ...prev, [studentId]: { ...prev[studentId], [field]: value } }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const records = students.map(s => ({
        student_id: s.id,
        obtained_marks: parseFloat(marks[s.id]?.obtained_marks || 0),
        remarks: marks[s.id]?.remarks || '',
      }));
      await API.post('/faculty/marks', {
        subject_id: selectedAlloc.subject_id,
        exam_type: examType,
        max_marks: maxMarks,
        records,
      });
      toast.success('Marks saved!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header"><h1>Enter Marks</h1><p>Enter exam and assignment marks for your students</p></div>

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
            <label>Exam Type</label>
            <select className="form-control" value={examType} onChange={e => handleExamChange(e.target.value)}>
              {examTypes.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Max Marks</label>
            <input type="number" className="form-control" value={maxMarks} onChange={e => setMaxMarks(+e.target.value)} min="1" />
          </div>
        </div>
      </div>

      {selectedAlloc && students.length > 0 && (
        <div className="card">
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr><th>#</th><th>Enrollment</th><th>Student Name</th><th>Marks (out of {maxMarks})</th><th>Remarks</th></tr>
              </thead>
              <tbody>
                {students.map((s, i) => {
                  const obtained = marks[s.id]?.obtained_marks || 0;
                  const pct = maxMarks > 0 ? (obtained / maxMarks) * 100 : 0;
                  return (
                    <tr key={s.id}>
                      <td>{i + 1}</td>
                      <td><span className="badge badge-info">{s.enrollment_no}</span></td>
                      <td style={{fontWeight:600}}>{s.name}</td>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                          <input type="number" className="form-control" style={{width:'80px'}} min="0" max={maxMarks} step="0.5"
                            value={obtained}
                            onChange={e => updateMark(s.id, 'obtained_marks', e.target.value)}
                          />
                          <div className="percent-bar" style={{width:'50px'}}>
                            <div className={`percent-bar-fill ${pct >= 60 ? 'high' : pct >= 33 ? 'mid' : 'low'}`} style={{width:`${pct}%`}} />
                          </div>
                        </div>
                      </td>
                      <td>
                        <input className="form-control" style={{width:'150px'}} placeholder="Optional"
                          value={marks[s.id]?.remarks || ''}
                          onChange={e => updateMark(s.id, 'remarks', e.target.value)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{marginTop:'20px',display:'flex',justifyContent:'flex-end'}}>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving...' : 'Save Marks'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
