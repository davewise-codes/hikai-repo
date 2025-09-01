import { StateCreator } from 'zustand';

// Auth slice interface - solo para loading state local
export interface AuthSlice {
  // Auth loading state (para operaciones async como signIn/signOut)
  isLoading: boolean;
  
  // Auth actions
   
  setLoading: (loading: boolean) => void;
}

export const createAuthSlice: StateCreator<AuthSlice, [], [], AuthSlice> = (set) => ({
  // Auth state
  isLoading: false,
  
  // Auth actions
  setLoading: (isLoading) => set({ isLoading }),
});