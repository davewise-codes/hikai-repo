import {
	createFileRoute,
	useNavigate,
	useLocation,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthForm } from "@/domains/auth/components/auth-form";
import { useAuth } from "@/domains/auth/hooks";
import type { SignInFormData } from "@/domains/auth/hooks/use-auth";
import { useTranslation } from "react-i18next";

function LoginPage() {
	const { signIn, isAuthenticated, isLoading } = useAuth();
	const navigate = useNavigate();
	const [error, setError] = useState<string>("");
	const { t } = useTranslation("auth");


	// Redirigir si ya está autenticado
	useEffect(() => {
		if (isAuthenticated && !isLoading) {
			navigate({ to: "/", replace: true });
		}
	}, [isAuthenticated, isLoading, navigate]);

	const handleSignIn = async (data: SignInFormData) => {
		try {
			setError("");
			await signIn(data);
			// La redirección se maneja en el useEffect de arriba
		} catch (error) {
			const errorKey =
				error instanceof Error ? error.message : "errors.signInFailed";
			setError(t(errorKey));
		}
	};

	const handleSignUpSuccess = () => {
		// El SignupWithVerification maneja todo el flujo internamente
		// Cuando llegue aquí, el usuario ya está autenticado
		// La redirección se maneja en el useEffect de arriba
		setError("");
	};

	const handleClearError = () => {
		setError("");
	};

	// No renderizar si ya está autenticado (evita flickering)
	if (isAuthenticated && !isLoading) {
		return null;
	}

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
