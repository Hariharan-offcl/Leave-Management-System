import React from 'react';
import { Award } from 'lucide-react';

const BadgeDisplay = ({ badges = [], compact = false }) => {
  if (badges.length === 0 && !compact) {
    return (
      <div className="erp-card" style={{ textAlign: 'center', padding: '24px' }}>
        <Award size={32} style={{ opacity: 0.2, margin: '0 auto 12px' }} />
        <p style={{ fontSize: '13px', color: 'var(--alis-text-muted)' }}>
          No badges earned yet. Keep up your leave discipline!
        </p>
      </div>
    );
  }

  if (compact) {
    return (
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {badges.map((b, i) => (
          <span key={i} title={b.description || b.badge_name} style={{
            fontSize: '18px', cursor: 'help',
            animation: 'fadeIn 0.3s ease-out forwards',
            animationDelay: `${i * 100}ms`
          }}>
            {b.badge_name?.split(' ')[0] || '🏅'}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="erp-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <Award size={18} color="var(--alis-accent)" />
        <h3 style={{ fontSize: '14px', fontWeight: 600 }}>Achievement Badges</h3>
        <span style={{
          marginLeft: 'auto', fontSize: '11px', fontWeight: 600,
          color: 'var(--alis-accent)', background: 'var(--alis-accent-bg)',
          padding: '2px 8px', borderRadius: '9999px'
        }}>
          {badges.length} earned
        </span>
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {badges.map((badge, i) => (
          <div key={i} className="alis-badge-earned" style={{
            animationDelay: `${i * 100}ms`
          }}>
            <span className="badge-icon">{badge.badge_name?.split(' ')[0] || '🏅'}</span>
            <span className="badge-label">{badge.badge_name?.split(' ').slice(1).join(' ') || badge.badge_type}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BadgeDisplay;
