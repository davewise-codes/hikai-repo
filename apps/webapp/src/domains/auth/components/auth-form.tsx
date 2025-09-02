import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger, Card } from "@hikai/ui";
import { SignInForm } from "./signin-form";
import { SignUpForm } from "./signup-form";
import type { SignInFormData, SignUpFormData } from "../hooks/use-auth";
import { useTranslation } from "react-i18next";

// Form tab type - definido aquí con el componente que lo usa
type AuthFormTab = "signin" | "signup";

interface AuthFormProps {
	onSignIn: (_formData: SignInFormData) => void;
	onSignUp: (_formData: SignUpFormData) => void;
	isLoading?: boolean;
	error?: string;
	defaultTab?: AuthFormTab;
}

export function AuthForm({
	onSignIn,
	onSignUp,
	isLoading = false,
	error,
	defaultTab = "signin",
}: AuthFormProps) {
	const [activeTab, setActiveTab] = useState<AuthFormTab>(defaultTab);
	const { t } = useTranslation('auth');

	return (
		<div className="w-full max-w-md mx-auto">
			<Card className="p-6">
				<div className="text-center mb-6">
					<h1 className="text-2xl font-semibold tracking-tight">
						{t('common.welcomeTitle')}
					</h1>
					<p className="text-muted-foreground mt-2">
						{activeTab === "signin"
							? t('common.signinSubtitle')
							: t('common.signupSubtitle')}
					</p>
				</div>

				<Tabs
					value={activeTab}
					onValueChange={(value) => setActiveTab(value as AuthFormTab)}
				>
					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger value="signin">{t('common.haveAccount')}</TabsTrigger>
						<TabsTrigger value="signup">{t('common.createAccount')}</TabsTrigger>
					</TabsList>

					<TabsContent value="signin" className="mt-4">
						<SignInForm
							onSubmit={onSignIn}
							isLoading={isLoading}
							error={error}
						/>
					</TabsContent>

					<TabsContent value="signup" className="mt-4">
						<SignUpForm
							onSubmit={onSignUp}
							isLoading={isLoading}
							error={error}
						/>
					</TabsContent>
				</Tabs>

				<div className="text-center mt-6 text-sm text-muted-foreground">
					{t('common.termsText')}
				</div>
			</Card>
		</div>
	);
}
