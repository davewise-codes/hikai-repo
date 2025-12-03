// Validadores reutilizables para autenticación

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const VERIFICATION_CODE_REGEX = /^\d{8}$/;
export const MIN_PASSWORD_LENGTH = 6;

export function isValidEmail(email: string): boolean {
	return EMAIL_REGEX.test(email);
}

export function isValidVerificationCode(code: string): boolean {
	return code.length === 8 && VERIFICATION_CODE_REGEX.test(code);
}

export function formatVerificationCode(value: string): string {
	return value.replace(/(\d{4})(\d{4})/, "$1 $2");
}

export function sanitizeCodeInput(value: string): string {
	return value.replace(/\D/g, "").slice(0, 8);
}

export function isValidPassword(password: string): boolean {
	return password.length >= MIN_PASSWORD_LENGTH;
}
