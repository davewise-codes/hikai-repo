import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/domains/auth/hooks/use-auth';

/**
 * User-specific preferences stored per-user in localStorage.
 * This allows multiple users to be logged in simultaneously
 * in different tabs without conflicts.
 */
interface UserPreferences {
  currentOrgId: string | null;
  currentProductId: string | null;
}

const defaultPrefs: UserPreferences = {
  currentOrgId: null,
  currentProductId: null,
};

function getStorageKey(userId: string) {
  return `hikai-user-${userId}-prefs`;
}

/**
 * Hook to manage user-specific preferences.
 *
 * Uses localStorage with user-scoped keys to support multiple
 * users logged in simultaneously in different browser tabs.
 *
 * Global preferences (theme, locale, fontSize, colorTheme) remain
 * in the Zustand store as they are device-level, not user-level.
 */
export function useUserPreferences() {
  const { user } = useAuth();
  const userId = user?._id;

  const [prefs, setPrefsState] = useState<UserPreferences>(defaultPrefs);

  // Load prefs when userId changes
  useEffect(() => {
    if (!userId) {
      setPrefsState(defaultPrefs);
      return;
    }

    const stored = localStorage.getItem(getStorageKey(userId));
    if (stored) {
      try {
        setPrefsState(JSON.parse(stored));
      } catch {
        setPrefsState(defaultPrefs);
      }
    } else {
      setPrefsState(defaultPrefs);
    }
  }, [userId]);

  const setPrefs = useCallback((updates: Partial<UserPreferences>) => {
    if (!userId) return;

    setPrefsState(prev => {
      const newPrefs = { ...prev, ...updates };
      localStorage.setItem(getStorageKey(userId), JSON.stringify(newPrefs));
      return newPrefs;
    });
  }, [userId]);

  const setCurrentOrgId = useCallback((id: string | null) => {
    setPrefs({ currentOrgId: id });
  }, [setPrefs]);

  const setCurrentProductId = useCallback((id: string | null) => {
    setPrefs({ currentProductId: id });
  }, [setPrefs]);

  return {
    currentOrgId: prefs.currentOrgId,
    currentProductId: prefs.currentProductId,
    setCurrentOrgId,
    setCurrentProductId,
    isReady: !!userId,
  };
}
