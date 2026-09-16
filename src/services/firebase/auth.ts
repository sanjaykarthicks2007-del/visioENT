/**
 * Firebase Authentication Service for SMART ENT ENDOSCOPE
 * Encapsulates Firebase Auth methods with AsyncStorage session persistence.
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  UserCredential,
  User as FirebaseUser,
  Unsubscribe,
} from 'firebase/auth';
import { auth } from './firebase';

/**
 * Sign in with clinical email and password via Firebase Auth
 */
export async function loginWithEmail(
  email: string,
  password: string
): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

/**
 * Register a new clinical account with email and password via Firebase Auth
 */
export async function registerWithEmail(
  email: string,
  password: string
): Promise<UserCredential> {
  return createUserWithEmailAndPassword(auth, email.trim(), password);
}

/**
 * Sign out from Firebase Auth session
 */
export async function logout(): Promise<void> {
  return signOut(auth);
}

/**
 * Subscribe to Firebase Auth state changes (restores session from AsyncStorage)
 */
export function subscribeToAuthState(
  callback: (user: FirebaseUser | null) => void
): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}

/**
 * Formats Firebase error codes into human-readable clinical messages
 */
export function formatFirebaseAuthError(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = String((error as { code: string }).code);

    switch (code) {
      case 'auth/invalid-credential':
        return 'Invalid clinical email or password. Please verify credentials.';
      case 'auth/user-not-found':
        return 'No clinical account found with this email.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/invalid-email':
        return 'Please enter a valid clinical email address.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Access temporarily restricted for security.';
      case 'auth/network-request-failed':
        return 'Network connection failure. Please check your connectivity and try again.';
      case 'auth/user-disabled':
        return 'This clinical account has been disabled by the system administrator.';
      case 'auth/email-already-in-use':
        return 'A clinical account already exists with this email address.';
      case 'auth/weak-password':
        return 'Password must be at least 6 characters.';
      default:
        return 'Authentication failed. Please verify credentials.';
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Authentication failed. Please try again.';
}
