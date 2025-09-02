import React, { useState } from "react";
import { Button, Input, Label, Form, FormField } from "@hikai/ui";
import type { SignInFormData } from "../hooks/use-auth";
import { useTranslation } from "react-i18next";

interface SignInFormProps {
	onSubmit: (_formData: SignInFormData) => void;
	isLoading?: boolean;
	error?: string;
}

export function SignInForm({
	onSubmit,
	isLoading = false,
	error,
}: SignInFormProps) {
	const [formData, setFormData] = useState<SignInFormData>({
		email: "",
		password: "",
	});

	const { t } = useTranslation("auth");

	const [errors, setErrors] = useState<Partial<SignInFormData>>({});

	const validateForm = (): boolean => {
		const newErrors: Partial<SignInFormData> = {};

		if (!formData.email) {
			newErrors.email = t("signin.emailRequired");
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
			newErrors.email = t("signin.emailInvalid");
		}

		if (!formData.password) {
			newErrors.password = t("signin.passwordRequired");
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (validateForm()) {
			onSubmit(formData);
		}
	};

	const handleInputChange =
		(field: keyof SignInFormData) =>
		(e: React.ChangeEvent<HTMLInputElement>) => {
			setFormData((prev) => ({ ...prev, [field]: e.target.value }));
			// Clear error when user starts typing
			if (errors[field]) {
				setErrors((prev) => ({ ...prev, [field]: undefined }));
			}
		};

	return (
		<Form onSubmit={handleSubmit}>
			{error && (
				<div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
					{error}
				</div>
			)}

			<FormField error={errors.email}>
				<Label htmlFor="signin-email">Email</Label>
				<Input
					id="signin-email"
					type="email"
					placeholder={t("signin.emailPlaceholder")}
					value={formData.email}
					onChange={handleInputChange("email")}
					disabled={isLoading}
				/>
			</FormField>

			<FormField error={errors.password}>
				<Label htmlFor="signin-password">Password</Label>
				<Input
					id="signin-password"
					type="password"
					placeholder={t("signin.passwordPlaceholder")}
					value={formData.password}
					onChange={handleInputChange("password")}
					disabled={isLoading}
				/>
			</FormField>

			<Button type="submit" className="w-full" disabled={isLoading}>
				{isLoading ? t("signin.loginButtonLoading") : t("signin.loginButton")}
			</Button>
		</Form>
	);
}
