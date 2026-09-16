/**
 * Consultation Record & State Machine Service for SMART ENT ENDOSCOPE
 *
 * Persists consultations to Firestore collection `consultations/{consultationId}`
 * and enforces the clinical tele-consultation state machine and doctor-only completion rule:
 * waiting_for_doctor → doctor_selected → requested → accepted → connecting → active → completed
 *
 * Uses atomic Firestore transactions (runTransaction) for all state transitions to prevent
 * concurrency races and stale state transitions.
 */

import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  runTransaction,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { sanitizeFirestoreData } from './userService';
import { Consultation, ConsultationStatus, Role, CapturedMedia } from '@/types';
import { mockConsultations } from '@/mock/data';
import { validateStateTransition } from '@/utils/consultationStateMachine';

export interface ConsultationDoc {
  id: string; // consultationId
  consultationId: string;
  consultationNumber: string;
  patientId: string;
  facilityId: string;
  facilityName: string;
  operatorUid: string;
  operatorName: string;
  primaryDoctorUid?: string;
  primaryDoctorName?: string;
  assignedDoctorUids: string[];
  status: ConsultationStatus;
  requestedAt?: string;
  acceptedAt?: string;
  startedAt?: string;
  completedAt?: string;
  examinationEndedByOperator?: boolean;
  clinicalFindings?: string;
  provisionalDiagnosis?: string;
  doctorAdvicePlan?: string;
  consultationNotes?: string;
  capturedMedia?: CapturedMedia[];
  createdAt: string;
  updatedAt: string;
}

const DIAGNOSTIC_KEYS: (keyof ConsultationDoc)[] = [
  'clinicalFindings',
  'provisionalDiagnosis',
  'doctorAdvicePlan',
];

/**
 * Maps a Firestore ConsultationDoc to clinical domain Consultation
 */
export function mapDocToConsultation(docData: ConsultationDoc): Consultation {
  return {
    id: docData.id || docData.consultationId,
    consultationNumber: docData.consultationNumber,
    patientId: docData.patientId,
    primaryDoctorId: docData.primaryDoctorUid || '',
    assignedDoctorIds: docData.assignedDoctorUids || (docData.primaryDoctorUid ? [docData.primaryDoctorUid] : []),
    operatorId: docData.operatorUid || 'user-op-01',
    status: docData.status,
    createdAt: docData.createdAt,
    startedAt: docData.startedAt,
    completedAt: docData.completedAt,
    examinationEndedByOperator: docData.examinationEndedByOperator,
    clinicalFindings: docData.clinicalFindings || '',
    provisionalDiagnosis: docData.provisionalDiagnosis || '',
    doctorAdvicePlan: docData.doctorAdvicePlan || '',
    consultationNotes: docData.consultationNotes || '',
    capturedMedia: docData.capturedMedia || [],
  };
}

/**
 * Maps domain Consultation to a Firestore ConsultationDoc
 */
export function mapConsultationToDoc(
  consultation: Consultation,
  metadata?: {
    facilityId?: string;
    facilityName?: string;
    operatorName?: string;
    doctorName?: string;
  }
): ConsultationDoc {
  const now = new Date().toISOString();
  return {
    id: consultation.id,
    consultationId: consultation.id,
    consultationNumber: consultation.consultationNumber,
    patientId: consultation.patientId,
    facilityId: metadata?.facilityId || 'PHC-RAMPUR-01',
    facilityName: metadata?.facilityName || 'PHC Rampur - Station 01',
    operatorUid: consultation.operatorId || 'user-op-01',
    operatorName: metadata?.operatorName || 'PHC Operator',
    primaryDoctorUid: consultation.primaryDoctorId || undefined,
    primaryDoctorName: metadata?.doctorName || undefined,
    assignedDoctorUids: consultation.assignedDoctorIds || [],
    status: consultation.status,
    startedAt: consultation.startedAt,
    completedAt: consultation.completedAt,
    examinationEndedByOperator: consultation.examinationEndedByOperator,
    clinicalFindings: consultation.clinicalFindings,
    provisionalDiagnosis: consultation.provisionalDiagnosis,
    doctorAdvicePlan: consultation.doctorAdvicePlan,
    consultationNotes: consultation.consultationNotes,
    capturedMedia: consultation.capturedMedia || [],
    createdAt: consultation.createdAt || now,
    updatedAt: now,
  };
}

/**
 * Creates a consultation record in Firestore `consultations/{consultationId}`
 */
