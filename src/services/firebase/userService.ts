/**
 * Clinical User & Profile Service for SMART ENT ENDOSCOPE
 *
 * Manages Firestore `users/{uid}` profiles, doctor directory subscriptions,
 * and secure clinical user registration using an isolated secondary Firebase App.
 */

import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  onSnapshot,
  Unsubscribe,
  getFirestore,
} from 'firebase/firestore';
import { db, firebaseConfig } from './firebase';
import { formatFirebaseAuthError } from './auth';
import { User, Doctor, Role, DoctorAvailability } from '@/types';
import { mockDoctors } from '@/mock/data';

export interface UserDoc {
  uid: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  facilityId: string;
  facilityName: string;
  specialty?: string;
  qualification?: string;
  medicalDegree?: string;
  additionalQualification?: string;
  subSpecialization?: string;
  currentHospital?: string;
  designation?: string;
  consultationMode?: 'In-person' | 'Teleconsultation' | 'Both';
  languages?: string[];
  experienceYears?: number;
  profilePhoto?: string;
  isActive: boolean;
  availability?: DoctorAvailability;
  createdAt: string;
  updatedAt: string;
}

export interface NewClinicalUserDto {
  name: string;
  email: string;
  password: string;
  role: Role;
  phone?: string;
  facilityId: string;
  facilityName: string;
  specialty?: string;
  qualification?: string;
  medicalDegree?: string;
  additionalQualification?: string;
  subSpecialization?: string;
  currentHospital?: string;
  designation?: string;
  consultationMode?: 'In-person' | 'Teleconsultation' | 'Both';
  languages?: string[];
  experienceYears?: number;
  profilePhoto?: string;
  isActive?: boolean;
}

/**
 * Maps a Firestore UserDoc to the clinical domain User interface
 */
export function mapDocToUser(docData: UserDoc): User {
  return {
    id: docData.uid,
    name: docData.name,
    email: docData.email,
    role: docData.role,
    facility: docData.facilityName || 'PHC Rampur - Station 01',
    facilityId: docData.facilityId || (docData.role === 'doctor' ? 'DH-TELE-01' : 'PHC-RAMPUR-01'),
    specialty: docData.specialty,
    qualification: docData.qualification,
    phone: docData.phone,
  };
}

/**
 * Helper to remove undefined keys to comply with Firestore setDoc constraints
 */
export function sanitizeFirestoreData<T extends Record<string, any>>(obj: T): Partial<T> {
  const clean: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = value;
    }
  }
  return clean;
}

/**
 * Helper to ensure Firestore async operations do not hang the UI if offline
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), timeoutMs)),
  ]);
}

/**
 * Retrieves the clinical user profile from Firestore `users/{uid}`
 */
export async function getUserProfile(uid: string): Promise<User | null> {
  try {
    const userDocRef = doc(db, 'users', uid);
    const snapshot = await withTimeout(getDoc(userDocRef), 8000, null);

    if (snapshot && snapshot.exists()) {
      return mapDocToUser(snapshot.data() as UserDoc);
    }
  } catch (error) {
    console.warn('[userService] Could not fetch Firestore user profile, offline fallback:', error);
  }
  return null;
}

/**
 * Upserts a clinical user profile in Firestore `users/{uid}`
 */
export async function setUserProfile(
  uid: string,
  profile: Partial<UserDoc>
): Promise<void> {
  const now = new Date().toISOString();
  const userDocRef = doc(db, 'users', uid);
  const cleanData = sanitizeFirestoreData({
    ...profile,
    uid,
    updatedAt: now,
  });
  await withTimeout(
    setDoc(userDocRef, cleanData, { merge: true }),
    8000,
    undefined
  );
}

/**
 * Ensures existing verified clinical accounts have corresponding Firestore profiles.
 * Returns null if the user has no profile and is not an authorized initial account.
 */
export async function ensureExistingUserProfile(
  uid: string,
  email: string
): Promise<User | null> {
  const emailLower = email.toLowerCase().trim();

  try {
    const existing = await getUserProfile(uid);
    if (existing) {
      return existing;
    }
  } catch (err) {
    console.warn('[userService] Failed to check existing profile:', err);
  }

  // Only the two designated verified clinical accounts are allowed to bootstrap their known profiles
  if (emailLower === 'doctor.sharma@curaxion.health' || emailLower === 'operator@curaxion.health') {
    const isDoctor = emailLower.includes('doctor');
    const role: Role = isDoctor ? 'doctor' : 'operator';

    const defaultProfile: UserDoc = {
      uid,
      name: isDoctor ? 'Dr. Ananya Sharma' : 'Ramesh Kumar',
      email: emailLower,
      role,
      phone: isDoctor ? '+91 91234 56789' : '+91 98765 43210',
      facilityId: isDoctor ? 'DH-TELE-01' : 'PHC-RAMPUR-01',
      facilityName: isDoctor
        ? 'District Hospital Tele-ENT Center'
        : 'PHC Rampur - Station 01',
      specialty: isDoctor ? 'Otology & Head/Neck' : undefined,
      qualification: isDoctor ? 'MS (ENT), DNB' : undefined,
      isActive: true,
      availability: isDoctor ? 'available' : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await setUserProfile(uid, defaultProfile);
    } catch (err) {
      console.warn('[userService] Failed to write initial Firestore profile:', err);
    }

    return mapDocToUser(defaultProfile);
  }

  // For any other account: DO NOT assume a role! Return null to indicate missing profile
  return null;
}

