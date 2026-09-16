/**
 * Firestore WebRTC Signaling Service for visioENT
 *
 * Implements out-of-band SDP offer/answer exchange and ICE candidate trickle
 * under `consultations/{consultationId}/webrtc/session`.
 *
 * Caller: PHC Operator
 * Callee: ENT Doctor
 */

import {
  doc,
  setDoc,
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/services/firebase/firebase';
import { webrtcService } from './webrtcService';
import { Role } from '@/types';

class SignalingService {
  private activeConsultationId: string | null = null;
  private unsubscribers: Unsubscribe[] = [];
  private hasSetRemoteAnswer = false;
  private hasSetRemoteOffer = false;

  public async startSignaling(consultationId: string, role: Role, userUid: string): Promise<void> {
    this.stopSignaling();
    this.activeConsultationId = consultationId;
    this.hasSetRemoteAnswer = false;
    this.hasSetRemoteOffer = false;

    if (!db || !consultationId) return;

    const pc = webrtcService.getPeerConnection();
    if (!pc) return;

    const sessionDocRef = doc(db, 'consultations', consultationId, 'webrtc', 'session');
    const callerCandidatesCol = collection(db, 'consultations', consultationId, 'webrtc', 'session', 'callerCandidates');
    const calleeCandidatesCol = collection(db, 'consultations', consultationId, 'webrtc', 'session', 'calleeCandidates');

    // Exchange local ICE candidates
    pc.onicecandidate = async (event: any) => {
      if (event.candidate) {
        try {
          const candidateData = event.candidate.toJSON();
          const targetCol = role === 'operator' ? callerCandidatesCol : calleeCandidatesCol;
          await addDoc(targetCol, {
            ...candidateData,
            senderRole: role,
            createdAt: serverTimestamp(),
          });
        } catch (err) {
          console.warn('Failed to post ICE candidate to Firestore:', err);
        }
      }
    };

    if (role === 'operator') {
      // Operator: Create Offer
      try {
        const offer = await webrtcService.createOffer();
        await setDoc(sessionDocRef, {
          offer: {
            type: offer.type,
            sdp: offer.sdp,
          },
          answer: null,
          operatorUid: userUid,
          sessionState: 'offered',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true });

        // Listen for Doctor's Answer
        const unsubSession = onSnapshot(sessionDocRef, async (snap) => {
          const data = snap.data();
          if (data && data.answer && !this.hasSetRemoteAnswer) {
            this.hasSetRemoteAnswer = true;
            try {
              await webrtcService.setRemoteDescription(data.answer);
            } catch (err) {
              console.warn('Error setting remote answer:', err);
            }
          }
        });
        this.unsubscribers.push(unsubSession);

        // Listen for Doctor's (Callee) ICE candidates
        const unsubCandidates = onSnapshot(calleeCandidatesCol, (snapshot) => {
          snapshot.docChanges().forEach(async (change) => {
            if (change.type === 'added') {
              const candidate = change.doc.data();
              await webrtcService.addIceCandidate(candidate);
            }
          });
        });
        this.unsubscribers.push(unsubCandidates);
      } catch (err) {
        console.warn('Operator signaling offer error:', err);
      }
    } else {
      // Doctor: Listen for Operator's Offer, then produce Answer
      const unsubSession = onSnapshot(sessionDocRef, async (snap) => {
        const data = snap.data();
        if (data && data.offer && !this.hasSetRemoteOffer) {
          this.hasSetRemoteOffer = true;
          try {
            await webrtcService.setRemoteDescription(data.offer);
            const answer = await webrtcService.createAnswer();
            await setDoc(sessionDocRef, {
              answer: {
                type: answer.type,
                sdp: answer.sdp,
              },
              doctorId: userUid,
              sessionState: 'connected',
              updatedAt: serverTimestamp(),
            }, { merge: true });
          } catch (err) {
            console.warn('Doctor signaling answer error:', err);
          }
        }
      });
      this.unsubscribers.push(unsubSession);

      // Listen for Operator's (Caller) ICE candidates
      const unsubCandidates = onSnapshot(callerCandidatesCol, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === 'added') {
            const candidate = change.doc.data();
            await webrtcService.addIceCandidate(candidate);
          }
        });
      });
      this.unsubscribers.push(unsubCandidates);
    }
  }

  public stopSignaling(): void {
    this.unsubscribers.forEach((fn) => {
      try {
        fn();
      } catch {}
    });
    this.unsubscribers = [];
    this.activeConsultationId = null;
    this.hasSetRemoteAnswer = false;
    this.hasSetRemoteOffer = false;
  }
}

export const signalingService = new SignalingService();