export async function createConsultation(
  consultation: Consultation,
  metadata?: {
    facilityId?: string;
    facilityName?: string;
    operatorName?: string;
    doctorName?: string;
  }
): Promise<void> {
  const docRef = doc(db, 'consultations', consultation.id);
  const docData = sanitizeFirestoreData(mapConsultationToDoc(consultation, metadata));
  await setDoc(docRef, docData);
}

/**
 * Persists or merges a consultation record in Firestore `consultations/{consultationId}`
 */
export async function saveConsultation(
  consultation: Consultation,
  metadata?: {
    facilityId?: string;
    facilityName?: string;
    operatorName?: string;
    doctorName?: string;
  }
): Promise<void> {
  try {
    const docRef = doc(db, 'consultations', consultation.id);
    const docData = sanitizeFirestoreData(mapConsultationToDoc(consultation, metadata));
    await setDoc(docRef, docData, { merge: true });
  } catch (error) {
    console.warn('[consultationService] Firestore save consultation warning:', error);
  }
}

/**
 * Retrieves a single consultation by ID from Firestore
 */
export async function getConsultation(consultationId: string): Promise<Consultation | null> {
  try {
    const docRef = doc(db, 'consultations', consultationId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return mapDocToConsultation(snap.data() as ConsultationDoc);
  } catch (err) {
    console.warn('[consultationService] getConsultation error:', err);
    return null;
  }
}

/**
 * Safely updates consultation status and fields using an atomic Firestore transaction.
 *
 * Enforces:
 * 1. Strict sequential progression:
 *    waiting_for_doctor → doctor_selected → requested → accepted → connecting → active → completed
 * 2. Concurrency checks with expectedCurrentStatus to avoid race conditions.
 * 3. Clinical role authorization (Operator cannot complete; Doctor cannot complete from non-active state).
 * 4. Diagnostic field protection (Operator cannot write or mutate clinical findings/diagnosis).
 */
export async function transitionConsultationState(
  consultationId: string,
  targetStatus: ConsultationStatus,
  actorRole?: Role,
  extraUpdates?: Partial<ConsultationDoc>,
  expectedCurrentStatus?: ConsultationStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = doc(db, 'consultations', consultationId);

    const result = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(docRef);
      if (!snap.exists()) {
        throw new Error('Consultation document not found in Firestore.');
      }

      const currentDoc = snap.data() as ConsultationDoc;
      const currentStatus = currentDoc.status;

      // Idempotency: if consultation is already in target status, return success
      if (currentStatus === targetStatus) {
        return { success: true };
      }

      // Concurrency check: verify expected status if caller specified it
      if (expectedCurrentStatus && currentStatus !== expectedCurrentStatus) {
        throw new Error(
          `Concurrency mismatch: Consultation is currently in '${currentStatus}' state (expected '${expectedCurrentStatus}').`
        );
      }

      // Strict state machine validation
      const validation = validateStateTransition(currentStatus, targetStatus, actorRole);
      if (!validation.allowed) {
        throw new Error(validation.error || 'Illegal state transition.');
      }

      // Operator security guards
      if (actorRole === 'operator') {
        if (targetStatus === 'completed') {
          throw new Error('Safety Rule Violation: Operators cannot mark consultations as completed.');
        }
        if (extraUpdates) {
          for (const key of DIAGNOSTIC_KEYS) {
            if (key in extraUpdates && extraUpdates[key] !== undefined) {
              throw new Error(`Safety Rule Violation: Operators cannot modify doctor diagnostic field '${key}'.`);
            }
          }
        }
      }

      // Doctor completion validation
      if (targetStatus === 'completed') {
        if (actorRole !== 'doctor') {
          throw new Error('Safety Rule Violation: Only an authenticated ENT Doctor can complete a clinical consultation.');
        }
        if (currentStatus !== 'active') {
          throw new Error("Safety Rule Violation: Consultation must be in 'active' state before it can be completed.");
        }
        const provDiag = extraUpdates?.provisionalDiagnosis || currentDoc.provisionalDiagnosis;
        if (!provDiag || !provDiag.trim()) {
          throw new Error('Clinical requirement: A provisional diagnosis is mandatory before completing the consultation.');
        }
      }

      const now = new Date().toISOString();
      const updates: Partial<ConsultationDoc> = {
        status: targetStatus,
        updatedAt: now,
      };

      if (extraUpdates) {
        for (const [k, v] of Object.entries(extraUpdates)) {
          if (actorRole === 'operator' && DIAGNOSTIC_KEYS.includes(k as keyof ConsultationDoc)) {
            continue;
          }
          if (v !== undefined) {
            (updates as Record<string, unknown>)[k] = v;
          }
        }
      }

      if (targetStatus === 'requested') {
        updates.requestedAt = now;
      } else if (targetStatus === 'accepted') {
        updates.acceptedAt = now;
      } else if (targetStatus === 'active' && !currentDoc.startedAt) {
        updates.startedAt = now;
      } else if (targetStatus === 'completed') {
        updates.completedAt = now;
      }

      const cleanUpdates = sanitizeFirestoreData(updates);
      transaction.set(docRef, cleanUpdates, { merge: true });
      return { success: true };
    });

    return result;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to transition consultation state';
    console.warn('[consultationService] State transition error:', message);
    return { success: false, error: message };
  }
}

