import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { AuthForm } from '@/domains/auth/components/auth-form';
import { useAuth } from '@/domains/auth/hooks';
import type { SignInFormData, SignUpFormData } from '@/domains/auth/hooks/use-auth';
import { useTranslation } from 'react-i18next';

function LoginPage() {
  const { signIn, signUp, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string>('');
  const { t } = useTranslation('auth');

  // Redirigir si ya está autenticado usando navegación del router
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      // Pequeño delay para asegurar que el token se propague completamente
      setTimeout(() => {
        navigate({ to: '/' });
      }, 100);
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleSignIn = async (data: SignInFormData) => {
    try {
      setError('');
      await signIn(data);
      // La redirección se maneja en el useEffect de arriba
    } catch (error) {
      const errorKey = error instanceof Error ? error.message : 'errors.signInFailed';
      setError(t(errorKey));
    }
  };

  const handleSignUpSuccess = () => {
    // El SignupWithVerification maneja todo el flujo internamente
    // Cuando llegue aquí, el usuario ya está autenticado
    // La redirección se maneja en el useEffect de arriba
    setError('');
  };

  const handleClearError = () => {
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md">
        {isAuthenticated ? (
          <div className="p-6 bg-green-100 rounded">
            <h2 className="text-xl font-semibold text-green-800">🎉 Successfully Authenticated!</h2>
            <p className="mt-2 text-green-700">Welcome! Authentication successful.</p>
            <p className="mt-2 text-sm text-green-600">
              Redirecting to home page...
            </p>
          </div>
        ) : (
          <AuthForm
            onSignIn={handleSignIn}
            onSignUpSuccess={handleSignUpSuccess}
            isLoading={isLoading}
            error={error}
            onClearError={handleClearError}
          />
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute('/login')({
  component: LoginPage,
});