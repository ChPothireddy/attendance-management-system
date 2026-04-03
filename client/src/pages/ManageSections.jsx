import { useState, useEffect } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineTrash, HiOutlinePencil } from 'react-icons/hi';

export default function ManageSections() {
  const [sections, setSections] = useState([]);
  const [groupedSections, setGroupedSections] = useState([]);
  const [batches, setBatches] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [sectionForm, setSectionForm] = useState({ name: '', batch_id: '' });
  const [selectedBatchProgram, setSelectedBatchProgram] = useState('');
  const [batchForm, setBatchForm] = useState({ name: '', program_id: '' });
  const [programForm, setProgramForm] = useState({ name: '', duration_semesters: 8 });

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [sectionsRes, batchesRes, programsRes] = await Promise.all([
        API.get('/department/sections'),
        API.get('/department/batches'),
        API.get('/department/programs'),
      ]);
      const sectionsData = sectionsRes.data || [];
      setSections(sectionsData);
      setBatches(batchesRes.data || []);
      setPrograms(programsRes.data || []);

      // Group sections by batch-program
      const grouped = sectionsData.reduce((acc, s) => {
        const key = `${s.batch_id}-${s.program_id}`;
        if (!acc[key]) {
          acc[key] = {
            batch_name: s.batch_name,
            program_name: s.program_name,
            sections: [],
            sectionIds: [],
            current_semester: s.current_semester,
            batch_id: s.batch_id,
            program_id: s.program_id,
            recently_updated: s.recently_updated
          };
        }
        acc[key].sections.push(s.name);
        acc[key].sectionIds.push(s.id);
        return acc;
      }, {});
      setGroupedSections(Object.values(grouped));
    } catch {
      toast.error('Failed to load data');
    }
  };

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    try {
      await API.post('/department/batches', batchForm);
      toast.success('Batch created!');
      setShowBatchModal(false);
      setBatchForm({ name: '', program_id: '' });
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handleCreateProgram = async (e) => {
    e.preventDefault();
    try {
      await API.post('/department/programs', programForm);
      toast.success('Program created!');
      setShowProgramModal(false);
      setProgramForm({ name: '', duration_semesters: 8 });
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handleCreateSection = async (e) => {
    e.preventDefault();
    try {
      await API.post('/department/sections', sectionForm);
      toast.success('Section created!');
      setShowSectionModal(false);
      setSectionForm({ name: '', batch_id: '' });
      setSelectedBatchProgram('');
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handleIncrementSemester = async (sectionIds) => {
    try {
      if (Array.isArray(sectionIds)) {
        await Promise.all(sectionIds.map(id => API.put(`/department/sections/${id}`, { increment_semester: true })));
      } else {
        await API.put(`/department/sections/${sectionIds}`, { increment_semester: true });
      }
      toast.success('Semester updated!');
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed update');
    }
  };

  const handleDeleteSection = async (id) => {
    if (!confirm('Delete this section?')) return;
    try {
      await API.delete(`/department/sections/${id}`);
      toast.success('Deleted');
      loadAll();
    } catch {
      toast.error('Failed');
    }
  };

  const handleDeleteGroup = async (batchId, programId) => {
    if (!confirm('Delete all sections for this batch-program?')) return;
    try {
      await API.delete('/department/sections/delete_group', { data: { batch_id: Number(batchId), program_id: Number(programId) } });
      toast.success('Group deleted');
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header"><h1>Sections</h1><p>Manage class sections in your department</p></div>
      <div className="card">
        <div className="section-header">
          <h2>All Sections</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-primary btn-sm" onClick={() => setShowSectionModal(true)}><HiOutlinePlus /> Add Section</button>
          </div>
        </div>

        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Batch-Program</th>
                <th>Sections</th>
                <th>Semester</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {groupedSections.length === 0 ? (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-400)' }}>No sections available</td></tr>
              ) : (
                groupedSections.map((g) => (
                  <tr key={`${g.batch_id}-${g.program_id}`} style={{ background: g.recently_updated ? 'rgba(56, 182, 255, 0.12)' : 'transparent' }}>
                    <td>{g.batch_name} - {g.program_name}</td>
                    <td>{g.sections.join(', ')}</td>
                    <td>Sem {g.current_semester || 1}</td>
                    <td style={{ display: 'flex', gap: '6px' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleIncrementSemester(g.sectionIds)}>Update Sem</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDeleteGroup(g.batch_id, g.program_id)}>Delete All</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showSectionModal && (
        <div className="modal-overlay" onClick={() => setShowSectionModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add Section</h2>
            <form onSubmit={handleCreateSection}>
              <div className="form-group"><label>Section Name</label><input className="form-control" value={sectionForm.name} onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })} required /></div>
              <div className="form-row">
                <div className="form-group"><label>Batch</label><div style={{ display: 'flex', gap: '8px' }}><select className="form-control" value={sectionForm.batch_id} onChange={(e) => {
                    const value = e.target.value;
                    const selected = batches.find((b) => String(b.id) === String(value));
                    setSectionForm({ ...sectionForm, batch_id: value });
                    setSelectedBatchProgram(selected ? selected.program_name || '' : '');
                  }} required><option value="">Select batch</option>{batches.map((b) => <option key={b.id} value={b.id}>{b.name}{b.program_name ? ` - ${b.program_name}` : ''}</option>)}</select><button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowBatchModal(true)}>+ Batch</button></div></div>
                <div className="form-group"><label>Program</label><input className="form-control" value={selectedBatchProgram || 'Select batch first'} readOnly /></div>
              </div>
              <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setShowSectionModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">Create</button></div>
            </form>
          </div>
        </div>
      )}

      {showBatchModal && (
        <div className="modal-overlay" onClick={() => setShowBatchModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add Batch</h2>
            <form onSubmit={handleCreateBatch}>
              <div className="form-group"><label>Batch Name</label><input className="form-control" value={batchForm.name} onChange={(e) => setBatchForm({ ...batchForm, name: e.target.value })} required /></div>
              <div className="form-group"><label>Program</label><div style={{ display: 'flex', gap: '8px' }}><select className="form-control" value={batchForm.program_id} onChange={(e) => setBatchForm({ ...batchForm, program_id: e.target.value })} required><option value="">Select program</option>{programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select><button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowProgramModal(true)}>+ Program</button></div></div>
              <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setShowBatchModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">Create</button></div>
            </form>
          </div>
        </div>
      )}

      {showProgramModal && (
        <div className="modal-overlay" onClick={() => setShowProgramModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add Program</h2>
            <form onSubmit={handleCreateProgram}>
              <div className="form-group"><label>Program Name</label><input className="form-control" value={programForm.name} onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })} required /></div>
              <div className="form-group"><label>Duration (Semesters)</label><input type="number" className="form-control" value={programForm.duration_semesters} min="1" onChange={(e) => setProgramForm({ ...programForm, duration_semesters: Number(e.target.value) })} required /></div>
              <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setShowProgramModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">Create</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
