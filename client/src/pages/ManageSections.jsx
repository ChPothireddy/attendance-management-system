import { useState, useEffect } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineTrash, HiOutlinePencil } from 'react-icons/hi';

export default function ManageSections() {
  const [batchSections, setBatchSections] = useState([]);
  const [batches, setBatches] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [form, setForm] = useState({ name: '', current_semester: 1, batch_id: '' });
  const [batchForm, setBatchForm] = useState({ name: '', program_id: '' });

  useEffect(() => {
    load();
    loadBatches();
    loadPrograms();
  }, []);

  const load = () => API.get('/department/sections').then(r => setBatchSections(r.data)).catch(() => {});
  const loadBatches = () => API.get('/department/batches').then(r => setBatches(r.data)).catch(() => {});
  const loadPrograms = () => API.get('/department/programs').then(r => setPrograms(r.data)).catch(() => {});

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    try {
      await API.post('/department/batches', batchForm);
      toast.success('Batch created!');
      setShowBatchModal(false);
      setBatchForm({ name: '', program_id: '' });
      loadBatches();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      if (editingSection) {
        await API.put(`/department/sections/${editingSection.id}`, form);
        toast.success('Section updated!');
      } else {
        await API.post('/department/sections', form);
        toast.success('Section created!');
      }
      setShowModal(false);
      setEditingSection(null);
      setForm({ name: '', current_semester: 1, batch_id: '' });
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handleEdit = (s) => {
    setEditingSection(s);
    setForm({ name: s.name, current_semester: s.current_semester || 1, batch_id: s.batch_id?.toString() || '' });
    setShowModal(true);
  };

  const handleDeleteSection = async (id) => {
    if (!confirm('Delete this section?')) return;
    try { await API.delete(`/department/sections/${id}`); toast.success('Deleted'); load(); }
    catch { toast.error('Failed'); }
  };

  const handleUpdateBatchSemester = async (batchId) => {
    const newSemester = prompt('Enter new semester for all sections in this batch (1-8):', '1');
    if (!newSemester) return;
    try {
      const sem = parseInt(newSemester);
      if (sem < 1 || sem > 8) { toast.error('Semester must be 1-8'); return; }
      await API.put(`/department/batches/${batchId}/sections`, { current_semester: sem });
      toast.success('All sections updated!');
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handleDeleteBatch = async (batchId) => {
    if (!confirm('Delete ALL sections in this batch? This cannot be undone.')) return;
    try {
      await API.delete(`/department/batches/${batchId}/sections`);
      toast.success('All batch sections deleted!');
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  return (
    <div className="page-container">
      <div className="page-header"><h1>Sections</h1><p>Manage class sections in your department</p></div>
      <div className="card">
        <div className="section-header">
          <h2>All Batches & Sections</h2>
          <div style={{display:'flex', gap:'8px'}}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowBatchModal(true)}><HiOutlinePlus /> Add Batch</button>
            <button className="btn btn-primary btn-sm" onClick={() => { setEditingSection(null); setForm({ name: '', current_semester: 1, batch_id: '' }); setShowModal(true); }}><HiOutlinePlus /> Add Section</button>
          </div>
        </div>
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead><tr><th>Batch</th><th>Sections</th><th>Current Semester</th><th>Actions</th></tr></thead>
            <tbody>
              {batchSections.length === 0 ? <tr><td colSpan="4" style={{textAlign:'center',padding:'40px',color:'var(--gray-400)'}}>No batches with sections</td></tr> :
              batchSections.map(batch => (
                <tr key={batch.batch_id}>
                  <td style={{fontWeight:600}}>{batch.batch_name}</td>
                  <td>
                    <div style={{display:'flex', gap:'8px', flexWrap:'wrap'}}>
                      {batch.sections?.map(s => (
                        <span key={s.id} style={{background:'var(--blue-100)', color:'var(--blue-700)', padding:'4px 8px', borderRadius:'4px', fontSize:'12px', fontWeight:'500'}}>
                          {s.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>Sem {batch.current_semester}</td>
                  <td style={{display:'flex', gap:'8px'}}>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleUpdateBatchSemester(batch.batch_id)} title="Update semester for all sections"><HiOutlinePencil /> Edit All</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDeleteBatch(batch.batch_id)} title="Delete all sections in batch"><HiOutlineTrash /> Delete All</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editingSection ? 'Edit Section' : 'Add Section'}</h2>
            <form onSubmit={handleCreate}>
              <div className="form-row">
                <div className="form-group"><label>Section Name</label><input className="form-control" placeholder="e.g. A" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
                <div className="form-group"><label>Semester</label><select className="form-control" value={form.current_semester} onChange={e => setForm({...form, current_semester: +e.target.value})}>{[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}</select></div>
              </div>
              <div className="form-group"><label>Batch</label><select className="form-control" value={form.batch_id} onChange={e => setForm({...form, batch_id: e.target.value})} required><option value="">Select batch</option>{batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
              <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">{editingSection ? 'Save' : 'Create'}</button></div>
            </form>
          </div>
        </div>
      )}
      {showBatchModal && (
        <div className="modal-overlay" onClick={() => setShowBatchModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Add Batch</h2>
            <form onSubmit={handleCreateBatch}>
              <div className="form-group"><label>Batch Name</label><input className="form-control" placeholder="e.g. 2021-2025" value={batchForm.name} onChange={e => setBatchForm({...batchForm, name: e.target.value})} required /></div>
              <div className="form-group"><label>Program</label><select className="form-control" value={batchForm.program_id} onChange={e => setBatchForm({...batchForm, program_id: e.target.value})} required><option value="">Select program</option>{programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setShowBatchModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">Create</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
