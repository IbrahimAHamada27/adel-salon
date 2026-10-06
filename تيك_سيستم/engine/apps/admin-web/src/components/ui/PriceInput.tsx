import React from 'react';

export interface PriceInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  value: number | string;
  onChange: (value: number) => void;
  currencySymbol?: string;
  error?: string;
  required?: boolean;
  helperText?: string;
}

export const PriceInput: React.FC<PriceInputProps> = ({
  label = 'السعر',
  value,
  onChange,
  currencySymbol = 'ج.م',
  error,
  required,
  helperText,
  id,
  ...props
}) => {
  const inputId = id || 'price-input';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    if (rawVal === '') {
      onChange(0);
      return;
    }
    const parsed = parseFloat(rawVal);
    if (!isNaN(parsed) && parsed >= 0) {
      onChange(parsed);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', marginBottom: '14px' }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontSize: '0.9rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          {label}
          {required && <span style={{ color: 'var(--status-danger)' }}>*</span>}
        </label>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          id={inputId}
          type="number"
          min="0"
          step="0.5"
          value={value === 0 ? '' : value}
          onChange={handleChange}
          placeholder="0.00"
          style={{
            width: '100%',
            padding: '10px 48px 10px 14px',
            backgroundColor: 'var(--bg-app)',
            border: error ? '1px solid var(--status-danger)' : '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            fontSize: '1rem',
            fontWeight: 600,
            outline: 'none',
            direction: 'ltr',
            textAlign: 'right',
          }}
          {...props}
        />
        <span
          style={{
            position: 'absolute',
            left: '14px',
            color: 'var(--text-muted)',
            fontSize: '0.9rem',
            fontWeight: 600,
            pointerEvents: 'none',
          }}
        >
          {currencySymbol}
        </span>
      </div>
      {error && (
        <span style={{ fontSize: '0.8rem', color: 'var(--status-danger)', fontWeight: 500 }}>
          {error}
        </span>
      )}
      {!error && helperText && (
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {helperText}
        </span>
      )}
    </div>
  );
};