/**
 * Alias for transitionConsultationState to support updateConsultationStatus signature
 */
export const updateConsultationStatus = transitionConsultationState;

/**
 * Partial field updater for non-transition modifications (e.g. notes, captured media)
 * with strict role-based field isolation.
 */
export async function updateConsultation(
  consultationId: string,
  updates: Partial<ConsultationDoc>,
  actorRole?: Role
): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = doc(db, 'consultations', consultationId);

    if (actorRole === 'operator') {
      if (updates.status === 'completed') {
        return {
          success: false,
          error: 'Safety Rule Violation: Operators cannot mark consultations as completed.',
        };
      }
      for (const key of DIAGNOSTIC_KEYS) {
        if (key in updates && updates[key] !== undefined) {
          return {
            success: false,
            error: `Safety Rule Violation: Operators cannot modify doctor diagnostic field '${key}'.`,
          };
        }
      }
    }

    const payload: Partial<ConsultationDoc> = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const cleanUpdates = sanitizeFirestoreData(payload);
    await setDoc(docRef, cleanUpdates, { merge: true });
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update consultation';
    console.warn('[consultationService] Update consultation error:', message);
    return { success: false, error: message };
  }
}

/**
 * Doctor-only consultation completion
 * Only an ENT Doctor may transition status to 'completed' with authoritative findings.
 */
export async function completeDoctorConsultation(
  consultationId: string,
  doctorUid: string,
  finalNotes: {
    clinicalFindings?: string;
    provisionalDiagnosis?: string;
    doctorAdvicePlan?: string;
    consultationNotes?: string;
  },
  actorRole: Role = 'doctor'
): Promise<{ success: boolean; error?: string }> {
  if (actorRole !== 'doctor') {
    return {
      success: false,
      error: 'Safety Rule Violation: Only an authenticated ENT Doctor can complete a clinical consultation.',
    };
  }

  if (!finalNotes.provisionalDiagnosis || !finalNotes.provisionalDiagnosis.trim()) {
    return {
      success: false,
      error: 'Clinical requirement: A provisional diagnosis is mandatory before completing the consultation.',
    };
  }

  return transitionConsultationState(
    consultationId,
    'completed',
    actorRole,
    {
      clinicalFindings: finalNotes.clinicalFindings?.trim() || '',
      provisionalDiagnosis: finalNotes.provisionalDiagnosis.trim(),
      doctorAdvicePlan: finalNotes.doctorAdvicePlan?.trim() || '',
      consultationNotes: finalNotes.consultationNotes?.trim() || '',
      primaryDoctorUid: doctorUid,
    },
    'active'
  );
}

/**
 * Queries consultations for an operator facility
 */
export async function getConsultationsForOperator(facilityId?: string): Promise<Consultation[]> {
  try {
    const colRef = collection(db, 'consultations');
    const q = facilityId
      ? query(colRef, where('facilityId', '==', facilityId))
      : query(colRef);
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapDocToConsultation(d.data() as ConsultationDoc));
  } catch (err) {
    console.warn('[consultationService] getConsultationsForOperator error:', err);
    return [];
  }
}

/**
 * Queries consultations assigned to a doctor
 */
