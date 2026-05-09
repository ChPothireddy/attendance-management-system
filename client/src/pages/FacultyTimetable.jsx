import React, { useEffect, useMemo, useState } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';
import { HiOutlineDownload } from 'react-icons/hi';

const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const slotLabels = [
  '09:00-10:40',
  '10:40-12:20',
  '01:30-03:10',
  '03:10-04:00',
];

export default function FacultyTimetable() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    API.get('/faculty/timetable')
      .then((res) => setEntries(res.data))
      .catch((err) => toast.error(err.response?.data?.error || 'Failed to load faculty timetable'))
      .finally(() => setLoading(false));
  }, []);

  const grid = useMemo(() => {
    return dayOrder.map((dayName, dayIndex) => ({
      dayName,
      slots: slotLabels.map((slotLabel, slotIndex) => {
        const entry = entries.find(
          (item) => item.day_order === dayIndex && item.slot_index === slotIndex
        );
        return { slotLabel, entry };
      }),
    }));
  }, [entries]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await API.get('/faculty/timetable/download', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(
        new Blob([response.data], { type: 'application/pdf' })
      );
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'my-timetable.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Timetable downloaded!');
    } catch {
      toast.error('Failed to download timetable');
    } finally {
      setDownloading(false);
    }
  };

  const CellContent = ({ entry }) =>
    entry ? (
      <>
        <div style={{ fontWeight: 700, color: 'var(--gray-900)', fontSize: '0.82rem' }}>
          {entry.subject_code}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)', lineHeight: 1.3 }}>
          {entry.subject_name}
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--gray-500)', marginTop: 3 }}>
          Sec {entry.section_name} • {entry.batch_name}
        </div>
      </>
    ) : (
      <span style={{ color: 'var(--gray-400)', fontSize: '0.78rem' }}>—</span>
    );

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>My Timetable</h1>
        <p>Follow your allotted classes section by section through the week.</p>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : !entries.length ? (
        <div className="card empty-state">
          <p>No timetable has been generated yet for your allocations.</p>
        </div>
      ) : (
        <div className="card">
          <div
            className="section-header"
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <h2>Weekly Schedule</h2>
            <button
              className="btn btn-secondary"
              onClick={handleDownload}
              disabled={downloading}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <HiOutlineDownload size={16} />
              {downloading ? 'Downloading...' : 'Download PDF'}
            </button>
          </div>

          <div className="data-table-wrapper" style={{ overflowX: 'auto' }}>
            <table
              className="data-table"
              style={{ tableLayout: 'fixed', width: '100%', minWidth: 700 }}
            >
              <colgroup>
                <col style={{ width: '10%' }} />  {/* Day */}
                <col style={{ width: '16%' }} />  {/* P1 */}
                <col style={{ width: '16%' }} />  {/* P2 */}
                <col style={{ width: '6%'  }} />  {/* Lunch */}
                <col style={{ width: '16%' }} />  {/* P3 */}
                <col style={{ width: '16%' }} />  {/* P4 */}
              </colgroup>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Day</th>
                  <th>
                    P1<br />
                    <span style={{ fontWeight: 400, fontSize: '0.75rem' }}>{slotLabels[0]}</span>
                  </th>
                  <th>
                    P2<br />
                    <span style={{ fontWeight: 400, fontSize: '0.75rem' }}>{slotLabels[1]}</span>
                  </th>
                  <th style={{ background: '#f3f4f6', fontWeight: 700, textAlign: 'center' }}>
                    🍽️
                  </th>
                  <th>
                    P3<br />
                    <span style={{ fontWeight: 400, fontSize: '0.75rem' }}>{slotLabels[2]}</span>
                  </th>
                  <th>
                    P4<br />
                    <span style={{ fontWeight: 400, fontSize: '0.75rem' }}>{slotLabels[3]}</span>
                  </th>
                </tr>
              </thead>

              <tbody>
                {grid.map((day) => (
                  <tr key={day.dayName}>
                    <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{day.dayName}</td>

                    {/* P1 */}
                    <td><CellContent entry={day.slots[0].entry} /></td>

                    {/* P2 */}
                    <td><CellContent entry={day.slots[1].entry} /></td>

                    {/* LUNCH */}
                    <td style={{ textAlign: 'center', background: '#f3f4f6' }}>🍽️</td>

                    {/* P3 */}
                    <td><CellContent entry={day.slots[2].entry} /></td>

                    {/* P4 */}
                    <td><CellContent entry={day.slots[3].entry} /></td>
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