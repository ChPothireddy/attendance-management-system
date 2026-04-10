import { useState, useEffect, useMemo } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineTrash, HiArrowLeft } from 'react-icons/hi';

export default function ManageSubjects() {
  const CUSTOM_TYPE_VALUE = '__custom__';
  const [batchPrograms, setBatchPrograms] = useState([]);
  const [selectedBatchProgram, setSelectedBatchProgram] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [formatDetails, setFormatDetails] = useState(null);
  const [showFormatModal, setShowFormatModal] = useState(false);
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [showAllSubjectsModal, setShowAllSubjectsModal] = useState(false);
  const [showSectionAssignModal, setShowSectionAssignModal] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);
  const [formatSubjects, setFormatSubjects] = useState([]);
  const [subjectForm, setSubjectForm] = useState({ name: '', type: '', customType: '', credits: 1, periods: 1 });
  const [subjectTypeOptions, setSubjectTypeOptions] = useState(['Common', 'Elective', 'Open Elective']);
  const [formatSubjectType, setFormatSubjectType] = useState('');
  const [formatCustomType, setFormatCustomType] = useState('');
  const [formatTemplateCode, setFormatTemplateCode] = useState('');
  const [formatCommonSubjectCode, setFormatCommonSubjectCode] = useState('');
  const [sectionAssignments, setSectionAssignments] = useState({});
  const [faculty, setFaculty] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [showFacultyModal, setShowFacultyModal] = useState(false);
  const [selectedSubjectForFaculty, setSelectedSubjectForFaculty] = useState(null);
  const [selectedFacultyForSubject, setSelectedFacultyForSubject] = useState({});
  const [isGeneratingTimetable, setIsGeneratingTimetable] = useState(false);
  const [isLoadingFormat, setIsLoadingFormat] = useState(false);
  const [formatUpdatedAt, setFormatUpdatedAt] = useState(null);

  const addTypeOption = (rawType) => {
    const type = (rawType || '').trim();
    if (!type) return '';
    setSubjectTypeOptions((old) => {
      if (old.some((existing) => existing.toLowerCase() === type.toLowerCase())) {
        return old;
      }
      return [...old, type];
    });
    return type;
  };

  useEffect(() => {
    loadBatchPrograms();
    loadAllSubjects();
    loadSubjectTypes();
    loadFaculty();
    loadAllocations();
  }, []);

  const loadBatchPrograms = async () => {
    try {
      const res = await API.get('/department/batch-programs');
      setBatchPrograms(res.data || []);
    } catch {
      toast.error('Failed to load batch-programs');
    }
  };

  const loadAllSubjects = async () => {
    try {
      const res = await API.get('/department/subjects');
      setSubjects(res.data || []);
    } catch {
      // no-op
    }
  };

  const loadSubjectTypes = async () => {
    try {
      const res = await API.get('/department/subjects/types');
      const serverTypes = res.data || [];
      const merged = Array.from(new Set(['Common', 'Elective', 'Open Elective', ...serverTypes]));
      setSubjectTypeOptions(merged);
    } catch {
      // no-op
    }
  };

  const resolveSubjectType = (selectedType, customType) => {
    if (selectedType === CUSTOM_TYPE_VALUE) {
      return customType.trim();
    }
    return selectedType;
  };

  const resolvedFormatType = resolveSubjectType(formatSubjectType, formatCustomType);

  const sortedAllSubjects = useMemo(() => {
    return [...subjects].sort((a, b) =>
      (a.code || '').localeCompare(b.code || '', undefined, { numeric: true })
    );
  }, [subjects]);

  const availableSubjectsByType = useMemo(() => {
    const grouped = {};
    for (const subject of subjects) {
      const type = (subject.subject_type || '').trim() || 'Uncategorized';
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(subject);
    }
    Object.keys(grouped).forEach((type) => {
      grouped[type] = grouped[type].sort((a, b) =>
        (a.code || '').localeCompare(b.code || '', undefined, { numeric: true })
      );
    });
    return grouped;
  }, [subjects]);

  const formatTypeOptions = useMemo(() => {
    const fromFormat = formatDetails?.subject_types || [];
    return Array.from(new Set([...subjectTypeOptions, ...fromFormat])).filter(Boolean);
  }, [subjectTypeOptions, formatDetails]);

  const formatUpdatedDisplay = useMemo(() => {
    if (!formatUpdatedAt) return 'Never';
    const parsed = new Date(formatUpdatedAt);
    return Number.isNaN(parsed.getTime()) ? 'Unknown' : parsed.toLocaleString();
  }, [formatUpdatedAt]);

  const selectedSections = selectedBatchProgram?.sections || [];

  const handleAddCustomTypeToList = () => {
    const customType = addTypeOption(subjectForm.customType);
    if (!customType) {
      toast.error('Enter a type name first');
      return;
    }
    setSubjectForm((old) => ({ ...old, type: customType, customType: '' }));
    toast.success(`Type added: ${customType}`);
  };

  const handleAddCustomFormatTypeToList = () => {
    const customType = addTypeOption(formatCustomType);
    if (!customType) {
      toast.error('Enter a type name first');
      return;
    }
    setFormatSubjectType(customType);
    setFormatCustomType('');
    setFormatCommonSubjectCode('');
    toast.success(`Type added: ${customType}`);
  };

  const handleSelectBatchProgram = (bp) => {
    setSelectedBatchProgram(bp);
    setFormatDetails(null);
    setFormatSubjects([]);
    setSectionAssignments({});
    setFormatSubjectType('');
    setFormatCustomType('');
    setFormatTemplateCode('');
    setFormatCommonSubjectCode('');
    setFormatUpdatedAt(null);
    API.get(`/department/subjects/formats/${bp.batch_id}/${bp.current_semester}`)
      .then((res) => setFormatUpdatedAt(res.data?.updated_at || null))
      .catch(() => {});
  };

  const handleOpenFormatModal = async () => {
    if (!selectedBatchProgram) return;
    setIsLoadingFormat(true);
    try {
      const res = await API.get(
        `/department/subjects/formats/${selectedBatchProgram.batch_id}/${selectedBatchProgram.current_semester}`
      );
      setFormatDetails(res.data);
      const sorted = [...(res.data.format_subjects || [])].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
      setFormatSubjects(sorted);
      sorted.forEach((slot) => addTypeOption(slot.type));
      setFormatUpdatedAt(res.data?.updated_at || null);
      setShowFormatModal(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load format');
    } finally {
      setIsLoadingFormat(false);
    }
  };

  const handleAddSubjectToDatabase = async (e) => {
    e.preventDefault();
    const resolvedType = resolveSubjectType(subjectForm.type, subjectForm.customType);
    if (!subjectForm.name || !resolvedType) {
      toast.error('Subject name and type are required');
      return;
    }
    try {
      const payload = {
        name: subjectForm.name,
        subject_type: resolvedType,
        credits: parseFloat(subjectForm.credits),
        periods: parseInt(subjectForm.periods),
      };
      addTypeOption(resolvedType);
      const res = await API.post('/department/subjects', payload);
      toast.success(`Subject added: ${res.data.subject_code}`);
      setShowAddSubjectModal(false);
      setSubjectForm({ name: '', type: '', customType: '', credits: 1, periods: 1 });
      loadAllSubjects();
      loadSubjectTypes();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add subject');
    }
  };

  const handleAddSubjectToFormat = () => {
    const resolvedType = resolveSubjectType(formatSubjectType, formatCustomType);
    const slotCode = (formatTemplateCode || '').trim().toUpperCase();
    if (!resolvedType || !slotCode) {
      toast.error('Please enter format code and select subject type');
      return;
    }

    const existsInFormat = formatSubjects.some((s) => s.code === slotCode);
    if (existsInFormat) {
      toast.error('Format code already added');
      return;
    }

    let selectedSubjectCode = null;
    let selectedSubjectName = null;
    if (resolvedType === 'Common') {
      selectedSubjectCode = (formatCommonSubjectCode || '').trim().toUpperCase();
      if (!selectedSubjectCode) {
        toast.error('Select a subject for Common type');
        return;
      }
      const selectedCommon = (availableSubjectsByType.Common || []).find((s) => s.code === selectedSubjectCode);
      selectedSubjectName = selectedCommon?.name || null;
    }

    setFormatSubjects((old) => [...old,
      { code: slotCode, type: resolvedType, subject_code: selectedSubjectCode, subject_name: selectedSubjectName },
    ].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true })));
    setFormatTemplateCode('');
    setFormatCommonSubjectCode('');
  };

  const handleRemoveSubjectFromFormat = (code) => {
    setFormatSubjects((old) => old.filter((s) => s.code !== code));
  };

  const handleSaveFormat = async () => {
    if (!selectedBatchProgram || !formatDetails) return;
    try {
      const payload = {
        batch_id: selectedBatchProgram.batch_id,
        semester: selectedBatchProgram.current_semester,
        subjects: formatSubjects.map((s) => ({
          code: s.code,
          type: s.type,
          subject_code: s.subject_code || null,
        })),
      };
      await API.post('/department/subjects/formats', payload);
      toast.success('Format saved');
      setShowFormatModal(false);
      setFormatSubjects([]);
      const refreshed = await API.get(`/department/subjects/formats/${selectedBatchProgram.batch_id}/${selectedBatchProgram.current_semester}`);
      setFormatUpdatedAt(refreshed.data?.updated_at || null);
      loadBatchPrograms();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save format');
    }
  };

  const handleOpenSectionAssign = async (section) => {
    setSelectedSection(section);
    try {
      const [existingRes, formatRes] = await Promise.all([
        API.get(`/department/sections/${section.id}/assign-subjects`),
        API.get(
          `/department/subjects/formats/${selectedBatchProgram.batch_id}/${selectedBatchProgram.current_semester}`
        ),
      ]);
      setFormatDetails(formatRes.data);
      const existingAssignments = existingRes.data || [];
      const assignMap = {};
      (formatRes.data.format_subjects || []).forEach((slot) => {
        if (slot.type === 'Common') {
          assignMap[slot.code] = slot.subject_code || '';
          return;
        }
        const existing = existingAssignments.find((a) => a.format_code === slot.code);
        assignMap[slot.code] = existing?.subject_code || '';
      });
      setSectionAssignments(assignMap);
      setShowSectionAssignModal(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to open section assignment');
    }
  };

  const handleChangeSectionAssignment = (formatCode, subjectCode) => {
    setSectionAssignments((old) => ({ ...old, [formatCode]: subjectCode }));
  };

  const handleSaveSectionAssignment = async () => {
    if (!selectedSection || !formatDetails) return;
    const nonCommonSlots = (formatDetails.format_subjects || []).filter((slot) => slot.type !== 'Common');
    const payloadItems = [];
    for (const slot of nonCommonSlots) {
      const selectedSubjectCode = (sectionAssignments[slot.code] || '').trim().toUpperCase();
      if (!selectedSubjectCode) {
        toast.error(`Please select a subject for ${slot.code}`);
        return;
      }
      payloadItems.push({ format_code: slot.code, subject_code: selectedSubjectCode });
    }
    try {
      const payload = {
        subjects: payloadItems,
      };
      await API.post(`/department/sections/${selectedSection.id}/assign-subjects`, payload);
      toast.success('Subjects assigned to section');
      setShowSectionAssignModal(false);
      setSectionAssignments({});
      loadBatchPrograms();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save assignment');
    }
  };

  const loadFaculty = async () => {
    try {
      const res = await API.get('/department/faculty');
      setFaculty(res.data || []);
    } catch (err) {
      console.error('Failed to load faculty:', err);
    }
  };

  const loadAllocations = async () => {
    try {
      const res = await API.get('/department/allocations');
      setAllocations(res.data || []);
    } catch (err) {
      console.error('Failed to load allocations:', err);
    }
  };

  const handleOpenFacultyModal = (subject) => {
    setSelectedSubjectForFaculty(subject);
    setSelectedFacultyForSubject({});
    // Load current allocations for this subject
    const currentAllocations = allocations.filter(a => a.subject_code === subject.code);
    const facultyMap = {};
    currentAllocations.forEach(alloc => {
      facultyMap[`${alloc.batch_id}-${alloc.section_id}`] = alloc.faculty_id;
    });
    setSelectedFacultyForSubject(facultyMap);
    setShowFacultyModal(true);
  };

  const handleFacultySelection = (batchId, sectionId, facultyId) => {
    const key = `${batchId}-${sectionId}`;
    setSelectedFacultyForSubject(prev => ({
      ...prev,
      [key]: facultyId
    }));
  };

  const handleSaveFacultyAllocations = async () => {
    if (!selectedSubjectForFaculty) return;

    try {
      const promises = [];
      const sections = selectedBatchProgram?.sections || [];

      for (const section of sections) {
        const key = `${selectedBatchProgram.batch_id}-${section.id}`;
        const facultyId = selectedFacultyForSubject[key];

        if (facultyId) {
          promises.push(
            API.post(`/department/faculty/${facultyId}/allocations`, {
              batch_id: selectedBatchProgram.batch_id,
              section_id: section.id,
              subject_code: selectedSubjectForFaculty.code
            }).catch(err => {
              if (err.response?.status !== 409) { // Ignore "already exists" errors
                throw err;
              }
            })
          );
        }
      }

      await Promise.all(promises);
      toast.success('Faculty allocations saved');
      setShowFacultyModal(false);
      loadAllocations();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save faculty allocations');
    }
  };

  const handleGenerateTimetable = async () => {
    if (!selectedBatchProgram) return;

    setIsGeneratingTimetable(true);
    try {
      const promises = [];
      for (const section of selectedBatchProgram.sections || []) {
        promises.push(
          API.post(`/department/sections/${section.id}/timetable/generate`)
        );
      }

      await Promise.all(promises);
      toast.success('Timetable generated for all sections');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to generate timetable');
    } finally {
      setIsGeneratingTimetable(false);
    }
  };

  const getAllocatedFaculty = (subjectCode, batchId, sectionId) => {
    const allocation = allocations.find(a =>
      a.subject_code === subjectCode &&
      a.batch_id === batchId &&
      a.section_id === sectionId
    );
    return allocation ? allocation.faculty_name : 'Not allocated';
  };

  const isAllSubjectsAllocated = () => {
    if (!selectedBatchProgram || !formatDetails) return false;

    const sections = selectedBatchProgram.sections || [];
    const formatSubjects = formatDetails.format_subjects || [];

    for (const section of sections) {
      for (const subject of formatSubjects) {
        const allocated = allocations.some(a =>
          a.subject_code === subject.code &&
          a.batch_id === selectedBatchProgram.batch_id &&
          a.section_id === section.id
        );
        if (!allocated) return false;
      }
    }
    return true;
  };

  // Main list view
  if (!selectedBatchProgram) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Subjects</h1>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddSubjectModal(true)}>
              <HiOutlinePlus /> Add Subject
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowAllSubjectsModal(true)}>
              View All Subjects
            </button>
          </div>
        </div>

        <div className="card">
          <div className="section-header">
            <h2>Batch-Program List</h2>
          </div>
          <div style={{ display: 'grid', gap: '10px' }}>
            {batchPrograms.length === 0 ? (
              <p style={{ padding: '20px', textAlign: 'center', color: 'var(--gray-400)' }}>No batches available</p>
            ) : (
              batchPrograms.map((bp) => (
                <div
                  key={`${bp.batch_id}-${bp.program_id}`}
                  onClick={() => handleSelectBatchProgram(bp)}
                  style={{
                    border: '1px solid #ccc',
                    borderRadius: '6px',
                    padding: '15px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'background 0.2s',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                  onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div>
                    <strong style={{ fontSize: '16px' }}>
                      {bp.batch_name} - {bp.program_name}
                    </strong>
                    <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
                      Semester {bp.current_semester} | {bp.section_count} section{bp.section_count !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div style={{ color: '#0066cc', fontSize: '14px', fontWeight: 'bold' }}>-&gt;</div>
                </div>
              ))
            )}
          </div>
        </div>

        {showAddSubjectModal && (
          <div className="modal-overlay" onClick={() => setShowAddSubjectModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
              <h2>Add Subject</h2>
              <form onSubmit={handleAddSubjectToDatabase}>
                <div className="form-group">
                  <label>Subject Name</label>
                  <input
                    className="form-control"
                    value={subjectForm.name}
                    onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                    placeholder="e.g., Data Structures"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Subject Type</label>
                  <select
                    className="form-control"
                    value={subjectForm.type}
                    onChange={(e) => setSubjectForm({ ...subjectForm, type: e.target.value })}
                    required
                  >
                    <option value="">Select type</option>
                    {subjectTypeOptions.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                    <option value={CUSTOM_TYPE_VALUE}>Add New Type...</option>
                  </select>
                </div>

                {subjectForm.type === CUSTOM_TYPE_VALUE && (
                  <div className="form-group">
                    <label>New Subject Type</label>
                    <input
                      className="form-control"
                      value={subjectForm.customType}
                      onChange={(e) => setSubjectForm({ ...subjectForm, customType: e.target.value })}
                      placeholder="e.g., Professional Elective"
                      required
                    />
                    <div style={{ marginTop: '8px' }}>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddCustomTypeToList}>
                        Add Type
                      </button>
                    </div>
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label>Credits</label>
                    <input
                      type="number"
                      className="form-control"
                      value={subjectForm.credits}
                      onChange={(e) => setSubjectForm({ ...subjectForm, credits: e.target.value })}
                      min="0"
                      step="0.5"
                    />
                  </div>
                  <div className="form-group">
                    <label>Periods</label>
                    <input
                      type="number"
                      className="form-control"
                      value={subjectForm.periods}
                      onChange={(e) => setSubjectForm({ ...subjectForm, periods: e.target.value })}
                      min="1"
                    />
                  </div>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowAddSubjectModal(false);
                      setSubjectForm({ name: '', type: '', customType: '', credits: 1, periods: 1 });
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Add Subject
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showAllSubjectsModal && (
          <div className="modal-overlay" onClick={() => setShowAllSubjectsModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '80vh', overflowY: 'auto' }}>
              <h2>All Subjects</h2>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowAllSubjectsModal(false)}
                style={{ position: 'absolute', right: '16px', top: '16px' }}
              >
                Close
              </button>
              {sortedAllSubjects.length === 0 ? (
                <p style={{ color: '#666' }}>No subjects available.</p>
              ) : (
                <div className="data-table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Credits</th>
                        <th>Periods</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedAllSubjects.map((s) => (
                        <tr key={s.code}>
                          <td>{s.code}</td>
                          <td>{s.name}</td>
                          <td>{s.subject_type}</td>
                          <td>{s.credits ?? '-'}</td>
                          <td>{s.periods ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Format and section view
  return (
    <div className="page-container">
      <div className="page-header">
        <button
          className="btn btn-secondary"
          onClick={() => {
            setSelectedBatchProgram(null);
            setShowFormatModal(false);
            setShowSectionAssignModal(false);
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <HiArrowLeft /> Back
        </button>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <h2 style={{ margin: 0 }}>
            {selectedBatchProgram.batch_name} - {selectedBatchProgram.program_name}
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#666' }}>
            Sem {selectedBatchProgram.current_semester} | {selectedBatchProgram.section_count} section
            {selectedBatchProgram.section_count !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="section-header">
          <h2>Define Format</h2>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleOpenFormatModal}
            disabled={isLoadingFormat}
          >
            {isLoadingFormat ? 'Loading...' : 'Define Format'}
          </button>
        </div>
        <p style={{ marginBottom: 0, color: '#666' }}>
          Define slot codes for this semester. Common slots require a subject selection now; other slots are mapped per section.
        </p>
        <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: '13px' }}>
          Last updated: {formatUpdatedDisplay}
        </p>
      </div>

      <div className="card">
        <div className="section-header">
          <h2>Sections</h2>
        </div>
        <div style={{ display: 'grid', gap: '8px' }}>
          {selectedSections.length === 0 ? (
            <p style={{ padding: '20px', textAlign: 'center', color: 'var(--gray-400)' }}>No sections</p>
          ) : (
            selectedSections.map((section) => (
              <div
                key={section.id}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  padding: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <strong>Section {section.name}</strong> - Sem {section.semester}
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => handleOpenSectionAssign(section)}>
                  Assign Subjects
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {showFormatModal && formatDetails && (
        <div className="modal-overlay" onClick={() => setShowFormatModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '80vh', overflowY: 'auto' }}>
            <h2>Define Format</h2>

            <div style={{ marginBottom: '20px' }}>
              <h3>Add Format Slot</h3>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Format Code</label>
                  <input
                    className="form-control"
                    value={formatTemplateCode}
                    onChange={(e) => setFormatTemplateCode(e.target.value.toUpperCase())}
                    placeholder="e.g., CS3101"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Type</label>
                  <select
                    className="form-control"
                    value={formatSubjectType}
                    onChange={(e) => {
                      setFormatSubjectType(e.target.value);
                      setFormatCommonSubjectCode('');
                    }}
                  >
                    <option value="">Select type</option>
                    {formatTypeOptions.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                    <option value={CUSTOM_TYPE_VALUE}>Add New Type...</option>
                  </select>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={handleAddSubjectToFormat} style={{ marginBottom: 0 }}>
                  <HiOutlinePlus /> Add
                </button>
              </div>
              {resolvedFormatType === 'Common' && (
                <div style={{ marginTop: '8px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Select Common Subject</label>
                  <select
                    className="form-control"
                    value={formatCommonSubjectCode}
                    onChange={(e) => setFormatCommonSubjectCode(e.target.value)}
                  >
                    <option value="">Select subject</option>
                    {(availableSubjectsByType.Common || []).map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.code} - {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {formatSubjectType === CUSTOM_TYPE_VALUE && (
                <div style={{ marginTop: '8px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>New Type</label>
                  <input
                    className="form-control"
                    value={formatCustomType}
                    onChange={(e) => {
                      setFormatCustomType(e.target.value);
                      setFormatCommonSubjectCode('');
                    }}
                    placeholder="Type name"
                  />
                  <div style={{ marginTop: '8px' }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddCustomFormatTypeToList}>
                      Add Type
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h3>Current Format Slots</h3>
              {formatSubjects.length === 0 ? (
                <p style={{ color: '#666' }}>No slots added yet</p>
              ) : (
                <div style={{ display: 'grid', gap: '6px' }}>
                  {formatSubjects.map((s) => (
                    <div
                      key={s.code}
                      style={{
                        border: '1px solid #ddd',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span>
                        {s.code} <span style={{ color: '#999', fontSize: '12px' }}>({s.type})</span>
                        {s.subject_code ? ` -> ${s.subject_code}${s.subject_name ? ` - ${s.subject_name}` : ''}` : ''}
                      </span>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleRemoveSubjectFromFormat(s.code)}
                      >
                        <HiOutlineTrash />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowFormatModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveFormat}>
                Save Format
              </button>
            </div>
          </div>
        </div>
      )}

      {showSectionAssignModal && selectedSection && formatDetails && (
        <div className="modal-overlay" onClick={() => setShowSectionAssignModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '80vh', overflowY: 'auto' }}>
            <h2>Assign Subjects to Section {selectedSection.name}</h2>

            <div style={{ marginBottom: '20px' }}>
              <h3>Format Slot Mapping</h3>
              {formatDetails.format_subjects.length === 0 ? (
                <p style={{ color: '#666' }}>No format slots defined</p>
              ) : (
                <div style={{ display: 'grid', gap: '8px' }}>
                  {formatDetails.format_subjects.map((slot) => {
                    const options = availableSubjectsByType[slot.type] || [];
                    return (
                      <div key={slot.code} style={{ border: '1px solid #ddd', borderRadius: '6px', padding: '10px' }}>
                        <div style={{ marginBottom: '6px' }}>
                          <strong>{slot.code}</strong> <span style={{ color: '#999', fontSize: '12px' }}>({slot.type})</span>
                        </div>
                        {slot.type === 'Common' ? (
                          <div style={{ color: '#666' }}>
                            {slot.subject_code ? `${slot.subject_code}${slot.subject_name ? ` - ${slot.subject_name}` : ''}` : 'No subject selected in format'}
                          </div>
                        ) : (
                          <select
                            className="form-control"
                            value={sectionAssignments[slot.code] || ''}
                            onChange={(e) => handleChangeSectionAssignment(slot.code, e.target.value)}
                          >
                            <option value="">Select subject</option>
                            {options.map((subject) => (
                              <option key={subject.code} value={subject.code}>
                                {subject.code} - {subject.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowSectionAssignModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveSectionAssignment}>
                Save Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {false && showFacultyModal && selectedSubjectForFaculty && selectedBatchProgram && (
        <div className="modal-overlay" onClick={() => setShowFacultyModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '80vh', overflowY: 'auto' }}>
            <h2>Allocate Faculty for {selectedSubjectForFaculty.code} - {selectedSubjectForFaculty.name}</h2>

            <div style={{ marginBottom: '20px' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Section</th>
                    <th>Current Faculty</th>
                    <th>Assign Faculty</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedBatchProgram.sections?.map((section) => {
                    const key = `${selectedBatchProgram.batch_id}-${section.id}`;
                    const currentFaculty = getAllocatedFaculty(selectedSubjectForFaculty.code, selectedBatchProgram.batch_id, section.id);
                    return (
                      <tr key={section.id}>
                        <td>Section {section.name}</td>
                        <td>{currentFaculty}</td>
                        <td>
                          <select
                            className="form-control"
                            value={selectedFacultyForSubject[key] || ''}
                            onChange={(e) => handleFacultySelection(selectedBatchProgram.batch_id, section.id, e.target.value)}
                          >
                            <option value="">Select Faculty</option>
                            {faculty.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.name}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowFacultyModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveFacultyAllocations}>
                Save Allocations
              </button>
            </div>
          </div>
        </div>
      )}

      {false && (
      <div className="page-section">
        <h2>Faculty Allocation</h2>
        <p>Assign faculty to subjects for each section</p>

        {formatDetails && formatDetails.format_subjects && formatDetails.format_subjects.length > 0 ? (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Subject Code</th>
                  <th>Subject Name</th>
                  <th>Type</th>
                  {selectedBatchProgram?.sections?.map((section) => (
                    <th key={section.id}>Section {section.name}</th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {formatDetails.format_subjects.map((subject) => (
                  <tr key={subject.code}>
                    <td>{subject.code}</td>
                    <td>{subject.subject_name || subject.name || '-'}</td>
                    <td>{subject.type}</td>
                    {selectedBatchProgram?.sections?.map((section) => (
                      <td key={section.id}>
                        {getAllocatedFaculty(subject.code, selectedBatchProgram.batch_id, section.id)}
                      </td>
                    ))}
                    <td>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleOpenFacultyModal(subject)}
                      >
                        Allocate Faculty
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: '#666' }}>Define a format first to allocate faculty</p>
        )}

        {isAllSubjectsAllocated() && (
          <div style={{ marginTop: '20px', padding: '20px', border: '1px solid #28a745', borderRadius: '6px', backgroundColor: '#f8fff9' }}>
            <h3 style={{ color: '#28a745', margin: '0 0 10px 0' }}>✅ All subjects allocated!</h3>
            <p style={{ margin: '0 0 15px 0' }}>You can now generate the timetable for all sections.</p>
            <button
              className="btn btn-success"
              onClick={handleGenerateTimetable}
              disabled={isGeneratingTimetable}
            >
              {isGeneratingTimetable ? 'Generating...' : 'Generate Timetable'}
            </button>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
