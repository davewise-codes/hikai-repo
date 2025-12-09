import { useCallback, useSyncExternalStore } from 'react';
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

// In-memory cache to track which users have been loaded
const loadedUsers = new Set<string>();

// Cache for preferences per user (to avoid creating new objects on each getSnapshot)
const prefsCache = new Map<string, UserPreferences>();

// Event emitter for preference changes (for same-tab synchronization)
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach(listener => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getPrefsFromStorage(userId: string | undefined): UserPreferences {
  if (!userId) return defaultPrefs;

  // Return cached value if available
  const cached = prefsCache.get(userId);
  if (cached) return cached;

  const stored = localStorage.getItem(getStorageKey(userId));
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      prefsCache.set(userId, parsed);
      return parsed;
    } catch {
      return defaultPrefs;
    }
  }
  return defaultPrefs;
}

function setPrefsToStorage(userId: string, prefs: UserPreferences) {
  localStorage.setItem(getStorageKey(userId), JSON.stringify(prefs));
  prefsCache.set(userId, prefs); // Update cache
  loadedUsers.add(userId);
  emitChange();
}

/**
 * Hook to manage user-specific preferences.
 *
 * Uses localStorage with user-scoped keys to support multiple
 * users logged in simultaneously in different browser tabs.
 *
 * Uses useSyncExternalStore for synchronization across all components
 * that use this hook within the same tab.
 *
 * Global preferences (theme, locale, fontSize, colorTheme) remain
 * in the Zustand store as they are device-level, not user-level.
 */
export function useUserPreferences() {
  const { user } = useAuth();
  const userId = user?._id;

  // Mark user as loaded on first access
  if (userId && !loadedUsers.has(userId)) {
    // Check if there's stored data
    const stored = localStorage.getItem(getStorageKey(userId));
    if (stored) {
      loadedUsers.add(userId);
    }
  }

  const prefs = useSyncExternalStore(
    subscribe,
    () => getPrefsFromStorage(userId),
    () => defaultPrefs // Server snapshot
  );

  const setCurrentOrgId = useCallback((id: string | null) => {
    if (!userId) return;
    const currentPrefs = getPrefsFromStorage(userId);
    setPrefsToStorage(userId, { ...currentPrefs, currentOrgId: id });
  }, [userId]);

  const setCurrentProductId = useCallback((id: string | null) => {
    if (!userId) return;
    const currentPrefs = getPrefsFromStorage(userId);
    setPrefsToStorage(userId, { ...currentPrefs, currentProductId: id });
  }, [userId]);

  // isReady: user exists AND we've either loaded from storage or storage is empty
  const isReady = !!userId && (loadedUsers.has(userId) || !localStorage.getItem(getStorageKey(userId)));

  return {
    currentOrgId: prefs.currentOrgId,
    currentProductId: prefs.currentProductId,
    setCurrentOrgId,
    setCurrentProductId,
    isReady,
  };
}
