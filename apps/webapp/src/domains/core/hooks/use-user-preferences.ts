import { useCallback, useSyncExternalStore } from 'react';
import {
	defaultColorTheme,
	defaultFontSize,
	defaultTheme,
	type ColorThemeId,
	type FontSize,
	type Theme,
} from '@hikai/ui';
import { defaultLocale, type Locale } from '../store/core-slice';
import { useAuth } from '@/domains/auth/hooks/use-auth';

/**
 * User-specific preferences stored per-user in localStorage.
 * This allows multiple users to be logged in simultaneously
 * in different tabs without conflicts.
 */
interface UserPreferences {
	currentOrgId: string | null;
	currentProductId: string | null;
	theme: Theme;
	colorTheme: ColorThemeId;
	fontSize: FontSize;
	locale: Locale;
}

const defaultPrefs: UserPreferences = {
	currentOrgId: null,
	currentProductId: null,
	theme: defaultTheme,
	colorTheme: defaultColorTheme,
	fontSize: defaultFontSize,
	locale: defaultLocale,
};

function getStorageKey(userKey: string) {
	return `hikai-user-${userKey}-prefs`;
}

// In-memory cache to track which users have been loaded
const loadedUsers = new Set<string>(); // keyed by userKey (userId or "anonymous")

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
	const key = userId ?? "anonymous";

	// Return cached value if available
	const cached = prefsCache.get(key);
	if (cached) return cached;

	const stored = localStorage.getItem(getStorageKey(key));
	if (stored) {
		try {
			const parsed = JSON.parse(stored);
			const merged = { ...defaultPrefs, ...parsed };
			prefsCache.set(key, merged);
			return merged;
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
	const userKey = user?._id ?? "anonymous";

	// Mark user as loaded on first access
	if (!loadedUsers.has(userKey)) {
		const stored = localStorage.getItem(getStorageKey(userKey));
		if (stored) {
			loadedUsers.add(userKey);
		}
	}

	const prefs = useSyncExternalStore(
		subscribe,
		() => getPrefsFromStorage(userKey),
		() => defaultPrefs // Server snapshot
	);

	const setCurrentOrgId = useCallback(
		(id: string | null) => {
			const currentPrefs = getPrefsFromStorage(userKey);
			setPrefsToStorage(userKey, { ...currentPrefs, currentOrgId: id });
		},
		[userKey]
	);

	const setCurrentProductId = useCallback(
		(id: string | null) => {
			const currentPrefs = getPrefsFromStorage(userKey);
			setPrefsToStorage(userKey, { ...currentPrefs, currentProductId: id });
		},
		[userKey]
	);

	const setTheme = useCallback(
		(newTheme: Theme) => {
			const currentPrefs = getPrefsFromStorage(userKey);
			setPrefsToStorage(userKey, { ...currentPrefs, theme: newTheme });
		},
		[userKey]
	);

	const setColorTheme = useCallback(
		(newColorTheme: ColorThemeId) => {
			const currentPrefs = getPrefsFromStorage(userKey);
			setPrefsToStorage(userKey, { ...currentPrefs, colorTheme: newColorTheme });
		},
		[userKey]
	);

	const setFontSize = useCallback(
		(newFontSize: FontSize) => {
			const currentPrefs = getPrefsFromStorage(userKey);
			setPrefsToStorage(userKey, { ...currentPrefs, fontSize: newFontSize });
		},
		[userKey]
	);

	const setLocale = useCallback(
		(newLocale: Locale) => {
			const currentPrefs = getPrefsFromStorage(userKey);
			setPrefsToStorage(userKey, { ...currentPrefs, locale: newLocale });
		},
		[userKey]
	);

	// isReady: we've either loaded from storage or storage is empty for this user key
	const isReady =
		loadedUsers.has(userKey) || !localStorage.getItem(getStorageKey(userKey));

	return {
		currentOrgId: prefs.currentOrgId,
		currentProductId: prefs.currentProductId,
		setCurrentOrgId,
		setCurrentProductId,
		theme: prefs.theme,
		setTheme,
		colorTheme: prefs.colorTheme,
		setColorTheme,
		fontSize: prefs.fontSize,
		setFontSize,
		locale: prefs.locale,
		setLocale,
		isReady,
	};
}