/**
 * Securely registers a new clinical user (PHC Operator or ENT Doctor)
 *
 * Uses an isolated secondary Firebase App instance so that the active
 * logged-in operator session is NEVER evicted or interrupted.
 */
export async function registerClinicalUser(
  data: NewClinicalUserDto
): Promise<{ success: boolean; error?: string; user?: User }> {
  const secondaryAppName = `SecondaryReg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  let secondaryApp = null;

  try {
    // 1. Initialize isolated secondary app with identical config
    secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
    const secondaryAuth = getAuth(secondaryApp);
    const secondaryDb = getFirestore(secondaryApp);

    // 2. Create the user in Firebase Auth without disturbing primary session
    const userCredential = await createUserWithEmailAndPassword(
      secondaryAuth,
      data.email.trim(),
      data.password
    );

    const newUid = userCredential.user.uid;
    const now = new Date().toISOString();

    // 3. Prepare the Firestore user document
    const userDoc: UserDoc = {
      uid: newUid,
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      role: data.role,
      phone: data.phone?.trim() || '',
      facilityId: data.facilityId.trim(),
      facilityName: data.facilityName.trim(),
      specialty: data.role === 'doctor' ? data.specialty?.trim() : undefined,
      qualification: data.role === 'doctor' ? data.qualification?.trim() : undefined,
      medicalDegree: data.role === 'doctor' ? data.medicalDegree?.trim() : undefined,
      additionalQualification: data.role === 'doctor' ? data.additionalQualification?.trim() : undefined,
      subSpecialization: data.role === 'doctor' ? data.subSpecialization?.trim() : undefined,
      currentHospital: data.currentHospital?.trim(),
      designation: data.designation?.trim(),
      consultationMode: data.consultationMode,
      languages: data.languages,
      experienceYears: data.experienceYears,
      profilePhoto: data.profilePhoto,
      isActive: data.isActive !== false,
      availability: data.role === 'doctor' ? 'available' : undefined,
      createdAt: now,
      updatedAt: now,
    };

    // 4. Save to Firestore `users/{uid}` using secondaryDb where secondaryAuth is signed in
    await setDoc(doc(secondaryDb, 'users', newUid), sanitizeFirestoreData(userDoc));

    // 5. Sign out from secondary auth
    await signOut(secondaryAuth);

    return {
      success: true,
      user: mapDocToUser(userDoc),
    };
  } catch (error: unknown) {
    const friendlyError = formatFirebaseAuthError(error);
    return {
      success: false,
      error: friendlyError,
    };
  } finally {
    // 6. Always clean up and destroy the secondary app instance
    if (secondaryApp) {
      try {
        await deleteApp(secondaryApp);
      } catch {
        // Ignore deletion errors
      }
    }
  }
}

/**
 * Subscribes to real-time doctor availability and directory from Firestore
 */
export function subscribeToDoctors(
  callback: (doctors: Doctor[]) => void
): Unsubscribe {
  try {
    const doctorsRef = collection(db, 'users');
    const q = query(doctorsRef, where('role', '==', 'doctor'), where('isActive', '==', true));

    return onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: Doctor[] = snapshot.docs.map((d) => {
            const data = d.data() as UserDoc;
            return {
              id: data.uid,
              name: data.name,
              specialty: data.specialty || 'ENT / Otorhinolaryngology',
              qualification: data.qualification || data.medicalDegree || 'MBBS, MS (ENT)',
              facility: data.facilityName || data.currentHospital || 'District Hospital',
              availability: data.availability || 'available',
              experienceYears: typeof data.experienceYears === 'number' ? data.experienceYears : 10,
              contactNumber: data.phone,
              email: data.email,
              medicalDegree: data.medicalDegree,
              additionalQualification: data.additionalQualification,
              subSpecialization: data.subSpecialization,
              currentHospital: data.currentHospital,
              designation: data.designation,
              consultationMode: data.consultationMode,
              languages: data.languages,
              profilePhoto: data.profilePhoto,
            };
          });
          callback(list);
        } else {
          // If no docs in Firestore yet, provide fallback mock doctors
          callback(mockDoctors);
        }
      },
      (error) => {
        console.warn('[userService] subscribeToDoctors error, using fallback:', error);
        callback(mockDoctors);
      }
    );
  } catch (e) {
    console.warn('[userService] Could not establish doctors subscription:', e);
    callback(mockDoctors);
    return () => {};
  }
}
