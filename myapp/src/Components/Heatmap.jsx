import React, { useMemo } from 'react';
import { Calendar } from 'lucide-react';

const Heatmap = ({ data = [], title = "Leave Heatmap", subtitle = "" }) => {
  const processedData = useMemo(() => {
    if (!data.length) return [];
    return data.map(d => ({
      date: new Date(d.date),
      count: d.count || 0,
      dateString: typeof d.date === 'string' ? d.date.split('T')[0] : d.date instanceof Date ? d.date.toISOString().split('T')[0] : 'Unknown'
    }));
  }, [data]);

  const getColor = (count) => {
    if (count === 0) return 'var(--alis-bg)'; // empty
    if (count <= 1) return 'rgba(16, 185, 129, 0.3)'; // low (success)
    if (count <= 3) return 'rgba(245, 158, 11, 0.4)'; // medium (warning)
    if (count <= 5) return 'rgba(245, 158, 11, 0.8)'; // high (warning)
    return 'rgba(239, 68, 68, 0.8)'; // very high (danger)
  };

  const getBorderColor = (count) => {
    if (count === 0) return 'var(--alis-border)';
    if (count <= 1) return 'rgba(16, 185, 129, 0.5)';
    if (count <= 3) return 'rgba(245, 158, 11, 0.6)';
    if (count <= 5) return 'var(--alis-warning)';
    return 'var(--alis-danger)';
  };

  // Setup grid: assume data is last ~30 days
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const cells = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    
    // Find matching data point
    const point = processedData.find(p => p.dateString === dateStr);
    cells.push({
      date: d,
      dateStr,
      count: point ? point.count : 0
    });
  }

  // Group into weeks for calendar rendering
  const weeks = [];
  let currentWeek = [];
  let currentStartDay = cells[0]?.date.getDay() || 0;
  
  // Pad beginning of first week
  for (let i = 0; i < currentStartDay; i++) {
    currentWeek.push(null);
  }

  cells.forEach(cell => {
    currentWeek.push(cell);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  const daysLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="erp-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <Calendar size={18} color="var(--alis-primary)" />
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: 600 }}>{title}</h3>
          {subtitle && <p style={{ fontSize: '11px', color: 'var(--alis-text-muted)' }}>{subtitle}</p>}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {/* Days Header */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {daysLabels.map((l, i) => (
            <div key={i} style={{ width: '28px', textAlign: 'center', fontSize: '10px', fontWeight: 600, color: 'var(--alis-text-muted)' }}>
              {l}
            </div>
          ))}
        </div>

        {/* Grid */}
        {weeks.map((week, wIdx) => (
          <div key={wIdx} style={{ display: 'flex', gap: '4px' }}>
            {week.map((cell, cIdx) => {
              if (!cell) return <div key={cIdx} style={{ width: '28px', height: '28px', borderRadius: '4px' }} />;
              return (
                <div 
                  key={cIdx} 
                  title={`${cell.dateStr}: ${cell.count} absence(s)`}
                  style={{ 
                    width: '28px', height: '28px', borderRadius: '6px',
                    background: getColor(cell.count),
                    border: `1px solid ${getBorderColor(cell.count)}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '10px', fontWeight: 600, cursor: 'help',
                    color: cell.count === 0 ? 'var(--alis-text-muted)' : 'var(--alis-text)'
                  }}
                >
                  {cell.date.getDate()}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '12px', marginTop: '16px', fontSize: '10px', color: 'var(--alis-text-muted)', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--alis-bg)', border: '1px solid var(--alis-border)' }}></div> 0</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'rgba(16, 185, 129, 0.3)', border: '1px solid rgba(16, 185, 129, 0.5)' }}></div> 1-2</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'rgba(245, 158, 11, 0.4)', border: '1px solid rgba(245, 158, 11, 0.6)' }}></div> 3-5</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'rgba(239, 68, 68, 0.8)', border: '1px solid var(--alis-danger)' }}></div> 5+</div>
      </div>
    </div>
  );
};

export default Heatmap;
