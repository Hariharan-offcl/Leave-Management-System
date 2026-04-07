import React, { useState } from 'react';
import { Calendar, FileText, Send, Sparkles, AlertCircle, Clock } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const LeaveWizard = ({ onSubmit, leaveTypes, capacityData }) => {
  const { systemRules } = useAppContext();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    leaveType: leaveTypes[0],
    durationType: 'FULL',
    reason: '',
    isEmergency: false
  });

  const nextStep = () => {
    if (step === 1 && (!formData.startDate || !formData.endDate)) return;
    if (step === 2 && !formData.reason) return;
    setStep(prev => prev + 1);
  };

  const prevStep = () => setStep(prev => prev - 1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSubmit(formData);
    setStep(1);
    setFormData({ ...formData, startDate: '', endDate: '', reason: '', isEmergency: false });
  };

  const getDaysAhead = () => {
    if (!formData.startDate) return 0;
    return Math.max(0, Math.floor((new Date(formData.startDate) - new Date()) / (1000 * 60 * 60 * 24)));
  };

  const isEarlyPlanner = getDaysAhead() >= 10;

  return (
    <div style={{ padding: '4px' }}>
      {/* Progress */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '12px', left: 0, right: 0, height: '2px', background: 'var(--alis-border)', zIndex: 0 }} />
        <div style={{ position: 'absolute', top: '12px', left: 0, right: 0, height: '2px', background: 'var(--alis-primary)', zIndex: 0, width: `${(step-1)*50}%`, transition: 'width 0.3s' }} />
        
        {[1, 2, 3].map(num => (
          <div key={num} style={{ 
            width: '26px', height: '26px', borderRadius: '50%', zIndex: 1,
            background: step >= num ? 'var(--alis-primary)' : 'var(--alis-bg-panel)',
            border: `2px solid ${step >= num ? 'var(--alis-primary)' : 'var(--alis-border)'}`,
            color: step >= num ? 'white' : 'var(--alis-text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '11px', fontWeight: 700, transition: 'all 0.3s'
          }}>
            {num}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {step === 1 && (
          <div className="alis-animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--alis-text-muted)' }}>Start Date</label>
                <input required type="date" className="erp-input" 
                  value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} 
                  style={{ marginTop: '6px' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--alis-text-muted)' }}>End Date</label>
                <input required type="date" className="erp-input" min={formData.startDate}
                  value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} 
                  style={{ marginTop: '6px' }} />
              </div>
            </div>

            {formData.startDate && (
               <div style={{ 
                 background: isEarlyPlanner ? 'var(--alis-success-bg)' : 'var(--alis-warning-bg)', 
                 padding: '10px 14px', borderRadius: '8px', display: 'flex', gap: '10px', alignItems: 'center' 
               }}>
                 {isEarlyPlanner ? <Sparkles size={16} color="var(--alis-success)" /> : <Clock size={16} color="var(--alis-warning)" />}
                 <div style={{ fontSize: '12px' }}>
                   {isEarlyPlanner ? 
                     <span style={{ color: 'var(--alis-success)', fontWeight: 600 }}>Excellent! +{systemRules.early_planning_bonus || 10} Early Planner Bonus applies.</span> : 
                     <span style={{ color: 'var(--alis-warning)', fontWeight: 600 }}>Short notice application (under 10 days). Planning ahead boosts your ALIS score.</span>}
                 </div>
               </div>
            )}

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--alis-text-muted)' }}>Leave Type</label>
              <select className="erp-input" value={formData.leaveType} onChange={e => setFormData({...formData, leaveType: e.target.value})} style={{ marginTop: '6px' }}>
                {leaveTypes.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--alis-text-muted)' }}>Duration Format</label>
              <select className="erp-input" value={formData.durationType} onChange={e => setFormData({...formData, durationType: e.target.value})} style={{ marginTop: '6px' }}>
                <option value="FULL">Full Day</option>
                <option value="HALF_AM">Half Day (Morning View)</option>
                <option value="HALF_PM">Half Day (Afternoon View)</option>
              </select>
            </div>

            <button type="button" className="erp-btn erp-btn-primary" onClick={nextStep} 
              disabled={!formData.startDate || !formData.endDate} style={{ marginTop: '8px' }}>
              Next: Details
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="alis-animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--alis-text-muted)' }}>Justification / Reason</label>
              <textarea required className="erp-input" rows={4} 
                value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})}
                placeholder="Please describe the reason for your leave request in detail..."
                style={{ marginTop: '6px', resize: 'none' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', border: '1px solid var(--alis-danger)', borderRadius: '10px', background: 'var(--alis-danger-bg)' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <AlertCircle size={18} color="var(--alis-danger)" />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--alis-danger)' }}>Mark as Emergency</div>
                  <div style={{ fontSize: '11px', color: 'var(--alis-danger)', opacity: 0.8 }}>Bypasses constraints. Use only for critical situations.</div>
                </div>
              </div>
              <label className="erp-switch">
                <input type="checkbox" checked={formData.isEmergency} onChange={e => setFormData({...formData, isEmergency: e.target.checked})} />
                <span className="erp-slider round"></span>
              </label>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button type="button" className="erp-btn erp-btn-outline" onClick={prevStep} style={{ flex: 1 }}>Back</button>
              <button type="button" className="erp-btn erp-btn-primary" onClick={nextStep} disabled={!formData.reason} style={{ flex: 1 }}>Next: Review</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="alis-animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: 'var(--alis-bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--alis-border)' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={14} /> Application Summary
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px' }}>
                <div>
                  <div style={{ color: 'var(--alis-text-muted)', marginBottom: '2px' }}>Type</div>
                  <div style={{ fontWeight: 600 }}>{formData.leaveType} ({formData.durationType})</div>
                </div>
                <div>
                  <div style={{ color: 'var(--alis-text-muted)', marginBottom: '2px' }}>Duration</div>
                  <div style={{ fontWeight: 600 }}>{formData.startDate} → {formData.endDate}</div>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ color: 'var(--alis-text-muted)', marginBottom: '2px' }}>Reason</div>
                  <div style={{ background: 'var(--alis-bg-panel)', padding: '8px', borderRadius: '6px', border: '1px solid var(--alis-border)' }}>{formData.reason}</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button type="button" className="erp-btn erp-btn-outline" onClick={prevStep} style={{ flex: 1 }}>Edit</button>
              <button type="submit" className="erp-btn erp-btn-primary" style={{ flex: 2 }}>
                <Send size={14} /> Submit Application
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default LeaveWizard;
