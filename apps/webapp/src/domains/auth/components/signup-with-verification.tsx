import React, { useState } from 'react';
import { SignUpForm } from './signup-form';
import { VerificationCodeForm } from './verification-code-form';
import type { SignUpFormData, VerificationCodeFormData } from '../hooks/use-auth';
import { useAuth } from '../hooks/use-auth';
import { useTranslation } from 'react-i18next';

type SignupStep = 'signup' | 'verification';

interface SignupWithVerificationProps {
  onSuccess?: () => void;
}

export function SignupWithVerification({ onSuccess }: SignupWithVerificationProps) {
  const [step, setStep] = useState<SignupStep>('signup');
  const [email, setEmail] = useState<string>('');
  const [error, setError] = useState<string>();
  
  const { signUp, verifyCode, resendVerificationCode, isLoading } = useAuth();
  const { t } = useTranslation('auth');

  const handleSignUp = async (data: SignUpFormData) => {
    setError(undefined);
    
    try {
      const result = await signUp(data);
      
      if (result.needsVerification) {
        setEmail(data.email);
        setStep('verification');
      } else {
        // User was signed in immediately (shouldn't happen with verification enabled)
        onSuccess?.();
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AuthTranslationError') {
        setError(t(error.message));
      } else {
        setError(t('errors.signUpFailed'));
      }
    }
  };

  const handleVerifyCode = async (data: VerificationCodeFormData) => {
    setError(undefined);
    
    try {
      await verifyCode(data);
      onSuccess?.();
    } catch (error) {
      if (error instanceof Error && error.name === 'AuthTranslationError') {
        setError(t(error.message));
      } else {
        setError(t('errors.verificationFailed'));
      }
    }
  };

  const handleResendCode = async () => {
    setError(undefined);
    
    try {
      await resendVerificationCode(email);
      // Could show a success message that code was resent
    } catch (error) {
      if (error instanceof Error && error.name === 'AuthTranslationError') {
        setError(t(error.message));
      } else {
        setError(t('errors.genericError'));
      }
    }
  };

  const handleCancel = () => {
    setStep('signup');
    setEmail('');
    setError(undefined);
  };

  if (step === 'verification') {
    return (
      <VerificationCodeForm
        email={email}
        onSubmit={handleVerifyCode}
        onResendCode={handleResendCode}
        onCancel={handleCancel}
        isLoading={isLoading}
        error={error}
      />
    );
  }

  return (
    <SignUpForm
      onSubmit={handleSignUp}
      isLoading={isLoading}
      error={error}
    />
  );
}