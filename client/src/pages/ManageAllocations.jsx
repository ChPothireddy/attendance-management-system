import { useEffect, useMemo, useState } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';
import {
  HiOutlineDownload,
  HiOutlineSave,
  HiOutlineTrash,
  HiOutlineSparkles,
  HiOutlineEye,
  HiOutlineX,
} from 'react-icons/hi';

const slotLabels = [
  '09:00-10:40',
  '10:40-12:20',
  '01:30-03:10',
  '03:10-04:00',
];

export default function ManageAllocations() {
  const [allocations, setAllocations] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [facultyBySubject, setFacultyBySubject] = useState({});
  const [timetable, setTimetable] = useState({
    generated: false,
    can_generate: false,
    message: null,
    missing_subjects: [],
    weekly_class_target: 0,
    allocated_subjects: [],
    grid: [],
  });
  const [loadingTimetable, setLoadingTimetable] = useState(false);
  const [working, setWorking] = useState(false);
  const [showTimetableModal, setShowTimetableModal] = useState(false);

  useEffect(() => {
    loadBaseData();
  }, []);

  useEffect(() => {
    if (selectedSectionId) {
      loadTimetable(selectedSectionId);
    } else {
      setTimetable({
        generated: false,
        can_generate: false,
        message: null,
        missing_subjects: [],
        weekly_class_target: 0,
        allocated_subjects: [],
        grid: [],
      });
    }
  }, [selectedSectionId]);

  const selectedSection = sections.find((section) => section.id === Number(selectedSectionId)) || null;

  function getAllocatedFaculty(subjectCode) {
    if (!selectedSection) return [];
    return allocations.filter((item) => item.section_id === selectedSection.id && item.subject_code === subjectCode);
  }

  const sectionSubjects = useMemo(() => {
    if (!selectedSection) return [];
    return subjects.filter((subject) => subject.semester === selectedSection.current_semester);
  }, [subjects, selectedSection]);

  const allocatedCount = useMemo(
    () => sectionSubjects.filter((subject) => getAllocatedFaculty(subject.code).length > 0).length,
    [sectionSubjects, allocations, selectedSection]
  );

  const loadBaseData = async () => {
    try {
      const [allocationRes, facultyRes, sectionRes, subjectRes] = await Promise.all([
        API.get('/department/allocations'),
        API.get('/department/faculty'),
        API.get('/department/sections/flat'),
        API.get('/department/subjects'),
      ]);
      setAllocations(allocationRes.data);
      setFaculty(facultyRes.data);
      setSections(sectionRes.data);
      setSubjects(subjectRes.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load timetable data');
    }
  };

  const loadTimetable = async (sectionId) => {
    setLoadingTimetable(true);
    try {
      const res = await API.get(`/department/sections/${sectionId}/timetable`);
      setTimetable(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load timetable');
    } finally {
      setLoadingTimetable(false);
    }
  };

  const reloadAll = async (sectionId = selectedSectionId) => {
    await loadBaseData();
    if (sectionId) {
      await loadTimetable(sectionId);
    }
  };

  const handleSubjectFacultyChange = (subjectCode, facultyId) => {
    setFacultyBySubject((current) => ({ ...current, [subjectCode]: facultyId }));
  };

  const handleAllocate = async (subjectCode) => {
    const facultyId = facultyBySubject[subjectCode];
    if (!selectedSection || !facultyId) {
      toast.error('Select a faculty first');
      return;
    }
    const allocated = getAllocatedFaculty(subjectCode);
    const existingAllocation = allocated[0];
    try {
      if (existingAllocation) {
        if (String(existingAllocation.faculty_id) === String(facultyId)) {
          toast('This subject is already allocated to the selected faculty');
          return;
        }
        await API.put('/department/allocations', {
          faculty_id: Number(facultyId),
          batch_id: selectedSection.batch_id,
          section_id: selectedSection.id,
          subject_code: subjectCode,
        });
        toast.success('Faculty reallocated successfully');
      } else {
        await API.post(`/department/faculty/${facultyId}/allocations`, {
          batch_id: selectedSection.batch_id,
          section_id: selectedSection.id,
          subject_code: subjectCode,
        });
        toast.success('Faculty allocated successfully');
      }
      setFacultyBySubject((current) => {
        const next = { ...current };
        delete next[subjectCode];
        return next;
      });
      await reloadAll(selectedSection.id);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to allocate faculty');
    }
  };

  const handleDeleteAllocation = async (allocation) => {
    if (!window.confirm('Delete this allocation? This will also clear the generated timetable for the section.')) return;
    try {
      await API.delete('/department/allocations', {
        data: {
          faculty_id: allocation.faculty_id,
          batch_id: allocation.batch_id,
          section_id: allocation.section_id,
          subject_code: allocation.subject_code,
        },
      });
      toast.success('Allocation deleted');
      await reloadAll(selectedSection?.id);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete allocation');
    }
  };

  const handleGenerate = async () => {
    if (!selectedSection) return;
    const confirmMessage = timetable.generated
      ? 'Regenerate timetable? Existing timetable changes will be replaced.'
      : 'Generate timetable now?';
    if (!window.confirm(confirmMessage)) return;
    setWorking(true);
    try {
      await API.post(`/department/sections/${selectedSection.id}/timetable/generate`);
      toast.success('Timetable generated successfully');
      await loadTimetable(selectedSection.id);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to generate timetable');
    } finally {
      setWorking(false);
    }
  };

  const handleSlotChange = (dayOrder, slotIndex, subjectCode) => {
    setTimetable((current) => ({
      ...current,
      grid: current.grid.map((day) => {
        if (day.day_order !== dayOrder) return day;
        return {
          ...day,
          slots: day.slots.map((slot) => {
            if (slot.slot_index !== slotIndex) return slot;
            const allocation = current.allocated_subjects.find((item) => item.subject_code === subjectCode);
            return {
              ...slot,
              subject_code: subjectCode || null,
              subject_name: allocation?.subject_name || null,
              faculty_id: allocation?.faculty_id || null,
              faculty_name: allocation?.faculty_name || null,
            };
          }),
        };
      }),
    }));
  };

  const handleSaveTimetable = async () => {
    if (!selectedSection) return;
    setWorking(true);
    try {
      const entries = timetable.grid.flatMap((day) =>
        day.slots
          .filter((slot) => slot.subject_code)
          .map((slot) => ({
            day_order: day.day_order,
            slot_index: slot.slot_index,
            subject_code: slot.subject_code,
          }))
      );
      await API.put(`/department/sections/${selectedSection.id}/timetable`, { entries });
      toast.success('Timetable updated successfully');
      await loadTimetable(selectedSection.id);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update timetable');
    } finally {
      setWorking(false);
    }
  };

  const handleDownload = async () => {
    if (!selectedSection) return;
    try {
      const res = await API.get(`/department/sections/${selectedSection.id}/timetable/download`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `section-${selectedSection.name}-${selectedSection.batch_name}-timetable.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to download timetable');
    }
  };
  const renderSlot = (slot, day) => (
  <>
    <select
      className="form-control"
      value={slot.subject_code || ''}
      onChange={(e) => handleSlotChange(day.day_order, slot.slot_index, e.target.value)}
    >
      <option value="">{slot.activity_label || 'Library / Activity'}</option>
      {timetable.allocated_subjects.map((subject) => (
        <option key={subject.subject_code} value={subject.subject_code}>
          {subject.subject_code}
        </option>
      ))}
    </select>

    <div style={{ marginTop: 8, fontSize: '0.78rem', color: 'var(--gray-500)' }}>
      {slot.subject_name || slot.activity_label || 'Library / Activity'}
      {slot.faculty_name ? ` - ${slot.faculty_name}` : ''}
    </div>
  </>
);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Timetable</h1>
        <p>Allocate faculty to section subjects, generate a conflict-free timetable, and update it when needed.</p>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="section-header"><h2>Select Section</h2></div>
        <div className="toolbar">
          <select
            className="form-control"
            style={{ width: 260 }}
            value={selectedSectionId}
            onChange={(e) => {
              setSelectedSectionId(e.target.value);
              setFacultyBySubject({});
            }}
          >
            <option value="">Select section</option>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                Sec {section.name} - {section.batch_name} - Sem {section.current_semester}
              </option>
            ))}
          </select>
        </div>

        {selectedSection && (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Allocated Faculty</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sectionSubjects.map((subject) => {
                  const allocated = getAllocatedFaculty(subject.code);
                  const currentFacultyId = allocated[0]?.faculty_id ? String(allocated[0].faculty_id) : '';
                  const selectedFacultyValue = facultyBySubject[subject.code] ?? currentFacultyId;
                  return (
                    <tr key={subject.code}>
                      <td style={{ fontWeight: 600 }}>{subject.code} - {subject.name}</td>
                      <td>
                        {allocated.length > 0
                          ? allocated.map((item) => item.faculty_name).join(', ')
                          : <span style={{ color: 'var(--gray-400)' }}>Not allocated</span>}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <select
                            className="form-control"
                            style={{ width: 180 }}
                            value={selectedFacultyValue}
                            onChange={(e) => handleSubjectFacultyChange(subject.code, e.target.value)}
                          >
                            <option value="">Select faculty</option>
                            {faculty.map((member) => (
                              <option key={member.id} value={member.id}>{member.name}</option>
                            ))}
                          </select>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleAllocate(subject.code)}
                            disabled={!selectedFacultyValue}
                          >
                            {allocated.length > 0 ? 'Reallocate' : 'Allocate'}
                          </button>
                          {allocated.length > 0 && (
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDeleteAllocation(allocated[0])}
                            >
                              <HiOutlineTrash /> Remove
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedSection && (
        <>
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="section-header">
              <h2>Time Table Generation</h2>
            </div>
            {loadingTimetable ? (
              <div className="spinner" />
            ) : (
              <>
                <div
                  style={{
                    display: 'grid',
                    gap: 14,
                    padding: 18,
                    border: '1px solid var(--gray-100)',
                    borderRadius: 'var(--border-radius)',
                    background: 'linear-gradient(180deg, #fff, var(--gray-50))',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--gray-900)' }}>
                        {timetable.generated ? 'Timetable is ready for this section' : 'Generate the timetable after subject allocation'}
                      </div>
                      <div style={{ color: 'var(--gray-500)', marginTop: 4 }}>
                        {allocatedCount} of {sectionSubjects.length} semester subjects are allocated.
                        {timetable.weekly_class_target ? ` Each subject is scheduled ${timetable.weekly_class_target} times per week.` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button className="btn btn-primary" onClick={handleGenerate} disabled={!timetable.can_generate || working}>
                        <HiOutlineSparkles /> {timetable.generated ? 'Re Generate Time Table' : 'Generate Time Table'}
                      </button>
                      {timetable.generated && (
                        <button className="btn btn-secondary" onClick={() => setShowTimetableModal(true)} disabled={working}>
                          <HiOutlineEye /> View Time Table
                        </button>
                      )}
                    </div>
                  </div>

                  {timetable.missing_subjects?.length > 0 && (
                    <div style={{ color: 'var(--danger-600)', fontSize: '0.9rem' }}>
                      Missing allocations: {timetable.missing_subjects.join(', ')}
                    </div>
                  )}

                  {!timetable.missing_subjects?.length && timetable.message && !timetable.generated && (
                    <div style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>
                      {timetable.message}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {showTimetableModal && timetable.generated && (
        <div className="modal-overlay" onClick={() => setShowTimetableModal(false)}>
          <div className="modal" style={{ maxWidth: 1200, width: '96vw' }} onClick={(e) => e.stopPropagation()}>
            <div className="section-header" style={{ marginBottom: 18 }}>
              <h2>Weekly Timetable</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowTimetableModal(false)}>
                <HiOutlineX /> Close
              </button>
            </div>

            <div className="data-table-wrapper" style={{ maxHeight: '68vh', overflow: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Day</th>
                    <th>P1<br />{slotLabels[0]}</th>
<th>P2<br />{slotLabels[1]}</th>
<th style={{ background: '#f3f4f6', fontWeight: 700 }}>LUNCH</th>
<th>P3<br />{slotLabels[2]}</th>
<th>P4<br />{slotLabels[3]}</th>
                  </tr>
                </thead>
                <tbody>
                  {timetable.grid.map((day) => (
                    <tr key={day.day_order}>
                      <td style={{ fontWeight: 700 }}>{day.day_name}</td>
                      {/* P1 */}
<td style={{ minWidth: 165 }}>
  {renderSlot(day.slots[0], day)}
</td>

{/* P2 */}
<td style={{ minWidth: 165 }}>
  {renderSlot(day.slots[1], day)}
</td>

{/* LUNCH */}
<td style={{ textAlign: 'center', fontWeight: 700, background: '#f3f4f6' }}>
  🍽️
</td>

{/* P3 */}
<td style={{ minWidth: 165 }}>
  {renderSlot(day.slots[2], day)}
</td>

{/* P4 */}
<td style={{ minWidth: 165 }}>
  {renderSlot(day.slots[3], day)}
</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="modal-actions">
              <button className="btn btn-success" onClick={handleSaveTimetable} disabled={working}>
                <HiOutlineSave /> Save Updates
              </button>
              <button className="btn btn-secondary" onClick={handleDownload} disabled={working}>
                <HiOutlineDownload /> Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
