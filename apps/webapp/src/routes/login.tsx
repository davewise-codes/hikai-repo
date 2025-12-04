import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AuthForm } from "@/domains/auth/components/auth-form";
import { useAuth } from "@/domains/auth/hooks";
import type { SignInFormData } from "@/domains/auth/hooks/use-auth";
import { useTranslation } from "react-i18next";

function LoginPage() {
	const { signIn, isLoading } = useAuth();
	const [error, setError] = useState<string>("");
	const { t } = useTranslation("auth");

	const handleSignIn = async (data: SignInFormData) => {
		try {
			setError("");
			await signIn(data);
			// Navegar explícitamente después de login exitoso
			window.location.href = "/";
		} catch (error) {
			const errorKey =
				error instanceof Error ? error.message : "errors.signInFailed";
			setError(t(errorKey));
		}
	};

	const handleSignUpSuccess = () => {
		// El SignupWithVerification maneja todo el flujo internamente
		// Cuando llegue aquí, el usuario ya está autenticado
		setError("");
		// Usar window.location porque navigate de TanStack Router no funciona aquí
		window.location.href = "/";
	};

	const handleClearError = () => {
		setError("");
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-background">
			<div className="w-full max-w-md">
				<AuthForm
					onSignIn={handleSignIn}
					onSignUpSuccess={handleSignUpSuccess}
					isLoading={isLoading}
					error={error}
					onClearError={handleClearError}
				/>
			</div>
		</div>
	);
}

export const Route = createFileRoute("/login")({
	component: LoginPage,
});
