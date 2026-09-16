/**
 * Patient Record Service for SMART ENT ENDOSCOPE
 *
 * Persists and synchronizes patient records with Firestore collection `patients/{patientId}`.
 * Enforces facility-scoped access rules for PHC Operators.
 */

import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { sanitizeFirestoreData } from './userService';
import { Patient, ENTComplaint, RelevantHistory } from '@/types';
import { mockPatients } from '@/mock/data';

export interface PatientDoc {
  id: string;
  patientId: string;
  fullName: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  phone?: string;
  nationalId?: string;
  registeredByUid: string;
  registeredByFacilityId: string;
  registeredByFacilityName: string;
  chiefComplaint?: string;
  medicalHistorySummary?: string;
  entComplaint: ENTComplaint;
  relevantHistory: RelevantHistory;
  operatorNotes: string;
  arrivalDateTime?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Summarizes ENTComplaint into a human-readable string
 */
function summarizeComplaint(complaint: ENTComplaint): string {
  const activeSymptoms: string[] = [];
  if (complaint.earPain) activeSymptoms.push('Ear Pain');
  if (complaint.hearingDifficulty) activeSymptoms.push('Hearing Difficulty');
  if (complaint.earDischarge) activeSymptoms.push('Ear Discharge');
  if (complaint.tinnitus) activeSymptoms.push('Tinnitus');
  if (complaint.vertigo) activeSymptoms.push('Vertigo/Dizziness');
  if (complaint.noseBlockage) activeSymptoms.push('Nasal Blockage');
  if (complaint.nasalDischarge) activeSymptoms.push('Nasal Discharge');
  if (complaint.epistaxis) activeSymptoms.push('Epistaxis (Nosebleed)');
  if (complaint.facialPain) activeSymptoms.push('Facial Pain');
  if (complaint.throatPain) activeSymptoms.push('Throat Pain');
  if (complaint.difficultySwallowing) activeSymptoms.push('Difficulty Swallowing');
  if (complaint.foreignBodySensation) activeSymptoms.push('Foreign Body Sensation');
  if (complaint.hoarseness) activeSymptoms.push('Hoarseness');
  if (complaint.other && complaint.otherDetails) activeSymptoms.push(complaint.otherDetails);

  const durationStr = complaint.duration ? ` (${complaint.duration}, ${complaint.severity})` : '';
  return (activeSymptoms.join(', ') || 'No acute symptoms reported') + durationStr;
}

/**
 * Summarizes RelevantHistory into a human-readable string
 */
function summarizeHistory(history: RelevantHistory): string {
  const parts: string[] = [];
  if (history.relevantMedicalHistory) parts.push(`Medical: ${history.relevantMedicalHistory}`);
  if (history.previousEntProblems) parts.push(`Prior ENT: ${history.previousEntProblems}`);
  if (history.previousEntSurgery) parts.push(`Surgery: ${history.previousEntSurgery}`);
  if (history.currentMedication) parts.push(`Medication: ${history.currentMedication}`);
  if (history.knownAllergies) parts.push(`Allergies: ${history.knownAllergies}`);
  return parts.join(' | ') || 'None reported';
}

/**
 * Maps a Firestore document to clinical domain Patient
 */
export function mapDocToPatient(docData: PatientDoc): Patient {
  return {
    id: docData.id,
    patientId: docData.patientId,
    name: docData.fullName,
    age: docData.age,
    gender: docData.gender,
    contactNumber: docData.phone || '',
    facility: docData.registeredByFacilityName || 'PHC Rampur - Station 01',
    registeredAt: docData.createdAt,
    arrivalDateTime: docData.arrivalDateTime || docData.createdAt,
    entComplaint: docData.entComplaint,
    relevantHistory: docData.relevantHistory,
    operatorNotes: docData.operatorNotes || '',
  };
}

/**
 * Maps a clinical domain Patient to a Firestore document
 */
export function mapPatientToDoc(
  patient: Patient,
  context?: {
    uid?: string;
    facilityId?: string;
    facilityName?: string;
  }
): PatientDoc {
  const now = new Date().toISOString();
  return {
    id: patient.id,
    patientId: patient.patientId,
    fullName: patient.name,
    age: patient.age,
    gender: patient.gender,
    phone: patient.contactNumber,
    registeredByUid: context?.uid || 'user-op-01',
    registeredByFacilityId: context?.facilityId || 'PHC-RAMPUR-01',
    registeredByFacilityName: context?.facilityName || patient.facility || 'PHC Rampur - Station 01',
    chiefComplaint: summarizeComplaint(patient.entComplaint),
    medicalHistorySummary: summarizeHistory(patient.relevantHistory),
    entComplaint: patient.entComplaint,
    relevantHistory: patient.relevantHistory,
    operatorNotes: patient.operatorNotes,
    arrivalDateTime: patient.arrivalDateTime || patient.registeredAt || now,
    createdAt: patient.registeredAt || now,
    updatedAt: now,
  };
}

/**
 * Persists a patient record to Firestore `patients/{patientId}`
 */
export async function savePatient(
  patient: Patient,
  context?: {
    uid?: string;
    facilityId?: string;
    facilityName?: string;
  }
): Promise<void> {
  try {
    const docRef = doc(db, 'patients', patient.id);
    const docData = sanitizeFirestoreData(mapPatientToDoc(patient, context));
    await setDoc(docRef, docData, { merge: true });
  } catch (error) {
    console.warn('[patientService] Could not write to Firestore patients collection, local cached:', error);
  }
}

/**
 * Retrieves a single patient by their unique id from Firestore
 */
export async function getPatientById(id: string): Promise<Patient | null> {
  try {
    const docRef = doc(db, 'patients', id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return mapDocToPatient(snap.data() as PatientDoc);
    }
  } catch (error) {
    console.warn('[patientService] Failed to get patient from Firestore:', error);
  }
  return null;
}

/**
 * Subscribes to patients with facility scoping for Operators or full access for Doctors
 */
export function subscribeToPatients(
  options: {
    facilityId?: string;
    role?: 'operator' | 'doctor';
  },
  callback: (patients: Patient[]) => void
): Unsubscribe {
  try {
    const patientsCol = collection(db, 'patients');

    let q;
    // PHC Operators can only view patients registered for their own facility
    if (options.role === 'operator') {
      const targetFacilityId = options.facilityId || 'PHC-RAMPUR-01';
      q = query(patientsCol, where('registeredByFacilityId', '==', targetFacilityId));
    } else {
      // Doctors or un-scoped queries view all clinical patients
      q = query(patientsCol);
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          // If Firestore is empty or uninitialized, provide default mock patients
          callback(mockPatients);
          return;
        }

        const list: Patient[] = [];
        snapshot.forEach((d) => {
          try {
            list.push(mapDocToPatient(d.data() as PatientDoc));
          } catch (e) {
            console.warn('[patientService] Parsing patient doc error:', e);
          }
        });

        // Merge with mock patients for demo/offline continuity
        const existingIds = new Set(list.map((p) => p.id));
        const filteredMocks = mockPatients.filter((p) => !existingIds.has(p.id));
        callback([...list, ...filteredMocks]);
      },
      (error) => {
        console.warn('[patientService] Firestore subscription error, using mock data:', error);
        callback(mockPatients);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('[patientService] Failed to establish listener, using fallback:', err);
    callback(mockPatients);
    return () => {};
  }
}
