import React, { useEffect, useMemo, useState } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';

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
          <div className="section-header">
            <h2>Weekly Schedule</h2>
          </div>

          <div className="data-table-wrapper">
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
                {grid.map((day) => (
                  <tr key={day.dayName}>
                    <td style={{ fontWeight: 700 }}>{day.dayName}</td>

                    {day.slots.map((slot, index) => {
                      if (index === 2) {
                        return (
                          <React.Fragment key={`${day.dayName}-group-${index}`}>
                            {/* LUNCH */}
                            <td
                              style={{
                                textAlign: 'center',
                                fontWeight: 700,
                                background: '#f3f4f6',
                              }}
                            >
                              🍽️
                            </td>

                            {/* P3 */}
                            <td style={{ minWidth: 150 }}>
                              {slot.entry ? (
                                <>
                                  <div style={{ fontWeight: 700, color: 'var(--gray-900)' }}>
                                    {slot.entry.subject_code}
                                  </div>
                                  <div style={{ fontSize: '0.82rem', color: 'var(--gray-600)' }}>
                                    {slot.entry.subject_name}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: '0.78rem',
                                      color: 'var(--gray-500)',
                                      marginTop: 4,
                                    }}
                                  >
                                    Section {slot.entry.section_name} • {slot.entry.batch_name}
                                  </div>
                                </>
                              ) : (
                                <span style={{ color: 'var(--gray-400)' }}>No class</span>
                              )}
                            </td>
                          </React.Fragment>
                        );
                      }

                      return (
                        <td key={`${day.dayName}-${slot.slotLabel}`} style={{ minWidth: 150 }}>
                          {slot.entry ? (
                            <>
                              <div style={{ fontWeight: 700, color: 'var(--gray-900)' }}>
                                {slot.entry.subject_code}
                              </div>
                              <div style={{ fontSize: '0.82rem', color: 'var(--gray-600)' }}>
                                {slot.entry.subject_name}
                              </div>
                              <div
                                style={{
                                  fontSize: '0.78rem',
                                  color: 'var(--gray-500)',
                                  marginTop: 4,
                                }}
                              >
                                Section {slot.entry.section_name} • {slot.entry.batch_name}
                              </div>
                            </>
                          ) : (
                            <span style={{ color: 'var(--gray-400)' }}>No class</span>
                          )}
                        </td>
                      );
                    })}
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