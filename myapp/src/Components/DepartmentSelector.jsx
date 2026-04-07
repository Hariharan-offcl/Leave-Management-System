import React from 'react';
import { useAppContext } from '../context/AppContext';

const DepartmentSelector = ({ value, onChange, showAll = false, disabled = false }) => {
  const { departments } = useAppContext();

  return (
    <select
      className="erp-input"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    >
      {showAll && <option value="">All Departments</option>}
      {!showAll && <option value="">Select Department</option>}
      {departments.map(dept => (
        <option key={dept.id} value={dept.id}>{dept.name}</option>
      ))}
    </select>
  );
};

export default DepartmentSelector;
