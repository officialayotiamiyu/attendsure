import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface BaseProps {
  label: string;
  error?: string;
  hint?: string;
}

export function InputField({ label, error, hint, className = '', ...props }: BaseProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input className={`input ${error ? 'input-error' : ''} ${className}`.trim()} {...props} />
      {hint ? <span className="field-hint">{hint}</span> : null}
      {error ? <span className="field-error">{error}</span> : null}
    </label>
  );
}

export function SelectField({ label, error, children, className = '', ...props }: BaseProps & InputHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <select className={`input ${error ? 'input-error' : ''} ${className}`.trim()} {...props}>
        {children}
      </select>
      {error ? <span className="field-error">{error}</span> : null}
    </label>
  );
}

export function TextAreaField({ label, error, className = '', ...props }: BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <textarea className={`input textarea ${error ? 'input-error' : ''} ${className}`.trim()} {...props} />
      {error ? <span className="field-error">{error}</span> : null}
    </label>
  );
}
