import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Users, FileText, Clock, Briefcase, AlertTriangle, Brain, Download, Shield, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import StatusTimeline from '../Components/StatusTimeline';
import DepartmentSelector from '../Components/DepartmentSelector';
import api from '../services/api';

const PrincipalDashboard = () => {
  const { users, leaves, addUser, updateLeaveStatus, predictions, comparisonData, departmentHealth, departments } = useAppContext();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newHodInfo, setNewHodInfo] = useState({ name: '', email: '', department: '', password: '', department_id: '' });
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [reviewComment, setReviewComment] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);
  const [showAudit, setShowAudit] = useState(false);

  const hods = users.filter(u => u.role === 'HOD');
  const reviewableLeaves = leaves.filter(l => l.status === 'PENDING_PRINCIPAL');
  const totalStaff = users.filter(u => u.role !== 'STUDENT').length;

  const COLORS = ['#6366f1', '#8b5cf6', '#06d6a0', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899'];

  const handleAddHod = async (e) => {
    e.preventDefault();
    try {
      await addUser({ ...newHodInfo, role: 'HOD' });
      setShowAddModal(false);
      setNewHodInfo({ name: '', email: '', department: '', password: '', department_id: '' });
    } catch (err) {}
  };

  const handleStatusUpdate = async (id, status) => {
    await updateLeaveStatus(id, status, reviewComment);
    setReviewComment('');
    setSelectedLeave(null);
  };

  const loadAuditLogs = async () => {
    try {
      const res = await api.get('/audit-logs?limit=30');
      setAuditLogs(res.data);
      setShowAudit(true);
    } catch (err) {}
  };

  const exportCSV = () => {
    const headers = ['Name,Department,Type,Start,End,Score,Status\n'];
    const rows = reviewableLeaves.map(l => `"${l.userName}","${l.dept_name || l.department}","${l.leave_type}","${l.start_date}","${l.end_date}",${l.priority_score?.toFixed(0)},"${l.status}"\n`);
    const blob = new Blob([headers, ...rows], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'principal_audit.csv'; a.click();
  };

  return (
    <div className="erp-dashboard-grid">
      <div className="erp-col-12" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Principal Command Center</h1>
          <p style={{ color: 'var(--alis-text-muted)', fontSize: '13px' }}>Institutional oversight & final authority</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="erp-btn erp-btn-outline" onClick={loadAuditLogs}>
            <Activity size={14} /> Audit Trail
          </button>
          <button className="erp-btn erp-btn-primary" onClick={() => setShowAddModal(true)}>
            <Users size={14} /> Add HOD
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="erp-col-3">
        <div className="alis-stat-card">
          <div className="alis-stat-icon" style={{ background: 'var(--alis-primary-bg)', color: 'var(--alis-primary)' }}>🏛️</div>
          <div className="alis-stat-value">{departments.length}</div>
          <div className="alis-stat-label">Departments</div>
        </div>
      </div>
      <div className="erp-col-3">
        <div className="alis-stat-card">
          <div className="alis-stat-icon" style={{ background: 'var(--alis-success-bg)', color: 'var(--alis-success)' }}>👥</div>
          <div className="alis-stat-value">{totalStaff}</div>
          <div className="alis-stat-label">Total Faculty</div>
        </div>
      </div>
      <div className="erp-col-3">
        <div className="alis-stat-card">
          <div className="alis-stat-icon" style={{ background: 'var(--alis-warning-bg)', color: 'var(--alis-warning)' }}>⏳</div>
          <div className="alis-stat-value">{reviewableLeaves.length}</div>
          <div className="alis-stat-label">Final Approvals</div>
        </div>
      </div>
      <div className="erp-col-3">
        <div className="alis-gradient-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <AlertTriangle size={14} /> <span style={{ fontSize: '12px', fontWeight: 600 }}>Alert</span>
          </div>
          <p style={{ fontSize: '12px', opacity: 0.9, lineHeight: '1.4' }}>
            {predictions?.suggestion || 'No critical alerts.'}
          </p>
        </div>
      </div>

      {/* Department Health */}
      {departmentHealth.length > 0 && (
        <div className="erp-col-12">
          <div className="erp-card">
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>Department Health Overview</h3>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(departmentHealth.length, 4)}, 1fr)`, gap: '12px' }}>
              {departmentHealth.filter(d => d.totalMembers > 0).map((dept, i) => (
                <div key={i} style={{ padding: '14px', borderRadius: '12px', background: 'var(--alis-bg)', border: '1px solid var(--alis-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>{dept.departmentName}</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: dept.availabilityRate >= 80 ? 'var(--alis-success)' : 'var(--alis-warning)' }}>
                      {dept.availabilityRate}%
                    </span>
                  </div>
                  <div className="alis-progress" style={{ marginBottom: '8px' }}>
                    <div className="alis-progress-bar" style={{ width: `${dept.availabilityRate}%`, background: dept.availabilityRate >= 80 ? 'var(--alis-success)' : 'var(--alis-warning)' }}></div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--alis-text-muted)' }}>
                    <span>{dept.totalMembers} members</span>
                    <span>{dept.onLeaveToday} on leave</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Review + Comparison */}
      <div className="erp-col-8">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Review Section */}
          <div className="erp-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--alis-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600 }}>Final Institutional Review</h3>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button className="erp-btn erp-btn-outline" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={exportCSV}>
                  <Download size={12} /> CSV
                </button>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--alis-primary)' }}>
                  <Brain size={12} style={{ marginRight: '4px' }} />Final Authority
                </span>
              </div>
            </div>
            <div style={{ overflowY: 'auto', maxHeight: '400px' }}>
              {reviewableLeaves.length > 0 ? (
                <table className="erp-table">
                  <thead><tr><th>Applicant</th><th>Department</th><th>Type</th><th>Score</th><th>Actions</th></tr></thead>
                  <tbody>
                    {reviewableLeaves.map(leave => (
                      <tr key={leave.id} onClick={() => setSelectedLeave(leave)} style={{ cursor: 'pointer', background: selectedLeave?.id === leave.id ? 'var(--alis-primary-bg)' : '' }}>
                        <td style={{ fontWeight: 600, fontSize: '13px' }}>{leave.userName}</td>
                        <td><span className="alis-badge-role alis-badge-hod" style={{ fontSize: '9px' }}>{leave.dept_name || leave.department || 'N/A'}</span></td>
                        <td style={{ fontSize: '12px' }}>{leave.leave_type}</td>
                        <td>
                          <span className={`alis-score-${leave.priority_score >= 70 ? 'high' : leave.priority_score >= 40 ? 'medium' : 'low'}`}
                            style={{ width: '30px', height: '30px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>
                            {leave.priority_score?.toFixed(0)}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }} onClick={e => e.stopPropagation()}>
                            <button className="erp-btn erp-btn-primary" style={{ padding: '4px 10px', fontSize: '11px' }}
                              onClick={() => handleStatusUpdate(leave.id, 'APPROVED')}>Approve</button>
                            <button className="erp-btn erp-btn-outline" style={{ padding: '4px 10px', fontSize: '11px', color: 'var(--alis-danger)' }}
                              onClick={() => handleStatusUpdate(leave.id, 'REJECTED')}>Reject</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: '60px', textAlign: 'center', color: 'var(--alis-text-muted)' }}>
                  <FileText size={36} style={{ opacity: 0.2, marginBottom: '12px' }} />
                  <p style={{ fontSize: '13px' }}>No pending approvals.</p>
                </div>
              )}
            </div>
          </div>

          {/* Dept Comparison Chart */}
          {comparisonData.length > 0 && (
            <div className="erp-card">
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>Department Comparison</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--alis-border)" />
                  <XAxis dataKey="department" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: 'var(--alis-bg-panel)', border: '1px solid var(--alis-border)', borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="total_requests" name="Total">
                    {comparisonData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                  <Bar dataKey="approved_count" name="Approved" fill="var(--alis-success)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <div className="erp-col-4">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {selectedLeave && (
            <div className="erp-card">
              <h3 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px' }}>Review Feedback</h3>
              <textarea className="erp-input" placeholder="Feedback..." style={{ height: '80px', fontSize: '12px', marginBottom: '10px' }}
                value={reviewComment} onChange={e => setReviewComment(e.target.value)} />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="erp-btn erp-btn-primary" style={{ flex: 1, fontSize: '12px' }} onClick={() => handleStatusUpdate(selectedLeave.id, 'APPROVED')}>Approve</button>
                <button className="erp-btn erp-btn-outline" style={{ flex: 1, fontSize: '12px' }} onClick={() => handleStatusUpdate(selectedLeave.id, 'REJECTED')}>Reject</button>
              </div>
            </div>
          )}
          <StatusTimeline leave={selectedLeave} />

          {/* HODs List */}
          <div className="erp-card" style={{ padding: 0 }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--alis-border)' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 600 }}>Department Heads</h3>
            </div>
            {hods.map(h => (
              <div key={h.id} style={{ padding: '10px 18px', borderBottom: '1px solid var(--alis-border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 600 }}>{h.name}</p>
                  <p style={{ fontSize: '11px', color: 'var(--alis-text-muted)' }}>{h.department_name || h.department}</p>
                </div>
                <div className="erp-indicator erp-indicator-online" />
              </div>
            ))}
            {hods.length === 0 && <div style={{ padding: '20px', textAlign: 'center', fontSize: '12px', color: 'var(--alis-text-muted)' }}>No HODs registered yet.</div>}
          </div>
        </div>
      </div>

      {/* Add HOD Modal */}
      {showAddModal && (
        <div className="alis-modal-overlay">
          <div className="alis-modal">
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>Register Department Head</h2>
            <form onSubmit={handleAddHod} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div><label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--alis-text-muted)' }}>Full Name</label><input required className="erp-input" value={newHodInfo.name} onChange={e => setNewHodInfo({...newHodInfo, name: e.target.value})} /></div>
              <div><label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--alis-text-muted)' }}>Email</label><input required type="email" className="erp-input" value={newHodInfo.email} onChange={e => setNewHodInfo({...newHodInfo, email: e.target.value})} /></div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--alis-text-muted)' }}>Department</label>
                <DepartmentSelector value={newHodInfo.department_id} onChange={(v) => {
                  const dept = departments.find(d => d.id === parseInt(v));
                  setNewHodInfo({...newHodInfo, department_id: v, department: dept?.name || ''});
                }} />
              </div>
              <div><label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--alis-text-muted)' }}>Password</label><input required type="password" className="erp-input" value={newHodInfo.password} onChange={e => setNewHodInfo({...newHodInfo, password: e.target.value})} /></div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button type="button" className="erp-btn erp-btn-outline" style={{ flex: 1 }} onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="erp-btn erp-btn-primary" style={{ flex: 1 }}>Add HOD</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Audit Trail Modal */}
      {showAudit && (
        <div className="alis-modal-overlay" onClick={() => setShowAudit(false)}>
          <div className="alis-modal" style={{ maxWidth: '700px', maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Audit Trail</h2>
              <button className="erp-btn erp-btn-outline" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => setShowAudit(false)}>Close</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {auditLogs.map((log, i) => (
                <div key={i} style={{ padding: '10px 14px', background: 'var(--alis-bg)', borderRadius: '8px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span style={{ fontWeight: 600 }}>{log.action}</span>
                    <span style={{ color: 'var(--alis-text-muted)', fontSize: '11px' }}>{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                  <span style={{ color: 'var(--alis-text-muted)' }}>by {log.user_name || 'System'}</span>
                </div>
              ))}
              {auditLogs.length === 0 && <p style={{ textAlign: 'center', color: 'var(--alis-text-muted)' }}>No audit logs found.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrincipalDashboard;
