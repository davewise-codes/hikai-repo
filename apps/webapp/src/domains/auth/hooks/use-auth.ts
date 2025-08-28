import { useStore } from "@/store";
import { useAuthActions, useAuthToken } from "@convex-dev/auth/react";
// import { useQuery } from "convex/react";
// import { api } from "@convex/_generated/api";

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

export function useAuth() {
	// Convex Auth hooks - estas son las únicas responsabilidades del cliente
	const { signIn: convexSignIn, signOut: convexSignOut } = useAuthActions();
	const token = useAuthToken();
	
	// Debug más específico
	console.log('useAuth - token:', token, 'isAuthenticated:', !!token, 'isTokenLoading:', token === undefined);

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
			await convexSignIn("password", {
				email: data.email,
				password: data.password,
				flow: "signIn",
			});
			// Convex automáticamente actualizará useQuery cuando cambie el token
		} catch (error) {
			console.error("SignIn error:", error);
			throw error;
		} finally {
			setLoading(false);
		}
	};

	const signUp = async (data: SignUpFormData) => {
		setLoading(true);
		try {
			await convexSignIn("password", {
				email: data.email,
				password: data.password,
				flow: "signUp",
			});
			// Convex automáticamente actualizará useQuery cuando cambie el token
		} catch (error) {
			console.error("SignUp error:", error);
			throw error;
		} finally {
			setLoading(false);
		}
	};

	const signOut = async () => {
		setLoading(true);
		try {
			await convexSignOut();
			// Convex automáticamente actualizará useQuery cuando el token sea null
		} catch (error) {
			console.error("SignOut error:", error);
			throw error;
		} finally {
			setLoading(false);
		}
	};

	// Por ahora devolvemos un usuario simple basado en el token para no romper el flujo
	const user = token ? { 
		_id: 'token-user',
		email: 'authenticated@user.com', // Placeholder
		name: 'Authenticated User'
	} : null;

	return {
		user,
		isAuthenticated,
		isLoading: isLoading || isTokenLoading, // Combinar loading states
		signIn,
		signUp,
		signOut,
	};
}
