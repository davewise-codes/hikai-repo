import { useStore } from "@/store";
import { useAuthActions, useAuthToken } from "@convex-dev/auth/react";
// import { useQuery } from "convex/react";
// import { api } from "@hikai/convex";

// Helper function to map Convex auth errors to translation keys
function getAuthErrorKey(error: unknown): string {
	const errorMessage =
		error instanceof Error
			? error.message.toLowerCase()
			: String(error).toLowerCase();

	// Map common Convex Auth error patterns to translation keys
	if (errorMessage.includes("invalidaccountid")) {
		return "errors.invalidaccountid";
	}
	if (
		errorMessage.includes("user not found") ||
		errorMessage.includes("no user found")
	) {
		return "errors.userNotFound";
	}
	if (
		errorMessage.includes("user already exists") ||
		errorMessage.includes("account already exists")
	) {
		return "errors.accountExists";
	}
	if (errorMessage.includes("invalidsecret")) {
		return "errors.invalidSecret";
	}
	if (errorMessage.includes("could not verify code") || errorMessage.includes("invalid code")) {
		return "errors.invalidResetCode";
	}
	if (errorMessage.includes("network") || errorMessage.includes("connection")) {
		return "errors.networkError";
	}

	// Default error keys based on context
	return "errors.genericError";
}

// Form data types - definidos aquí con el hook que los usa
export interface SignInFormData {
	email: string;
	password: string;
}

export interface SignUpFormData {
	email: string;
	password: string;
	confirmPassword: string;
}

export interface VerificationCodeFormData {
	code: string;
	email: string;
}

export interface PasswordResetRequestData {
	email: string;
}

export interface PasswordResetFormData {
	email: string;
	code: string;
	password: string;
	confirmPassword: string;
}

