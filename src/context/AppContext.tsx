/**
 * Central application state for SMART ENT ENDOSCOPE (CuraXion)
 *
 * Implements strict, validated consultation state machine transitions:
 * waiting_for_doctor → doctor_selected → requested → accepted → connecting → active → completed
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';
import {
  Patient,
  Doctor,
  Consultation,
  ConsultationStatus,
  CapturedMedia,
  DoctorAvailability,
  Role,
} from '@/types';
import { mockPatients, mockDoctors, mockConsultations } from '@/mock/data';
import { validateStateTransition } from '@/utils/consultationStateMachine';
import { useAuth } from './AuthContext';
import { savePatient, subscribeToPatients } from '@/services/firebase/patientService';
import { subscribeToDoctors } from '@/services/firebase/userService';
import {
  saveConsultation,
  updateConsultation,
  transitionConsultationState,
  completeDoctorConsultation,
  subscribeToConsultations,
} from '@/services/firebase/consultationService';

interface AppContextType {
  patients: Patient[];
  doctors: Doctor[];
  consultations: Consultation[];

  // Patient Actions
  addPatient: (data: Omit<Patient, 'id' | 'patientId' | 'registeredAt'>) => Patient;
  getPatient: (idOrPatientId: string) => Patient | undefined;

  // Doctor Actions
  getDoctor: (doctorId: string) => Doctor | undefined;
  updateDoctorAvailability: (doctorId: string, availability: DoctorAvailability) => void;

  // Consultation Actions & Validated State Transitions
  getConsultation: (consultationId: string) => Consultation | undefined;
  getConsultationByPatientId: (patientId: string) => Consultation | undefined;

  createConsultation: (patientId: string, operatorId?: string) => Consultation;

  selectDoctorForConsultation: (
    consultationId: string,
    primaryDoctorId: string,
    assignedDoctorIds?: string[],
    actorRole?: Role
  ) => { success: boolean; error?: string };

  requestConsultation: (
    consultationId: string,
    actorRole?: Role
  ) => { success: boolean; error?: string };

  acceptConsultation: (
    consultationId: string,
    doctorId: string,
    actorRole?: Role
  ) => { success: boolean; error?: string };

  connectConsultation: (
    consultationId: string,
    actorRole?: Role
  ) => { success: boolean; error?: string };

  startActiveConsultation: (
    consultationId: string,
    actorRole?: Role
  ) => { success: boolean; error?: string };

  endOperatorExamination: (consultationId: string) => void;

  completeConsultation: (
    consultationId: string,
    finalNotes?: {
      clinicalFindings?: string;
      provisionalDiagnosis?: string;
      doctorAdvicePlan?: string;
      consultationNotes?: string;
    },
    actorRole?: Role
  ) => { success: boolean; error?: string };

  updateConsultationNotes: (
    consultationId: string,
    notes: {
      clinicalFindings?: string;
      provisionalDiagnosis?: string;
      doctorAdvicePlan?: string;
      consultationNotes?: string;
    }
  ) => void;

  addDoctorToConsultation: (consultationId: string, doctorId: string) => void;
  addCapturedMedia: (
    consultationId: string,
    media: Omit<CapturedMedia, 'id' | 'timestamp'>
  ) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const [patients, setPatients] = useState<Patient[]>(mockPatients);
  const [doctors, setDoctors] = useState<Doctor[]>(mockDoctors);
  const [consultations, setConsultations] = useState<Consultation[]>(mockConsultations);
  const consultationsRef = React.useRef(consultations);

  React.useEffect(() => {
    consultationsRef.current = consultations;
  }, [consultations]);

  // 1. Synchronize real-time doctors from Firestore
  React.useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeToDoctors((remoteDoctors) => {
      setDoctors(remoteDoctors);
    });
    return () => unsub();
  }, [currentUser]);

  // 2. Synchronize real-time patients from Firestore (with facility scoping for operators)
  React.useEffect(() => {
    if (!currentUser) return;
    const operatorFacilityId = currentUser?.facilityId || (currentUser?.role === 'operator' ? 'PHC-RAMPUR-01' : undefined);
    const unsub = subscribeToPatients(
      {
        facilityId: currentUser?.role === 'operator' ? operatorFacilityId : undefined,
        role: currentUser?.role,
      },
      (remotePatients) => {
        setPatients(remotePatients);
      }
    );
    return () => unsub();
  }, [currentUser?.role, currentUser?.facility, currentUser?.facilityId, currentUser]);

  // 3. Synchronize real-time consultations from Firestore
  React.useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeToConsultations((remoteConsultations) => {
      setConsultations(remoteConsultations);
    });
    return () => unsub();
  }, [currentUser]);

  const updateConsultations = (
    updater: (prev: Consultation[]) => Consultation[]
  ) => {
    const next = updater(consultationsRef.current);
    consultationsRef.current = next;
    setConsultations(next);
  };

  const generatePatientId = (): string => {
    const nextNum = patients.length + 1;
    return `PAT-2026-${String(nextNum).padStart(3, '0')}`;
  };

  const addPatient = (
    data: Omit<Patient, 'id' | 'patientId' | 'registeredAt'>
  ): Patient => {
    const now = new Date().toISOString();
    const newPatient: Patient = {
      ...data,
      id: `pat-${Date.now()}`,
      patientId: generatePatientId(),
      registeredAt: now,
      arrivalDateTime: data.arrivalDateTime || now,
    };
    setPatients((prev) => [newPatient, ...prev]);

    const operatorFacilityId = currentUser?.facilityId || 'PHC-RAMPUR-01';

    // Persist patient to Firestore collection patients/{patientId}
    savePatient(newPatient, {
      uid: currentUser?.id,
      facilityId: operatorFacilityId,
      facilityName: currentUser?.facility || newPatient.facility,
    }).catch((err) => console.warn('[AppContext] Failed to save patient to Firestore:', err));

    // Automatically initialize a consultation in 'waiting_for_doctor' state
    const nextNum = consultations.length + 101;
    const newConsultation: Consultation = {
      id: `con-${Date.now()}`,
      consultationNumber: `CON-2026-${nextNum}`,
      patientId: newPatient.id,
      primaryDoctorId: '',
      assignedDoctorIds: [],
      operatorId: currentUser?.id || 'user-op-01',
      status: 'waiting_for_doctor',
      createdAt: new Date().toISOString(),
      clinicalFindings: '',
      provisionalDiagnosis: '',
      doctorAdvicePlan: '',
      consultationNotes: '',
      capturedMedia: [],
    };
    updateConsultations((prev) => [newConsultation, ...prev]);

    // Persist consultation to Firestore collection consultations/{consultationId}
    saveConsultation(newConsultation, {
      facilityId: operatorFacilityId,
      facilityName: currentUser?.facility || newPatient.facility,
      operatorName: currentUser?.name || 'PHC Operator',
    }).catch((err) => console.warn('[AppContext] Failed to save consultation to Firestore:', err));

    return newPatient;
  };

  const getPatient = (idOrPatientId: string): Patient | undefined => {
    return patients.find(
      (p) => p.id === idOrPatientId || p.patientId === idOrPatientId
    );
  };

  const getDoctor = (doctorId: string): Doctor | undefined => {
    return doctors.find((d) => d.id === doctorId);
  };

  const updateDoctorAvailability = (
    doctorId: string,
    availability: DoctorAvailability
  ) => {
    setDoctors((prev) =>
      prev.map((d) => (d.id === doctorId ? { ...d, availability } : d))
    );
  };

  const getConsultation = (consultationId: string): Consultation | undefined => {
    return consultationsRef.current.find((c) => c.id === consultationId);
  };

  const getConsultationByPatientId = (patientId: string): Consultation | undefined => {
    // Return active or most recent consultation
    return consultationsRef.current.find((c) => c.patientId === patientId);
  };

  /**
   * Initializes a consultation for an existing patient in 'waiting_for_doctor' state.
   */
  const createConsultation = (
    patientId: string,
    operatorId = currentUser?.id || 'user-op-01'
  ): Consultation => {
    const existing = consultationsRef.current.find(
      (c) => c.patientId === patientId && c.status !== 'completed'
    );
    if (existing) {
      return existing;
    }

    const nextNum = consultations.length + 101;
    const newConsultation: Consultation = {
      id: `con-${Date.now()}`,
      consultationNumber: `CON-2026-${nextNum}`,
      patientId,
      primaryDoctorId: '',
      assignedDoctorIds: [],
      operatorId,
      status: 'waiting_for_doctor',
      createdAt: new Date().toISOString(),
      clinicalFindings: '',
      provisionalDiagnosis: '',
      doctorAdvicePlan: '',
      consultationNotes: '',
      capturedMedia: [],
    };

    updateConsultations((prev) => [newConsultation, ...prev]);

    saveConsultation(newConsultation, {
      facilityId: currentUser?.facilityId || 'PHC-RAMPUR-01',
      facilityName: currentUser?.facility,
      operatorName: currentUser?.name,
    }).catch((err) => console.warn('[AppContext] Failed to save consultation to Firestore:', err));

    return newConsultation;
  };

  /**
   * TRANSITION 1: waiting_for_doctor → doctor_selected
   */
  const selectDoctorForConsultation = (
    consultationId: string,
    primaryDoctorId: string,
    assignedDoctorIds: string[] = [primaryDoctorId],
    actorRole: Role = 'operator'
  ): { success: boolean; error?: string } => {
    const target = consultationsRef.current.find((c) => c.id === consultationId);
    if (!target) return { success: false, error: 'Consultation not found' };

    // Role verification
    if (actorRole && actorRole !== 'operator') {
      return {
        success: false,
        error: 'Safety Rule Violation: Only a PHC Operator can select doctors.',
      };
    }

    const updatedAssigned =
      assignedDoctorIds.length > 0 && assignedDoctorIds.includes(primaryDoctorId)
        ? assignedDoctorIds
        : [primaryDoctorId, ...assignedDoctorIds.filter((id) => id !== primaryDoctorId)];

    // If already in 'doctor_selected', allow updating the primary and assigned doctors
    if (target.status === 'doctor_selected') {
      updateConsultations((prev) =>
        prev.map((c) =>
          c.id === consultationId
            ? {
                ...c,
                primaryDoctorId,
                assignedDoctorIds: updatedAssigned,
              }
            : c
        )
      );
      updateConsultation(
        consultationId,
        {
          primaryDoctorUid: primaryDoctorId,
          assignedDoctorUids: updatedAssigned,
        },
        actorRole
      ).catch((err) => console.warn('[AppContext] Update doctor in selected state warn:', err));
      return { success: true };
    }

    const validation = validateStateTransition(
      target.status,
      'doctor_selected',
      actorRole
    );
    if (!validation.allowed) {
      return { success: false, error: validation.error };
    }

    updateConsultations((prev) =>
      prev.map((c) =>
        c.id === consultationId
          ? {
              ...c,
              status: 'doctor_selected',
              primaryDoctorId,
              assignedDoctorIds: updatedAssigned,
            }
          : c
      )
    );

    transitionConsultationState(
      consultationId,
      'doctor_selected',
      actorRole,
      {
        primaryDoctorUid: primaryDoctorId,
        assignedDoctorUids: updatedAssigned,
      },
      'waiting_for_doctor'
    ).catch((err) => console.warn('[AppContext] selectDoctor transition Firestore warn:', err));

    return { success: true };
  };

  /**
   * TRANSITION 2: doctor_selected → requested
   */
  const requestConsultation = (
    consultationId: string,
    actorRole: Role = 'operator'
  ): { success: boolean; error?: string } => {
    const target = consultationsRef.current.find((c) => c.id === consultationId);
    if (!target) return { success: false, error: 'Consultation not found' };

    if (target.status === 'requested') {
      return { success: true };
    }

    const validation = validateStateTransition(
      target.status,
      'requested',
      actorRole
    );
    if (!validation.allowed) {
      return { success: false, error: validation.error };
    }

    updateConsultations((prev) =>
      prev.map((c) =>
        c.id === consultationId
          ? { ...c, status: 'requested' as ConsultationStatus }
          : c
      )
    );

    transitionConsultationState(
      consultationId,
      'requested',
      actorRole,
      undefined,
      'doctor_selected'
    ).catch((err) =>
      console.warn('[AppContext] requestConsultation transition Firestore warn:', err)
    );

    return { success: true };
  };

  /**
   * TRANSITION 3: requested → accepted
   */
  const acceptConsultation = (
    consultationId: string,
    doctorId: string,
    actorRole: Role = 'doctor'
  ): { success: boolean; error?: string } => {
    const target = consultationsRef.current.find((c) => c.id === consultationId);
    if (!target) return { success: false, error: 'Consultation not found' };

    if (target.status === 'accepted') {
      return { success: true };
    }

    const validation = validateStateTransition(
      target.status,
      'accepted',
      actorRole
    );
    if (!validation.allowed) {
      return { success: false, error: validation.error };
    }

    const assigned = target.assignedDoctorIds.includes(doctorId)
      ? target.assignedDoctorIds
      : [...target.assignedDoctorIds, doctorId];

    updateConsultations((prev) =>
      prev.map((c) => {
        if (c.id !== consultationId) return c;
        return {
          ...c,
          status: 'accepted' as ConsultationStatus,
          primaryDoctorId: c.primaryDoctorId || doctorId,
          assignedDoctorIds: assigned,
        };
      })
    );

    transitionConsultationState(
      consultationId,
      'accepted',
      actorRole,
      {
        primaryDoctorUid: target.primaryDoctorId || doctorId,
        assignedDoctorUids: assigned,
      },
      'requested'
    ).catch((err) =>
      console.warn('[AppContext] acceptConsultation transition Firestore warn:', err)
    );

    return { success: true };
  };

  /**
   * TRANSITION 4: accepted → connecting
   */
  const connectConsultation = (
    consultationId: string,
    actorRole?: Role
  ): { success: boolean; error?: string } => {
    const target = consultationsRef.current.find((c) => c.id === consultationId);
    if (!target) return { success: false, error: 'Consultation not found' };

    if (target.status === 'connecting') {
      return { success: true };
    }

    const validation = validateStateTransition(
      target.status,
      'connecting',
      actorRole
    );
    if (!validation.allowed) {
      return { success: false, error: validation.error };
    }

    updateConsultations((prev) =>
      prev.map((c) =>
        c.id === consultationId
          ? { ...c, status: 'connecting' as ConsultationStatus }
          : c
      )
    );

    transitionConsultationState(
      consultationId,
      'connecting',
      actorRole,
      undefined,
      'accepted'
    ).catch((err) =>
      console.warn('[AppContext] connectConsultation transition Firestore warn:', err)
    );

    return { success: true };
  };

  /**
   * TRANSITION 5: connecting → active
   */
  const startActiveConsultation = (
    consultationId: string,
    actorRole?: Role
  ): { success: boolean; error?: string } => {
    const target = consultationsRef.current.find((c) => c.id === consultationId);
    if (!target) return { success: false, error: 'Consultation not found' };

    if (target.status === 'active') {
      return { success: true };
    }

    const validation = validateStateTransition(
      target.status,
      'active',
      actorRole
    );
    if (!validation.allowed) {
      return { success: false, error: validation.error };
    }

    updateConsultations((prev) =>
      prev.map((c) =>
        c.id === consultationId
          ? {
              ...c,
              status: 'active' as ConsultationStatus,
              startedAt: c.startedAt || new Date().toISOString(),
            }
          : c
      )
    );

    transitionConsultationState(
      consultationId,
      'active',
      actorRole,
      undefined,
      'connecting'
    ).catch((err) =>
      console.warn('[AppContext] startActiveConsultation transition Firestore warn:', err)
    );

    return { success: true };
  };

  /**
   * Operator finishes local examination session.
   * NOTE: This does NOT modify status to 'completed'.
   */
  const endOperatorExamination = (consultationId: string) => {
    updateConsultations((prev) =>
      prev.map((c) =>
        c.id === consultationId
          ? { ...c, examinationEndedByOperator: true }
          : c
      )
    );

    const target = consultationsRef.current.find((c) => c.id === consultationId);
    if (target) {
      updateConsultation(
        consultationId,
        { examinationEndedByOperator: true },
        'operator'
      ).catch((err) =>
        console.warn('[AppContext] endOperatorExamination Firestore warn:', err)
      );
    }
  };

  /**
   * TRANSITION 6: active → completed
   * ONLY ENT Doctor can complete the consultation, and ONLY when in 'active' state.
   */
  const completeConsultation = (
    consultationId: string,
    finalNotes?: {
      clinicalFindings?: string;
      provisionalDiagnosis?: string;
      doctorAdvicePlan?: string;
      consultationNotes?: string;
    },
    actorRole: Role = 'doctor'
  ): { success: boolean; error?: string } => {
    const target = consultationsRef.current.find((c) => c.id === consultationId);
    if (!target) return { success: false, error: 'Consultation not found' };

    const validation = validateStateTransition(
      target.status,
      'completed',
      actorRole
    );
    if (!validation.allowed) {
      return { success: false, error: validation.error };
    }

    updateConsultations((prev) =>
      prev.map((c) => {
        if (c.id !== consultationId) return c;
        return {
          ...c,
          status: 'completed' as ConsultationStatus,
          completedAt: new Date().toISOString(),
          clinicalFindings: finalNotes?.clinicalFindings ?? c.clinicalFindings,
          provisionalDiagnosis: finalNotes?.provisionalDiagnosis ?? c.provisionalDiagnosis,
          doctorAdvicePlan: finalNotes?.doctorAdvicePlan ?? c.doctorAdvicePlan,
          consultationNotes: finalNotes?.consultationNotes ?? c.consultationNotes,
        };
      })
    );

    completeDoctorConsultation(
      consultationId,
      currentUser?.id || target.primaryDoctorId || 'doc-01',
      finalNotes || {},
      actorRole
    ).catch((err) =>
      console.warn('[AppContext] completeDoctorConsultation Firestore warn:', err)
    );

    return { success: true };
  };

  const updateConsultationNotes = (
    consultationId: string,
    notes: {
      clinicalFindings?: string;
      provisionalDiagnosis?: string;
      doctorAdvicePlan?: string;
      consultationNotes?: string;
    }
  ) => {
    setConsultations((prev) =>
      prev.map((c) =>
        c.id === consultationId
          ? {
              ...c,
              clinicalFindings:
                notes.clinicalFindings !== undefined
                  ? notes.clinicalFindings
                  : c.clinicalFindings,
              provisionalDiagnosis:
                notes.provisionalDiagnosis !== undefined
                  ? notes.provisionalDiagnosis
                  : c.provisionalDiagnosis,
              doctorAdvicePlan:
                notes.doctorAdvicePlan !== undefined
                  ? notes.doctorAdvicePlan
                  : c.doctorAdvicePlan,
              consultationNotes:
                notes.consultationNotes !== undefined
                  ? notes.consultationNotes
                  : c.consultationNotes,
            }
          : c
      )
    );

    updateConsultation(consultationId, notes, currentUser?.role).catch((err) =>
      console.warn('[AppContext] updateConsultationNotes Firestore warn:', err)
    );
  };

  const addDoctorToConsultation = (consultationId: string, doctorId: string) => {
    setConsultations((prev) =>
      prev.map((c) => {
        if (c.id !== consultationId) return c;
        if (c.assignedDoctorIds.includes(doctorId)) return c;
        return {
          ...c,
          assignedDoctorIds: [...c.assignedDoctorIds, doctorId],
        };
      })
    );

    const updated = consultationsRef.current.find((c) => c.id === consultationId);
    if (updated) {
      updateConsultation(
        consultationId,
        { assignedDoctorUids: [...updated.assignedDoctorIds, doctorId] },
        currentUser?.role
      ).catch((err) =>
        console.warn('[AppContext] addDoctorToConsultation Firestore warn:', err)
      );
    }
  };

  const addCapturedMedia = (
    consultationId: string,
    media: Omit<CapturedMedia, 'id' | 'timestamp'>
  ) => {
    const newMedia: CapturedMedia = {
      ...media,
      id: `med-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    setConsultations((prev) =>
      prev.map((c) => {
        if (c.id !== consultationId) return c;
        return {
          ...c,
          capturedMedia: [...(c.capturedMedia || []), newMedia],
        };
      })
    );

    const updated = consultationsRef.current.find((c) => c.id === consultationId);
    if (updated) {
      updateConsultation(
        consultationId,
        { capturedMedia: [...(updated.capturedMedia || []), newMedia] },
        currentUser?.role
      ).catch((err) => console.warn('[AppContext] addCapturedMedia Firestore warn:', err));
    }
  };

  return (
    <AppContext.Provider
      value={{
        patients,
        doctors,
        consultations,
        addPatient,
        getPatient,
        getDoctor,
        updateDoctorAvailability,
        getConsultation,
        getConsultationByPatientId,
        createConsultation,
        selectDoctorForConsultation,
        requestConsultation,
        acceptConsultation,
        connectConsultation,
        startActiveConsultation,
        endOperatorExamination,
        completeConsultation,
        updateConsultationNotes,
        addDoctorToConsultation,
        addCapturedMedia,
      }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
