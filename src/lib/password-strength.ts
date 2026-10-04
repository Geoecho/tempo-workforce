export function passwordStrength(password: string) {
  const length = password.length;
  const common = /^(password|qwerty|letmein|welcome|admin|123456|abcdef)/i.test(password) || /^(.)\1+$/.test(password);
  const variety = Number(/[a-z]/.test(password)) + Number(/[A-Z]/.test(password)) + Number(/\d/.test(password)) + Number(/[^a-zA-Z\d]/.test(password));
  const score = !length ? 0 : length < 8 || common ? 1 : length >= 16 || (length >= 12 && variety >= 3) ? 4 : length >= 12 || variety >= 3 ? 3 : 2;
  return {
    score,
    label: ['Password strength', 'Weak', 'Fair', 'Good', 'Strong'][score],
    hint: !length ? 'Try a memorable phrase with 12 or more characters.' : length < 8 ? `${8 - length} more characters to meet the minimum.` : common ? 'Avoid common passwords and repeated characters.' : score < 4 ? 'Make it longer, or mix letters, numbers and symbols.' : 'A good start. Use a password unique to Tempo.',
  };
}