export function useAuth() {
	// Convex Auth hooks - estas son las únicas responsabilidades del cliente
	const { signIn: convexSignIn, signOut: convexSignOut } = useAuthActions();
	const token = useAuthToken();

	// Token-based authentication state

	// Query de servidor para obtener usuario actual
	//const user = useQuery(api.users.userList);
	// const userList = useQuery(api.users.userList);
	// console.log("userList: ", userList);

	// Estado de loading local para operaciones async
	const isLoading = useStore((state) => state.isLoading);
	const setLoading = useStore((state) => state.setLoading);

	// Determinar estado de autenticación basado en token de Convex
	// undefined = loading, null = not authenticated, string = authenticated
	const isAuthenticated = !!token;
	const isTokenLoading = token === undefined;

	const signIn = async (data: SignInFormData) => {
		setLoading(true);
		try {
			const result = await convexSignIn("password", {
				email: data.email,
				password: data.password,
				flow: "signIn",
			});

			// Check if sign in was successful
			if (!result?.signingIn) {
				// Sign in failed, throw error with translation key
				const errorKey = "errors.invalidCredentials";
				const translationError = new Error(errorKey);
				translationError.name = "AuthTranslationError";
				throw translationError;
			}
			// Convex automáticamente actualizará useQuery cuando cambie el token
		} catch (error) {
			// If already an AuthTranslationError, re-throw
			if (error instanceof Error && error.name === "AuthTranslationError") {
				throw error;
			}
			// For other errors, map them
			const errorKey = getAuthErrorKey(error);
			const translationError = new Error(errorKey);
			translationError.name = "AuthTranslationError";
			throw translationError;
		} finally {
			setLoading(false);
		}
	};

	const signUp = async (data: SignUpFormData) => {
		setLoading(true);
		try {
			const result = await convexSignIn("password", {
				email: data.email,
				password: data.password,
				flow: "signUp",
			});

			// Return verification status - if not immediately signed in, verification is needed
			const needsVerification = !result?.signingIn;
			return { needsVerification, email: data.email };
		} catch (error) {
			// For other errors, map them
			const errorKey = getAuthErrorKey(error);
			const translationError = new Error(errorKey);
			translationError.name = "AuthTranslationError";
			throw translationError;
		} finally {
			setLoading(false);
		}
	};

	const verifyCode = async (data: VerificationCodeFormData) => {
		setLoading(true);
		try {
			const result = await convexSignIn("password", {
				email: data.email,
				code: data.code,
				flow: "email-verification",
			});

			// Check if verification was successful
			if (!result?.signingIn) {
				const errorKey = "errors.invalidVerificationCode";
				const translationError = new Error(errorKey);
				translationError.name = "AuthTranslationError";
				throw translationError;
			}
			// Convex automáticamente actualizará useQuery cuando cambie el token
			return { success: true };
		} catch (error) {
			// If already an AuthTranslationError, re-throw
			if (error instanceof Error && error.name === "AuthTranslationError") {
				throw error;
			}
			// For other errors, map them
			const errorKey = getAuthErrorKey(error);
			const translationError = new Error(errorKey);
			translationError.name = "AuthTranslationError";
			throw translationError;
		} finally {
			setLoading(false);
		}
	};

	const resendVerificationCode = async (email: string) => {
		setLoading(true);
		try {
			// Re-trigger the verification process by attempting sign in again
			await convexSignIn("password", {
				email,
				flow: "signIn", // This will trigger verification if account exists but isn't verified
			});
			return { success: true };
		} catch (error) {
			// For other errors, map them
			const errorKey = getAuthErrorKey(error);
			const translationError = new Error(errorKey);
			translationError.name = "AuthTranslationError";
			throw translationError;
		} finally {
			setLoading(false);
		}
	};

	const signInWithOAuth = async (provider: 'github' | 'google') => {
		setLoading(true);
		try {
			await convexSignIn(provider);
			// OAuth will redirect, so no need to handle response here
		} catch (error) {
			// For OAuth errors, map them to translation keys
			const errorKey = getAuthErrorKey(error);
			const translationError = new Error(errorKey);
			translationError.name = "AuthTranslationError";
			throw translationError;
		} finally {
			setLoading(false);
		}
	};

	const requestPasswordReset = async (data: PasswordResetRequestData) => {
		setLoading(true);
		try {
			await convexSignIn("password", {
				email: data.email,
				flow: "reset",
			});

			return { success: true };
		} catch (error) {
			const errorKey = getAuthErrorKey(error);
			const translationError = new Error(errorKey);
			translationError.name = "AuthTranslationError";
			throw translationError;
		} finally {
			setLoading(false);
		}
	};

	const resetPassword = async (data: PasswordResetFormData) => {
		setLoading(true);
		try {
			const result = await convexSignIn("password", {
				email: data.email,
				code: data.code,
				newPassword: data.password,
				flow: "reset-verification",
			});

			// Check if password reset was successful
			if (!result?.signingIn) {
				const errorKey = "errors.invalidResetCode";
				const translationError = new Error(errorKey);
				translationError.name = "AuthTranslationError";
				throw translationError;
			}

			return { success: true };
		} catch (error) {
			if (error instanceof Error && error.name === "AuthTranslationError") {
				throw error;
			}
			const errorKey = getAuthErrorKey(error);
			const translationError = new Error(errorKey);
			translationError.name = "AuthTranslationError";
			throw translationError;
		} finally {
			setLoading(false);
		}
	};

	const signOut = async () => {
		setLoading(true);
		try {
			await convexSignOut();
			// Convex automáticamente actualizará useQuery cuando el token sea null
		} finally {
			setLoading(false);
		}
	};

	// Por ahora devolvemos un usuario simple basado en el token para no romper el flujo
	const user = token
		? {
				_id: "token-user",
				email: "authenticated@user.com", // Placeholder
				name: "Authenticated User",
			}
		: null;

	return {
		user,
		isAuthenticated,
		isLoading: isLoading || isTokenLoading, // Combinar loading states
		signIn,
		signUp,
		signInWithOAuth,
		verifyCode,
		resendVerificationCode,
		requestPasswordReset,
		resetPassword,
		signOut,
	};
}
