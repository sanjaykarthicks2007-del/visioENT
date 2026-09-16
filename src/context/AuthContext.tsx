/**
 * Authentication context for SMART ENT ENDOSCOPE (CuraXion)
 * Uses Firebase Email/Password Authentication with AsyncStorage session persistence.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User as FirebaseUser } from 'firebase/auth';
import { User, Role } from '@/types';
import { mockUsers } from '@/mock/data';
import {
  loginWithEmail,
  logout as firebaseLogout,
  subscribeToAuthState,
  formatFirebaseAuthError,
} from '@/services/firebase/auth';
import { ensureExistingUserProfile, getUserProfile } from '@/services/firebase/userService';

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  login: (
    email: string,
    password?: string
  ) => Promise<{ success: boolean; error?: string; role?: Role }>;
  logout: () => Promise<void>;
  quickLoginAsRole: (role: Role) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Resolves application User profile from authenticated Firebase User.
 * Only resolves known verified accounts; returns null for unprofiled accounts.
 */
function resolveUserProfile(firebaseUser: FirebaseUser): User | null {
  const emailLower = (firebaseUser.email || '').toLowerCase().trim();
  const matchedUser = mockUsers.find(
    (u) => u.email.toLowerCase().trim() === emailLower
  );

  if (matchedUser) {
    return {
      ...matchedUser,
      id: matchedUser.id, // Keeps clinical entity ID (e.g. 'user-op-01' or 'doc-01')
      email: firebaseUser.email || matchedUser.email,
      name: firebaseUser.displayName || matchedUser.name,
    };
  }

  // DO NOT assume a role for unprofiled accounts
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore cached session on startup before network/auth check completes
  useEffect(() => {
    (async () => {
      try {
        const cached = await AsyncStorage.getItem('@visioENT_cached_profile');
        if (cached) {
          const parsed = JSON.parse(cached) as User;
          if (parsed && parsed.id) {
            setCurrentUser(parsed);
          }
        }
      } catch (e) {
        console.warn('[AuthContext] Failed to read cached profile:', e);
      }
    })();
  }, []);

  // Restore and synchronize Firebase authentication state from AsyncStorage and Firestore
  useEffect(() => {
    const unsubscribe = subscribeToAuthState(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          let profile = await getUserProfile(firebaseUser.uid);
          if (!profile) {
            profile = await ensureExistingUserProfile(
              firebaseUser.uid,
              firebaseUser.email || ''
            );
          }

          if (profile) {
            setCurrentUser(profile);
            await AsyncStorage.setItem('@visioENT_cached_profile', JSON.stringify(profile));
          } else {
            const known = resolveUserProfile(firebaseUser);
            if (known) {
              setCurrentUser(known);
              await AsyncStorage.setItem('@visioENT_cached_profile', JSON.stringify(known));
            } else {
              console.warn('[AuthContext] Authenticated user has no Firestore profile in users/{uid}');
            }
          }
        } catch (err) {
          console.warn('[AuthContext] Firestore profile fetch error, maintaining offline cache:', err);
        }
      } else {
        // Only clear currentUser if no firebaseUser and not in demo mode
        setCurrentUser((curr) => {
          if (curr && (curr.id === 'user-op-01' || curr.id === 'doc-01')) {
            // retain demo session if switching
            return curr;
          }
          return null;
        });
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  /**
   * Clinical sign in via Firebase Email/Password with Firestore profile lookup
   */
  const login = async (
    email: string,
    password?: string
  ): Promise<{ success: boolean; error?: string; role?: Role }> => {
    setIsLoading(true);

    try {
      const userCredential = await loginWithEmail(email, password || '');
      let profile: User | null = null;
      try {
        profile = await getUserProfile(userCredential.user.uid);
        if (!profile) {
          profile = await ensureExistingUserProfile(
            userCredential.user.uid,
            userCredential.user.email || email
          );
        }
      } catch (err) {
        console.warn('[AuthContext] Login profile resolution error, using fallback:', err);
        profile = resolveUserProfile(userCredential.user);
      }

      if (!profile) {
        // Missing profile: controlled error and sign out
        await firebaseLogout();
        setCurrentUser(null);
        await AsyncStorage.removeItem('@visioENT_cached_profile');
        setIsLoading(false);
        return {
          success: false,
          error: 'Clinical profile not found for this account. Please contact an administrator to provision your clinical credentials.',
        };
      }

      setCurrentUser(profile);
      await AsyncStorage.setItem('@visioENT_cached_profile', JSON.stringify(profile));
      setIsLoading(false);
      return { success: true, role: profile.role };
    } catch (error: unknown) {
      setIsLoading(false);
      const friendlyError = formatFirebaseAuthError(error);
      return {
        success: false,
        error: friendlyError,
      };
    }
  };

  /**
   * Clinical sign out via Firebase Auth
   */
  const logout = async (): Promise<void> => {
    try {
      await firebaseLogout();
      await AsyncStorage.removeItem('@visioENT_cached_profile');
    } finally {
      setCurrentUser(null);
    }
  };

  /**
   * Fast demo role switcher (retained for backward compatibility)
   */
  const quickLoginAsRole = (role: Role) => {
    const user = mockUsers.find((u) => u.role === role);
    if (user) {
      setCurrentUser(user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoading,
        login,
        logout,
        quickLoginAsRole,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