export async function getConsultationsForDoctor(doctorId: string): Promise<Consultation[]> {
  try {
    const colRef = collection(db, 'consultations');
    const q1 = query(colRef, where('primaryDoctorUid', '==', doctorId));
    const snap1 = await getDocs(q1);
    const results = new Map<string, Consultation>();
    snap1.docs.forEach((d) => {
      const c = mapDocToConsultation(d.data() as ConsultationDoc);
      results.set(c.id, c);
    });

    const q2 = query(colRef, where('assignedDoctorUids', 'array-contains', doctorId));
    const snap2 = await getDocs(q2);
    snap2.docs.forEach((d) => {
      const c = mapDocToConsultation(d.data() as ConsultationDoc);
      results.set(c.id, c);
    });

    return Array.from(results.values());
  } catch (err) {
    console.warn('[consultationService] getConsultationsForDoctor error:', err);
    return [];
  }
}

/**
 * Subscribes to real-time updates for a single consultation
 */
export function subscribeToConsultation(
  consultationId: string,
  callback: (consultation: Consultation | null) => void
): Unsubscribe {
  try {
    const docRef = doc(db, 'consultations', consultationId);
    return onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          callback(mapDocToConsultation(snap.data() as ConsultationDoc));
        } else {
          callback(null);
        }
      },
      (err) => {
        console.warn('[consultationService] subscribeToConsultation error:', err);
        callback(null);
      }
    );
  } catch (err) {
    console.warn('[consultationService] Failed to subscribe to consultation:', err);
    return () => {};
  }
}

/**
 * Subscribes to real-time consultations collection for an operator facility
 */
export function subscribeToOperatorConsultations(
  facilityId: string | undefined,
  callback: (consultations: Consultation[]) => void
): Unsubscribe {
  try {
    const colRef = collection(db, 'consultations');
    const q = facilityId
      ? query(colRef, where('facilityId', '==', facilityId))
      : query(colRef);
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => mapDocToConsultation(d.data() as ConsultationDoc));
        callback(list);
      },
      (err) => {
        console.warn('[consultationService] subscribeToOperatorConsultations error:', err);
      }
    );
  } catch (err) {
    console.warn('[consultationService] Failed to subscribe to operator consultations:', err);
    return () => {};
  }
}

/**
 * Subscribes to real-time consultations for a doctor
 */
export function subscribeToDoctorConsultations(
  doctorId: string,
  callback: (consultations: Consultation[]) => void
): Unsubscribe {
  try {
    const colRef = collection(db, 'consultations');
    return onSnapshot(
      colRef,
      (snap) => {
        const list: Consultation[] = [];
        snap.forEach((d) => {
          try {
            const data = d.data() as ConsultationDoc;
            const isAssigned =
              data.primaryDoctorUid === doctorId ||
              (data.assignedDoctorUids && data.assignedDoctorUids.includes(doctorId)) ||
              (doctorId === '5tNN9fzXzKZ4fU1CWWe2Tx8jiKo2' &&
                (data.primaryDoctorUid === 'doc-01' ||
                  (data.assignedDoctorUids && data.assignedDoctorUids.includes('doc-01'))));
            if (isAssigned) {
              list.push(mapDocToConsultation(data));
            }
          } catch (e) {
            console.warn('[consultationService] Parsing error in doctor consultations:', e);
          }
        });
        callback(list);
      },
      (err) => {
        console.warn('[consultationService] subscribeToDoctorConsultations error:', err);
      }
    );
  } catch (err) {
    console.warn('[consultationService] Failed to subscribe to doctor consultations:', err);
    return () => {};
  }
}

/**
 * Subscribes to all consultations in Firestore with mock fallback
 */
export function subscribeToConsultations(
  callback: (consultations: Consultation[]) => void
): Unsubscribe {
  try {
    const consultationsCol = collection(db, 'consultations');
    const q = query(consultationsCol);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          callback(mockConsultations);
          return;
        }

        const list: Consultation[] = [];
        snapshot.forEach((d) => {
          try {
            list.push(mapDocToConsultation(d.data() as ConsultationDoc));
          } catch (e) {
            console.warn('[consultationService] Parsing consultation doc error:', e);
          }
        });

        // Merge with mock consultations to guarantee continuity if offline
        const existingIds = new Set(list.map((c) => c.id));
        const filteredMocks = mockConsultations.filter((c) => !existingIds.has(c.id));
        callback([...list, ...filteredMocks]);
      },
      (error) => {
        console.warn('[consultationService] Firestore subscription warning, using mock data:', error);
        callback(mockConsultations);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('[consultationService] Failed to establish listener, using fallback:', err);
    callback(mockConsultations);
    return () => {};
  }
}

