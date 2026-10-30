export type PasswordStrength = "Weak" | "Medium" | "Strong";

export default function checkPasswordStrength(password: string): PasswordStrength {
  if (password.length < 6) return "Weak";
  const hasLetters = /[A-Za-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSymbols = /[^A-Za-z0-9]/.test(password);

  if (hasLetters && hasNumbers && hasSymbols) return "Strong";
  if (hasLetters && hasNumbers) return "Medium";
  return "Weak";
}