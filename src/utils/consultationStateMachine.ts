/**
 * Strict Consultation State Machine for SMART ENT ENDOSCOPE
 *
 * Enforces the exact sequential lifecycle:
 * waiting_for_doctor → doctor_selected → requested → accepted → connecting → active → completed
 *
 * Disallows:
 * - Skipping states
 * - Moving backward
 * - Operator directly completing a consultation
 * - Doctor completing a consultation before reaching 'active'
 * - Arbitrary status modification
 */

import { ConsultationStatus, Role } from '@/types';

export const ALLOWED_TRANSITIONS: Record<ConsultationStatus, ConsultationStatus | null> = {
  waiting_for_doctor: 'doctor_selected',
  doctor_selected: 'requested',
  requested: 'accepted',
  accepted: 'connecting',
  connecting: 'active',
  active: 'completed',
  completed: null, // Terminal state
};

export interface TransitionValidationResult {
  allowed: boolean;
  error?: string;
}

/**
 * Validates whether a state transition is legal according to clinical safety rules.
 */
export function validateStateTransition(
  currentStatus: ConsultationStatus,
  targetStatus: ConsultationStatus,
  actorRole?: Role
): TransitionValidationResult {
  // 1. Check terminal state
  if (currentStatus === 'completed') {
    return {
      allowed: false,
      error: 'Consultation is already COMPLETED. No further state changes are permitted.',
    };
  }

  // 2. Check exact sequential transition
  const expectedNextStatus = ALLOWED_TRANSITIONS[currentStatus];
  if (!expectedNextStatus) {
    return {
      allowed: false,
      error: `State '${currentStatus}' has no permitted subsequent transitions.`,
    };
  }

  if (targetStatus !== expectedNextStatus) {
    return {
      allowed: false,
      error: `Illegal state transition from '${currentStatus}' to '${targetStatus}'. Allowed next state is '${expectedNextStatus}'. Skipping or reversing states is not permitted.`,
    };
  }

  // 3. Clinical Role Authorization Checks
  if (targetStatus === 'completed') {
    // Only ENT Doctor may complete the consultation
    if (actorRole && actorRole !== 'doctor') {
      return {
        allowed: false,
        error: 'Safety Rule Violation: Only an authenticated ENT Doctor can complete a clinical consultation.',
      };
    }
    // Consultation MUST be in active state (guaranteed by sequence check, but enforced explicitly)
    if (currentStatus !== 'active') {
      return {
        allowed: false,
        error: "Safety Rule Violation: Consultation must be in 'active' state before it can be completed.",
      };
    }
  }

  if (targetStatus === 'accepted') {
    // Only Doctor can accept a consultation
    if (actorRole && actorRole !== 'doctor') {
      return {
        allowed: false,
        error: 'Safety Rule Violation: Only an ENT Doctor can accept a consultation request.',
      };
    }
  }

  if (targetStatus === 'doctor_selected' || targetStatus === 'requested') {
    // Only Operator at PHC selects doctor and requests session
    if (actorRole && actorRole !== 'operator') {
      return {
        allowed: false,
        error: 'Safety Rule Violation: Only a PHC Operator can select doctors or request consultations.',
      };
    }
  }

  return { allowed: true };
}
