import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  fullWidth?: boolean;
}

export function Button({ variant = 'primary', fullWidth = false, className = '', ...props }: ButtonProps) {
  return <button className={`btn btn-${variant} ${fullWidth ? 'btn-block' : ''} ${className}`.trim()} {...props} />;
}
