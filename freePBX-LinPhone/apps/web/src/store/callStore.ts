import { create } from 'zustand';
import { SIPClient, CallSession } from '@smart-sip/sip-core';
import { SipConfig } from '@smart-sip/shared';

interface CallStore {
  sipClient: SIPClient | null;
  activeCalls: Map<string, CallSession>;
  currentCall: CallSession | null;
  isConnected: boolean;
  isMuted: boolean;
  isHeld: boolean;
  isVideoEnabled: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isConference: boolean;
  conferenceParticipants: string[];

  // Actions
  initializeSIP: (config: SipConfig) => Promise<void>;
  makeCall: (target: string) => Promise<void>;
  answerCall: (sessionId: string) => Promise<void>;
  hangupCall: (sessionId: string) => Promise<void>;
  toggleMute: () => void;
  toggleHold: () => void;
  toggleVideo: () => void;
  sendDTMF: (tone: string) => void;
  startConference: (sessionIds: string[]) => Promise<string>;
  addToConference: (conferenceSessionId: string, participantUri: string) => Promise<string>;
  removeFromConference: (conferenceSessionId: string, participantSessionId: string) => Promise<void>;
  endConference: (conferenceSessionId: string) => Promise<void>;
  updateStreams: () => void;
  disconnect: () => Promise<void>;
}

export const useCallStore = create<CallStore>((set, get) => ({
  sipClient: null,
  activeCalls: new Map(),
  currentCall: null,
  isConnected: false,
  isMuted: false,
  isHeld: false,
  isVideoEnabled: true,
  localStream: null,
  remoteStream: null,
  isConference: false,
  conferenceParticipants: [],

  initializeSIP: async (config: SipConfig) => {
    const client = new SIPClient(config);

    // Setup event listeners
    client.on('connected', () => {
      console.log('SIP connected');
      set({ isConnected: true });
    });

    client.on('registered', () => {
      console.log('SIP registered');
    });

    client.on('incomingCall', (data) => {
      console.log('Incoming call:', data);
      const calls = get().activeCalls;
      const session = client.getSession(data.sessionId);
      if (session) {
        calls.set(data.sessionId, session);
        set({ activeCalls: new Map(calls), currentCall: session });
      }
    });

    client.on('callEstablished', (data) => {
      console.log('Call established:', data);
      const session = client.getSession(data.sessionId);
      if (session) {
        set({ currentCall: session });
        // Update video streams when call is established
        setTimeout(() => get().updateStreams(), 500);
      }
    });

    client.on('callEnded', (data) => {
      console.log('Call ended:', data);
      const calls = get().activeCalls;
      calls.delete(data.sessionId);
      set({
        activeCalls: new Map(calls),
        currentCall: calls.size > 0 ? Array.from(calls.values())[0] : null
      });
    });

    await client.connect();
    set({ sipClient: client });
  },

  makeCall: async (target: string) => {
    const { sipClient } = get();
    if (!sipClient) throw new Error('SIP client not initialized');

    const sessionId = await sipClient.call(target);
    const session = sipClient.getSession(sessionId);
    if (session) {
      const calls = get().activeCalls;
      calls.set(sessionId, session);
      set({ activeCalls: new Map(calls), currentCall: session });
    }
  },

  answerCall: async (sessionId: string) => {
    const { sipClient } = get();
    if (!sipClient) throw new Error('SIP client not initialized');

    await sipClient.answer(sessionId);
  },

  hangupCall: async (sessionId: string) => {
    const { sipClient } = get();
    if (!sipClient) throw new Error('SIP client not initialized');

    await sipClient.hangup(sessionId);
  },

  toggleMute: () => {
    const { sipClient, currentCall, isMuted } = get();
    if (!sipClient || !currentCall) return;

    if (isMuted) {
      sipClient.unmute(currentCall.id);
    } else {
      sipClient.mute(currentCall.id);
    }
    set({ isMuted: !isMuted });
  },

  toggleHold: async () => {
    const { sipClient, currentCall, isHeld } = get();
    if (!sipClient || !currentCall) return;

    if (isHeld) {
      await sipClient.unhold(currentCall.id);
    } else {
      await sipClient.hold(currentCall.id);
    }
    set({ isHeld: !isHeld });
  },

  toggleVideo: () => {
    const { sipClient, currentCall, isVideoEnabled } = get();
    if (!sipClient || !currentCall) return;

    if (isVideoEnabled) {
      sipClient.disableVideo(currentCall.id);
    } else {
      sipClient.enableVideo(currentCall.id);
    }
    set({ isVideoEnabled: !isVideoEnabled });
    get().updateStreams();
  },

  startConference: async (sessionIds: string[]) => {
    const { sipClient } = get();
    if (!sipClient) throw new Error('SIP client not initialized');

    const conferenceId = await sipClient.startConference(sessionIds);
    set({ 
      isConference: true,
      conferenceParticipants: sessionIds
    });
    return conferenceId;
  },

  addToConference: async (conferenceSessionId: string, participantUri: string) => {
    const { sipClient } = get();
    if (!sipClient) throw new Error('SIP client not initialized');

    const sessionId = await sipClient.addToConference(conferenceSessionId, participantUri);
    const participants = get().conferenceParticipants;
    set({ conferenceParticipants: [...participants, sessionId] });
    return sessionId;
  },

  removeFromConference: async (conferenceSessionId: string, participantSessionId: string) => {
    const { sipClient } = get();
    if (!sipClient) throw new Error('SIP client not initialized');

    await sipClient.removeFromConference(conferenceSessionId, participantSessionId);
    const participants = get().conferenceParticipants.filter(id => id !== participantSessionId);
    set({ conferenceParticipants: participants });
  },

  endConference: async (conferenceSessionId: string) => {
    const { sipClient } = get();
    if (!sipClient) throw new Error('SIP client not initialized');

    await sipClient.endConference(conferenceSessionId);
    set({ 
      isConference: false,
      conferenceParticipants: []
    });
  },

  updateStreams: () => {
    const { sipClient, currentCall } = get();
    if (!sipClient || !currentCall) return;

    const localStream = sipClient.getLocalStream(currentCall.id);
    const remoteStream = sipClient.getRemoteStream(currentCall.id);
    
    set({ 
      localStream,
      remoteStream
    });
  },

  sendDTMF: (tone: string) => {
    const { sipClient, currentCall } = get();
    if (!sipClient || !currentCall) return;

    sipClient.sendDTMF(currentCall.id, tone);
  },

  disconnect: async () => {
    const { sipClient } = get();
    if (!sipClient) return;

    await sipClient.disconnect();
    set({
      sipClient: null,
      activeCalls: new Map(),
      currentCall: null,
      isConnected: false
    });
  }
}));
