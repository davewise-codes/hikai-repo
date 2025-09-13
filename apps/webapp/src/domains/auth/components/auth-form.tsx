import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger, Card } from "@hikai/ui";
import { SignInForm } from "./signin-form";
import { SignupWithVerification } from "./signup-with-verification";
import { SocialLoginButtons } from "./social-login-buttons";
import type { SignInFormData } from "../hooks/use-auth";
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
	const { t } = useTranslation("auth");

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

				<Tabs
					value={activeTab}
					onValueChange={(value) => {
						setActiveTab(value as AuthFormTab);
						// Clear error when switching tabs
						onClearError?.();
					}}
				>
					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger value="signin">{t("common.haveAccount")}</TabsTrigger>
						<TabsTrigger value="signup">
							{t("common.createAccount")}
						</TabsTrigger>
					</TabsList>

					<TabsContent value="signin" className="mt-4">
						<SignInForm
							onSubmit={onSignIn}
							isLoading={isLoading}
							error={error}
						/>
						<div className="mt-6">
							<SocialLoginButtons
								isLoading={isLoading}
								onClearError={onClearError}
							/>
						</div>
					</TabsContent>

					<TabsContent value="signup" className="mt-4">
						<SignupWithVerification onSuccess={onSignUpSuccess} />
						<div className="mt-6">
							<SocialLoginButtons
								isLoading={isLoading}
								onClearError={onClearError}
							/>
						</div>
					</TabsContent>
				</Tabs>

				<div className="text-center mt-6 text-sm text-muted-foreground">
					{t("common.termsText")}
				</div>
			</Card>
		</div>
	);
}
