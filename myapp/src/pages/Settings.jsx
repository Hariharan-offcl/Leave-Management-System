import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Settings as SettingsIcon, Palette, Cpu, Save, ShieldAlert, Monitor } from 'lucide-react';
import api from '../services/api';

const COLORS = [
  { name: 'Azure Blue (Default)', hex: '#6366f1' },
  { name: 'Emerald Green', hex: '#10b981' },
  { name: 'Royal Purple', hex: '#8b5cf6' },
  { name: 'Slate Monochrome', hex: '#475569' },
  { name: 'Sunset Orange', hex: '#f97316' },
  { name: 'Crimson Red', hex: '#ef4444' }
];

const Settings = () => {
  const { themeColor, setThemeColor, currentUser, density, setDensity, zenMode, setZenMode, emergencyOverride, toggleEmergencyOverride } = useAppContext();
  const [rules, setRules] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchRules = async () => {
      try {
        const res = await api.get('/admin/rules');
        setRules(res.data);
      } catch (err) {
        console.error("Failed to load rules", err);
      }
    };
    if (currentUser?.role === 'PRINCIPAL') {
      fetchRules();
    }
  }, [currentUser]);

  const handleRuleChange = (key, val) => {
    setRules(prev => prev.map(r => r.rule_key === key ? { ...r, rule_value: val } : r));
  };

  const handleSaveRules = async () => {
    setIsSaving(true);
    try {
      await api.patch('/admin/rules', { rules });
      setMessage('System Configuration Saved Successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error(err);
      setMessage('Failed to save configuration.');
    }
    setIsSaving(false);
  };

  return (
    <div className="erp-dashboard-grid">
      <div className="erp-col-12" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700 }}>System Configuration</h1>
          <p style={{ color: 'var(--alis-text-muted)', fontSize: '13px' }}>Customize ALIS interface and intelligence rules</p>
        </div>
      </div>

      <div className="erp-col-6">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
           {/* Branding & UI */}
           <div className="erp-card">
             <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
               <Palette size={18} color="var(--alis-primary)" />
               <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Interface Personalization</h3>
             </div>
             
             <p style={{ fontSize: '13px', color: 'var(--alis-text-muted)', marginBottom: '12px' }}>Institutional Color Palette</p>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '24px' }}>
               {COLORS.map(c => (
                  <div 
                    key={c.hex} 
                    onClick={() => setThemeColor(c.hex)}
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', 
                      border: `2px solid ${themeColor === c.hex ? c.hex : 'var(--alis-border)'}`,
                      backgroundColor: themeColor === c.hex ? c.hex + '1a' : 'transparent',
                      cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                     <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: c.hex }} />
                     <span style={{ fontSize: '12px', fontWeight: themeColor === c.hex ? 600 : 400 }}>{c.name}</span>
                  </div>
               ))}
             </div>

             <p style={{ fontSize: '13px', color: 'var(--alis-text-muted)', marginBottom: '12px' }}>Information Density</p>
             <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                <button 
                  className={`erp-btn ${density === 'comfortable' ? 'erp-btn-primary' : 'erp-btn-outline'}`} 
                  onClick={() => setDensity('comfortable')} style={{ flex: 1 }}
                >Comfortable</button>
                <button 
                  className={`erp-btn ${density === 'compact' ? 'erp-btn-primary' : 'erp-btn-outline'}`} 
                  onClick={() => setDensity('compact')} style={{ flex: 1 }}
                >Compact</button>
             </div>

             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--alis-bg)', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                   <Monitor size={16} color="var(--alis-primary)" />
                   <div>
                     <div style={{ fontSize: '13px', fontWeight: 600 }}>Zen Mode</div>
                     <div style={{ fontSize: '11px', color: 'var(--alis-text-muted)' }}>Collapse sidebar for focused view</div>
                   </div>
                </div>
                <label className="erp-switch">
                   <input type="checkbox" checked={zenMode} onChange={e => setZenMode(e.target.checked)} />
                   <span className="erp-slider round"></span>
                </label>
             </div>
           </div>

           {/* Emergency Global Toggle */}
           {currentUser?.role === 'PRINCIPAL' && (
             <div className="erp-card" style={{ border: emergencyOverride ? '2px solid var(--alis-danger)' : '1px solid var(--alis-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <ShieldAlert size={20} color={emergencyOverride ? 'var(--alis-danger)' : 'var(--alis-text-muted)'} />
                      <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Emergency Override</h3>
                   </div>
                   <label className="erp-switch">
                      <input type="checkbox" checked={emergencyOverride} onChange={e => toggleEmergencyOverride(e.target.checked)} />
                      <span className="erp-slider round"></span>
                   </label>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--alis-text-muted)', marginTop: '12px', lineHeight: '1.5' }}>
                   When enabled, the ALIS Intelligence Engine is bypassed. All leave requests receive maximum priority and bypass auto-rejections. Use only during institutional crises or closures.
                </p>
             </div>
           )}
        </div>
      </div>

      {/* Backend Engine Rules */}
      {currentUser?.role === 'PRINCIPAL' && (
        <div className="erp-col-6">
          <div className="erp-card" style={{ height: '100%' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Cpu size={18} color="var(--alis-primary)" />
                  <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Intelligence Engine Rules</h3>
                </div>
                {message && <span style={{ fontSize: '12px', color: 'var(--alis-success)', fontWeight: 600 }}>{message}</span>}
             </div>

             <div style={{ background: 'var(--alis-warning-bg)', color: 'var(--alis-warning)', padding: '12px 16px', borderRadius: '10px', display: 'flex', gap: '10px', marginBottom: '24px' }}>
                <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <p style={{ fontSize: '12px', lineHeight: '1.5' }}>Warning: Adjusting these parameters instantly alters priority scoring and risk assessment across all future applications for all departments.</p>
             </div>

             <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {rules.map(rule => (
                   <div key={rule.rule_key} className="erp-form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, textTransform: 'capitalize' }}>
                         {rule.rule_key.replace(/_/g, ' ')}
                      </label>
                      <input 
                        type="number" step="0.1" className="erp-input" 
                        value={rule.rule_value} 
                        onChange={e => handleRuleChange(rule.rule_key, parseFloat(e.target.value))}
                        style={{ marginTop: '6px' }}
                      />
                      <p style={{ fontSize: '11px', color: 'var(--alis-text-muted)', marginTop: '4px' }}>{rule.description}</p>
                   </div>
                ))}
             </div>

             <button className="erp-btn erp-btn-primary" style={{ width: '100%', marginTop: '24px', padding: '12px' }} disabled={isSaving} onClick={handleSaveRules}>
               <Save size={14} /> Save Intelligence Configuration
             </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
