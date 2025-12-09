import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger, Card } from "@hikai/ui";
import { SignInForm } from "./signin-form";
import { SignupWithVerification } from "./signup-with-verification";
import { SocialLoginButtons } from "./social-login-buttons";
import { PasswordResetFlow } from "./password-reset-flow";
import type {
	SignInFormData,
	PasswordResetRequestData,
} from "../hooks/use-auth";
import { useAuth } from "../hooks/use-auth";
import { useTranslation } from "react-i18next";

// Form tab type - definido aquí con el componente que lo usa
type AuthFormTab = "signin" | "signup";

interface AuthFormProps {
	onSignIn: (_formData: SignInFormData) => void;
	onSignUpSuccess: () => void;
	isLoading?: boolean;
	error?: string;
	defaultTab?: AuthFormTab;
	onClearError?: () => void;
}

export function AuthForm({
	onSignIn,
	onSignUpSuccess,
	isLoading = false,
	error,
	defaultTab = "signin",
	onClearError,
}: AuthFormProps) {
	const [activeTab, setActiveTab] = useState<AuthFormTab>(defaultTab);
	const [showPasswordReset, setShowPasswordReset] = useState(false);
	const [resetError, setResetError] = useState<string>();
	const {
		requestPasswordReset,
		resetPassword,
		isLoading: authLoading,
	} = useAuth();
	const { t } = useTranslation("auth");

	const handleForgotPassword = () => {
		setShowPasswordReset(true);
		onClearError?.();
	};

	const handlePasswordResetRequest = async (data: PasswordResetRequestData) => {
		try {
			setResetError(undefined);
			return await requestPasswordReset(data);
		} catch (error) {
			const message =
				error instanceof Error && error.name === "AuthTranslationError"
					? t(error.message)
					: t("errors.genericError");
			setResetError(message);
			throw error;
		}
	};

	const handleVerifyResetCode = async (data: {
		email: string;
		code: string;
	}) => {
		try {
			setResetError(undefined);
			// For the UI flow, we just validate the code format locally
			// The actual verification happens when we reset the password
			if (!data.code || data.code.length !== 8 || !/^\d{8}$/.test(data.code)) {
				const errorKey = "verification.codeInvalid";
				const translationError = new Error(errorKey);
				translationError.name = "AuthTranslationError";
				throw translationError;
			}
			return { success: true };
		} catch (error) {
			const message =
				error instanceof Error && error.name === "AuthTranslationError"
					? t(error.message)
					: t("errors.genericError");
			setResetError(message);
			throw error;
		}
	};

	const handlePasswordReset = async (data: {
		email: string;
		code: string;
		password: string;
	}) => {
		try {
			setResetError(undefined);
			return await resetPassword({
				email: data.email,
				code: data.code,
				password: data.password,
				confirmPassword: data.password, // This is handled in the component
			});
		} catch (error) {
			const message =
				error instanceof Error && error.name === "AuthTranslationError"
					? t(error.message)
					: t("errors.genericError");
			setResetError(message);
			throw error;
		}
	};

	const handlePasswordResetSuccess = () => {
		setShowPasswordReset(false);
		setResetError(undefined);
		// Switch to signin tab after successful reset
		setActiveTab("signin");
	};

	const handlePasswordResetCancel = () => {
		setShowPasswordReset(false);
		setResetError(undefined);
	};

	return (
		<div className="w-full max-w-md mx-auto">
			<Card className="p-6">
				<div className="text-center mb-6">
					<h1 className="text-2xl font-semibold tracking-tight">
						{t("common.welcomeTitle")}
					</h1>
					<p className="text-muted-foreground mt-2">
						{activeTab === "signin"
							? t("common.signinSubtitle")
							: t("common.signupSubtitle")}
					</p>
				</div>

				{showPasswordReset ? (
					<div className="min-h-[320px] transition-all duration-300 ease-in-out">
						<PasswordResetFlow
							onRequestReset={handlePasswordResetRequest}
							onVerifyCode={handleVerifyResetCode}
							onResetPassword={handlePasswordReset}
							onCancel={handlePasswordResetCancel}
							onSuccess={handlePasswordResetSuccess}
							isLoading={authLoading}
							error={resetError}
						/>
					</div>
				) : (
					<Tabs
						value={activeTab}
						onValueChange={(value) => {
							setActiveTab(value as AuthFormTab);
							// Clear error when switching tabs
							onClearError?.();
						}}
					>
						<TabsList className="grid w-full grid-cols-2">
							<TabsTrigger value="signin">
								{t("common.haveAccount")}
							</TabsTrigger>
							<TabsTrigger value="signup">
								{t("common.createAccount")}
							</TabsTrigger>
						</TabsList>

						{/* Fixed height container to prevent visual jumps */}
						<div className="min-h-[320px] transition-all duration-300 ease-in-out relative">
							<TabsContent value="signin" className="mt-4">
								<SignInForm
									onSubmit={onSignIn}
									onForgotPassword={handleForgotPassword}
									isLoading={isLoading}
									error={error}
								/>
							</TabsContent>

							<TabsContent value="signup" className="mt-4">
								<SignupWithVerification onSuccess={onSignUpSuccess} />
							</TabsContent>
						</div>
					</Tabs>
				)}

				{/* Social login buttons - unified outside of tabs */}
				<div>
					<SocialLoginButtons
						isLoading={isLoading}
						onClearError={onClearError}
					/>
				</div>

				<div className="text-center mt-6 text-fontSize-sm text-muted-foreground">
					{t("common.termsText")}
				</div>
			</Card>
		</div>
	);
}
