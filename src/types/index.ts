/**
 * Core domain types for SMART ENT ENDOSCOPE (CuraXion)
 */

export type Role = 'operator' | 'doctor';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  facility: string;
  facilityId?: string;
  specialty?: string;
  qualification?: string;
  phone?: string;
}

export interface ENTComplaint {
  earPain: boolean;
  hearingDifficulty: boolean;
  earDischarge: boolean;
  tinnitus: boolean;
  vertigo: boolean;
  noseBlockage: boolean;
  nasalDischarge: boolean;
  epistaxis: boolean;
  facialPain: boolean;
  throatPain: boolean;
  difficultySwallowing: boolean;
  foreignBodySensation: boolean;
  hoarseness: boolean;
  other: boolean;
  otherDetails?: string;
  duration: string;
  severity: 'mild' | 'moderate' | 'severe' | 'acute';
  associatedSymptoms: string;
  additionalNotes: string;
}

export interface RelevantHistory {
  previousEntProblems: string;
  previousEntSurgery: string;
  currentMedication: string;
  knownAllergies: string;
  relevantMedicalHistory: string;
}

export interface Patient {
  id: string;
  patientId: string; // e.g. "PAT-2026-001"
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  contactNumber: string;
  facility: string;
  registeredAt: string;
  arrivalDateTime?: string;
  entComplaint: ENTComplaint;
  relevantHistory: RelevantHistory;
  operatorNotes: string;
}

export type DoctorAvailability = 'available' | 'busy' | 'offline';

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  qualification: string;
  facility: string;
  availability: DoctorAvailability;
  experienceYears: number;
  contactNumber?: string;
  email?: string;
  medicalDegree?: string;
  additionalQualification?: string;
  subSpecialization?: string;
  currentHospital?: string;
  designation?: string;
  consultationMode?: 'In-person' | 'Teleconsultation' | 'Both';
  languages?: string[];
  profilePhoto?: string;
}

export type ConsultationStatus =
  | 'waiting_for_doctor'
  | 'doctor_selected'
  | 'requested'
  | 'accepted'
  | 'connecting'
  | 'active'
  | 'completed';

export interface CapturedMedia {
  id: string;
  uri: string;
  timestamp: string;
  type: 'image' | 'video';
  capturedBy: 'operator' | 'doctor';
  label?: string;
  notes?: string;
}

export interface Consultation {
  id: string;
  consultationNumber: string; // e.g. "CON-1001"
  patientId: string;
  primaryDoctorId: string;
  assignedDoctorIds: string[];
  operatorId: string;
  status: ConsultationStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  examinationEndedByOperator?: boolean;
  clinicalFindings?: string;
  provisionalDiagnosis?: string;
  doctorAdvicePlan?: string;
  consultationNotes?: string;
  capturedMedia?: CapturedMedia[];
}

export interface ConsultationMessage {
  id: string;
  consultationId: string;
  senderUid: string;
  senderName: string;
  senderRole: Role;
  text: string;
  createdAt: string;
  status?: 'sent' | 'delivered';
}

