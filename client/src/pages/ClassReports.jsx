import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { HiOutlineDownload } from 'react-icons/hi';
import API from '../api/axios';

const reportLabels = {
  attendance: 'Attendance',
  marks: 'Marks',
};

export default function ClassReports() {
  const [sections, setSections] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [reportType, setReportType] = useState('attendance');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState('');

  useEffect(() => {
    API.get('/department/sections/flat')
      .then((res) => setSections(res.data || []))
      .catch(() => toast.error('Failed to load sections'));
  }, []);

  useEffect(() => {
    if (!selectedSectionId) {
      setReport(null);
      return;
    }
    setLoading(true);
    API.get(`/department/class-reports/${selectedSectionId}/${reportType}`)
      .then((res) => setReport(res.data))
      .catch((err) => {
        setReport(null);
        toast.error(err.response?.data?.error || 'Failed to load report');
      })
      .finally(() => setLoading(false));
  }, [selectedSectionId, reportType]);

  const handleDownload = async (format) => {
    if (!selectedSectionId) return;
    setDownloading(format);
    try {
      const response = await API.get(
        `/department/class-reports/${selectedSectionId}/${reportType}/download?format=${format}`,
        { responseType: 'blob' }
      );
      const extension = format === 'xlsx' ? 'xlsx' : 'pdf';
      const mimeType = format === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf';
      const url = window.URL.createObjectURL(new Blob([response.data], { type: mimeType }));
      const section = sections.find((item) => String(item.id) === String(selectedSectionId));
      const link = document.createElement('a');
      link.href = url;
      link.download = `class-${section?.name || selectedSectionId}-${reportType}-report.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.response?.data?.error || `Failed to download ${format.toUpperCase()}`);
    } finally {
      setDownloading('');
    }
  };

  const hasReport = report && report.rows?.length > 0;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Class Reports</h1>
        <p>View class-wise attendance and marks reports by current section subjects.</p>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="form-row">
          <div className="form-group">
            <label>Select Class</label>
            <select className="form-control" value={selectedSectionId} onChange={(e) => setSelectedSectionId(e.target.value)}>
              <option value="">Choose section</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  Section {section.name} - {section.batch_name} - Sem {section.current_semester}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Report</label>
            <select className="form-control" value={reportType} onChange={(e) => setReportType(e.target.value)}>
              <option value="attendance">Attendance</option>
              <option value="marks">Marks</option>
            </select>
          </div>
        </div>
      </div>

      {selectedSectionId && (
        <div className="card">
          <div className="section-header">
            <h2>{reportLabels[reportType]} Report</h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => handleDownload('pdf')} disabled={!report || downloading}>
                <HiOutlineDownload /> {downloading === 'pdf' ? 'Downloading...' : 'PDF'}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleDownload('xlsx')} disabled={!report || downloading}>
                <HiOutlineDownload /> {downloading === 'xlsx' ? 'Downloading...' : 'XLSX'}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="spinner" />
          ) : !report?.subjects?.length ? (
            <div className="empty-state"><p>No current subjects assigned for this class.</p></div>
          ) : !hasReport ? (
            <div className="empty-state"><p>No students found in this class.</p></div>
          ) : (
            <div className="data-table-wrapper">
              <table className="data-table" style={{ minWidth: Math.max(760, 260 + report.subjects.length * 120) }}>
                <thead>
                  <tr>
                    <th>Roll No</th>
                    <th>Student Name</th>
                    {report.subjects.map((subject) => (
                      <th key={subject.code} title={subject.name}>{subject.code}</th>
                    ))}
                    {reportType === 'attendance' && <th>Percentage</th>}
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((row) => (
                    <tr key={row.student_id}>
                      <td><span className="badge badge-info">{row.roll_no}</span></td>
                      <td style={{ fontWeight: 600 }}>{row.student_name}</td>
                      {report.subjects.map((subject) => (
                        <td key={subject.code}>{row.subjects?.[subject.code]?.display || (reportType === 'attendance' ? '0/0' : '0/30')}</td>
                      ))}
                      {reportType === 'attendance' && (
                        <td>
                          <span style={{ fontWeight: 700, color: row.percentage >= 75 ? 'var(--success-600)' : 'var(--danger-600)' }}>
                            {row.percentage}%
                          </span>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
