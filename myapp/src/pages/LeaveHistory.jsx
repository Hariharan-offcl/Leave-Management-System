import React, { useState } from 'react';
import { FileText, Search, Download } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const LeaveHistory = () => {
  const { getMyLeaves, currentUser } = useAppContext();
  const [search, setSearch] = useState('');
  
  const myLeaves = getMyLeaves().filter(l => 
    l.leave_type.toLowerCase().includes(search.toLowerCase()) || 
    l.status.toLowerCase().includes(search.toLowerCase())
  );

  const exportCSV = () => {
    const headers = ['Leave ID,Type,Duration,Start Date,End Date,Status,Score,Manager Feedback\n'];
    const rows = myLeaves.map(l => 
      `#${l.id},${l.leave_type},${l.duration_type || 'FULL'},${l.start_date?.split('T')[0]},${l.end_date?.split('T')[0]},${l.status},${l.priority_score?.toFixed(0) || 0},"${l.reviewer_comment || ''}"\n`
    );
    const blob = new Blob([headers, ...rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leave_history_${currentUser?.name || 'user'}.csv`;
    a.click();
  };

  return (
    <div className="erp-dashboard-grid">
      <div className="erp-col-12" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Personal Leave History</h1>
          <p style={{ color: 'var(--alis-text-muted)', fontSize: '13px' }}>Audit and export your past records</p>
        </div>
        <button className="erp-btn erp-btn-outline" onClick={exportCSV}>
          <Download size={14} /> Export to CSV
        </button>
      </div>

      <div className="erp-col-12">
        <div className="erp-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--alis-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Application Records</h3>
            <div style={{ position: 'relative', width: '250px' }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--alis-text-muted)' }} />
              <input 
                className="erp-input" 
                placeholder="Search type, status..." 
                style={{ paddingLeft: '34px', height: '36px', fontSize: '13px' }}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div style={{ overflowX: 'auto', minHeight: '400px' }}>
            {myLeaves.length > 0 ? (
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Leave Ref</th>
                    <th>Type & Category</th>
                    <th>Date Range</th>
                    <th>ALIS Score</th>
                    <th>Approval Status</th>
                    <th>Authority Feedback</th>
                  </tr>
                </thead>
                <tbody>
                  {myLeaves.map(leave => (
                    <tr key={leave.id}>
                      <td style={{ fontWeight: 600, color: 'var(--alis-text-muted)', fontSize: '12px' }}>#{leave.id}</td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '13px' }}>{leave.leave_type} Leave</div>
                        <div style={{ fontSize: '11px', color: 'var(--alis-text-muted)', textTransform: 'capitalize' }}>
                          {leave.duration_type?.replace('_', ' ') || 'Full Day'}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '13px', fontWeight: 500 }}>{leave.start_date?.split('T')[0]}</div>
                        <div style={{ fontSize: '11px', color: 'var(--alis-text-muted)' }}>till {leave.end_date?.split('T')[0]}</div>
                      </td>
                      <td>
                        <div className={`alis-score-${leave.priority_score >= 70 ? 'high' : leave.priority_score >= 40 ? 'medium' : 'low'}`}
                             style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>
                          {leave.priority_score?.toFixed(0) || 0}
                        </div>
                      </td>
                      <td>
                        <span className={`alis-badge-role erp-badge-${leave.status.toLowerCase().replace(/_/g, '_')}`}>
                          {leave.status}
                        </span>
                      </td>
                      <td style={{ maxWidth: '280px', fontSize: '12px', lineHeight: '1.4' }}>
                        {leave.reviewer_comment ? (
                          <div style={{ background: 'var(--alis-bg)', padding: '6px 10px', borderRadius: '6px', borderLeft: '2px solid var(--alis-primary)' }}>
                            {leave.reviewer_comment}
                          </div>
                        ) : (
                          <div style={{ color: 'var(--alis-text-light)', fontStyle: 'italic' }}>Pending authority review.</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px', color: 'var(--alis-text-muted)' }}>
                 <FileText size={40} style={{ opacity: 0.2, marginBottom: '16px', margin: '0 auto' }} />
                 <p style={{ fontSize: '14px', fontWeight: 500 }}>No historical leave records found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveHistory;
