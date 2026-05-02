export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: 'Too short' | 'Weak' | 'Fair' | 'Strong' | 'Very strong';
  color: string;
  checks: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
}

export function checkPasswordStrength(password: string): PasswordStrength {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
  const passed = Object.values(checks).filter(Boolean).length;

  if (!checks.length) return { score: 0, label: 'Too short',    color: 'bg-red-500',    checks };
  if (passed <= 2)     return { score: 1, label: 'Weak',         color: 'bg-red-400',    checks };
  if (passed === 3)    return { score: 2, label: 'Fair',         color: 'bg-yellow-400', checks };
  if (passed === 4)    return { score: 3, label: 'Strong',       color: 'bg-green-400',  checks };
                       return { score: 4, label: 'Very strong',  color: 'bg-green-600',  checks };
}
