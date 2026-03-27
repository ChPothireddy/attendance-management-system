import { useState, useEffect } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi';

export default function ManageAllocations() {
  const [allocations, setAllocations] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [availableFaculty, setAvailableFaculty] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ faculty_id: '', subject_code: '', batch_id: '', section_id: '' });
  // Track faculty selection per subject code
  const [facultyBySubject, setFacultyBySubject] = useState({});

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [a, f, s, sub] = await Promise.all([
        API.get('/department/allocations'),
        API.get('/department/faculty'),
        API.get('/department/sections/flat'),
        API.get('/department/subjects'),
      ]);
      setAllocations(a.data);
      setFaculty(f.data);
      setSections(s.data);
      setSubjects(sub.data);
    } catch {}
  };

  const handleSectionChange = async (sectionId) => {
    const section = sections.find(s => s.id === +sectionId) || null;
    setSelectedSection(section);
    setForm(old => ({ ...old, section_id: sectionId ? sectionId.toString() : '', faculty_id: '', subject_code: '', batch_id: section?.batch_id ? section.batch_id.toString() : '' }));
    setFacultyBySubject({});  // Reset per-subject selections
    if (!sectionId) {
      setAvailableFaculty([]);
      return;
    }
    try {
      const res = await API.get(`/department/sections/${sectionId}/faculty`);
      setAvailableFaculty(res.data);
    } catch {
      setAvailableFaculty([]);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await API.post('/department/allocations', {
        faculty_id: +form.faculty_id,
        section_id: +form.section_id,
        batch_id: +form.batch_id,
        subject_code: form.subject_code,
      });
      toast.success('Allocation created!');
      setShowModal(false);
      setForm({ faculty_id: '', section_id: '', subject_code: '', batch_id: '' });
      setAvailableFaculty([]);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handleSubjectFacultyChange = (subjectCode, facultyId) => {
    setFacultyBySubject(prev => ({
      ...prev,
      [subjectCode]: facultyId
    }));
  };

  const handleAllocate = async (subjectCode) => {
    const facultyId = facultyBySubject[subjectCode];
    if (!selectedSection || !facultyId) {
      toast.error('Please select a faculty for this subject');
      return;
    }
    try {
      await API.post(`/department/faculty/${facultyId}/allocations`, {
        batch_id: selectedSection.batch_id,
        section_id: selectedSection.id,
        subject_code: subjectCode
      });
      toast.success('Allocated');
      setFacultyBySubject(prev => {
        const updated = { ...prev };
        delete updated[subjectCode];
        return updated;
      });
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const getAllocatedFaculty = (subjectCode) => {
    if (!selectedSection) return [];
    return allocations.filter(a => a.section_id == selectedSection.id && a.subject_code == subjectCode);
  };

  const handleDeleteAllocation = async (alloc) => {
    if (!confirm('Delete this allocation?')) return;
    try {
      await API.delete('/department/allocations', {
        data: {
          faculty_id: alloc.faculty_id,
          batch_id: alloc.batch_id,
          section_id: alloc.section_id,
          subject_code: alloc.subject_code
        }
      });
      toast.success('Allocation deleted');
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  return (
    <div className="page-container">
      <div className="page-header"><h1>Timetable</h1><p>Manage faculty allocations for sections</p></div>
      <div className="card">
        <div className="section-header"><h2>Select Section</h2></div>
        <div className="toolbar">
          <select className="form-control" style={{width:'200px'}} value={selectedSection?.id || ''} onChange={e => handleSectionChange(e.target.value)}>
            <option value="">Select section</option>
            {sections.map(s => <option key={s.id} value={s.id}>Sec {s.name} - {s.batch_name}</option>)}
          </select>
        </div>
        {selectedSection && (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead><tr><th>Subject</th><th>Allocated Faculty</th><th>Actions</th></tr></thead>
              <tbody>
                {subjects.filter(sub => !selectedSection || sub.semester == selectedSection.current_semester).map(sub => {
                  const allocated = getAllocatedFaculty(sub.code);
                  return (
                    <tr key={sub.code}>
                      <td style={{fontWeight: 600}}>{sub.code} - {sub.name}</td>
                      <td>{allocated.length > 0 ? allocated.map(a => a.faculty_name).join(', ') : <span style={{color:'var(--gray-400)'}}>None</span>}</td>
                      <td>
                        <select 
                          className="form-control" 
                          style={{width:'150px', display:'inline-block', marginRight:'8px'}} 
                          value={facultyBySubject[sub.code] || ''}
                          onChange={e => handleSubjectFacultyChange(sub.code, e.target.value)}
                        >
                          <option value="">Select faculty</option>
                          {faculty.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                        <button className="btn btn-primary btn-sm" onClick={() => handleAllocate(sub.code)} disabled={!facultyBySubject[sub.code]} style={{marginRight:'8px'}}>Allocate</button>
                        {allocated.length > 0 && (
                          <button 
                            className="btn btn-danger btn-sm" 
                            onClick={() => handleDeleteAllocation(allocated[0])}
                            title="Delete allocation"
                          ><HiOutlineTrash /></button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
