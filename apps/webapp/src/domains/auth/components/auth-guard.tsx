import { useEffect, ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "../hooks";

interface AuthGuardProps {
	children: ReactNode;
	fallback?: ReactNode;
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
	const { isAuthenticated, isLoading } = useAuth();
	const navigate = useNavigate();

	useEffect(() => {
		// Debug
		console.log('AuthGuard - isLoading:', isLoading, 'isAuthenticated:', isAuthenticated);
		
		// Redirigir a login si no está autenticado usando navegación del router
		// Solo redirigir cuando no esté cargando Y no esté autenticado
		if (!isLoading && !isAuthenticated) {
			console.log('AuthGuard - Redirecting to login...');
			navigate({ to: '/login' });
		}
	}, [isAuthenticated, isLoading, navigate]);

	// Mostrar loading mientras verifica auth
	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-muted-foreground">Loading...</div>
			</div>
		);
	}

	// Si no está autenticado, mostrar fallback o null
	if (!isAuthenticated) {
		return fallback || null;
	}

	// Si está autenticado, mostrar children
	return <>{children}</>;
}
