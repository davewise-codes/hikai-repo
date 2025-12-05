import React, { useState } from 'react';
import { Alert, AlertDescription, Button, Input, Label, Form, FormField, Eye, EyeOff } from '@hikai/ui';
import type { SignUpFormData } from '../hooks/use-auth';
import { useTranslation } from 'react-i18next';
import { isValidEmail, isValidPassword } from '../utils/validation';

export type { SignUpFormData };

interface SignUpFormProps {
   
  onSubmit: (_formData: SignUpFormData) => void;
  isLoading?: boolean;
  error?: string;
}

export function SignUpForm({ onSubmit, isLoading = false, error }: SignUpFormProps) {
  const [formData, setFormData] = useState<SignUpFormData>({
    email: '',
    password: '',
    confirmPassword: '',
  });

  const { t } = useTranslation('auth');

  const [errors, setErrors] = useState<Partial<SignUpFormData>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Partial<SignUpFormData> = {};

    if (!formData.email) {
      newErrors.email = t('signup.emailRequired');
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = t('signup.emailInvalid');
    }

    if (!formData.password) {
      newErrors.password = t('signup.passwordRequired');
    } else if (!isValidPassword(formData.password)) {
      newErrors.password = t('signup.passwordMinLength');
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t('signup.confirmPasswordRequired');
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('signup.passwordsDoNotMatch');
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

  const handleInputChange = (field: keyof SignUpFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <FormField error={errors.email}>
        <Label htmlFor="signup-email">Email</Label>
        <Input
          id="signup-email"
          type="email"
          placeholder={t('signup.emailPlaceholder')}
          value={formData.email}
          onChange={handleInputChange('email')}
          disabled={isLoading}
        />
      </FormField>

      <FormField error={errors.password}>
        <Label htmlFor="signup-password">Password</Label>
        <div className="relative">
          <Input
            id="signup-password"
            type={showPassword ? "text" : "password"}
            placeholder={t('signup.passwordPlaceholder')}
            value={formData.password}
            onChange={handleInputChange('password')}
            disabled={isLoading}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            disabled={isLoading}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </FormField>

      <FormField error={errors.confirmPassword}>
        <Label htmlFor="signup-confirm">Confirm Password</Label>
        <div className="relative">
          <Input
            id="signup-confirm"
            type={showConfirmPassword ? "text" : "password"}
            placeholder={t('signup.confirmPasswordPlaceholder')}
            value={formData.confirmPassword}
            onChange={handleInputChange('confirmPassword')}
            disabled={isLoading}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            disabled={isLoading}
          >
            {showConfirmPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </FormField>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? t('signup.createButtonLoading') : t('signup.createButton')}
      </Button>
    </Form>
  );
}