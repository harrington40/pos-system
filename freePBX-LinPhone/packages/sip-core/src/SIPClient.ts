import { UserAgent, Registerer, Inviter, Invitation, Session, SessionState } from 'sip.js';
import { EventEmitter } from 'events';
import { SipConfig, CallState, CallDirection } from '@smart-sip/shared';

export interface CallSession {
  id: string;
  session: Session;
  direction: CallDirection;
  state: CallState;
  remoteUri: string;
  localUri: string;
  startTime: Date;
  muted: boolean;
  held: boolean;
  videoEnabled: boolean;
  localStream?: MediaStream;
  remoteStream?: MediaStream;
  isConference?: boolean;
  conferenceParticipants?: string[];
}

export class SIPClient extends EventEmitter {
  private userAgent: UserAgent | null = null;
  private registerer: Registerer | null = null;
  private sessions: Map<string, CallSession> = new Map();
  private config: SipConfig;
  private isRegistered: boolean = false;

  constructor(config: SipConfig) {
    super();
    this.config = config;
  }

  /**
   * Initialize and connect the SIP client
   */
  async connect(): Promise<void> {
    try {
      // Create UserAgent
      this.userAgent = new UserAgent({
        uri: UserAgent.makeURI(this.config.uri),
        transportOptions: {
          server: this.config.wsServer
        },
        authorizationUsername: this.config.username,
        authorizationPassword: this.config.password,
        displayName: this.config.displayName || 'Smart SIP Client',
        userAgentString: 'SmartSIP/1.0',
        sessionDescriptionHandlerFactoryOptions: {
          constraints: {
            audio: true,
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 }
            }
          },
          peerConnectionOptions: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' }
            ]
          }
        }
      });

      // Setup UserAgent event handlers
      this.setupUserAgentHandlers();

      // Start UserAgent
      await this.userAgent.start();
      
      this.emit('connected');
      
      // Register
      await this.register();
      
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Register with SIP server
   */
  async register(): Promise<void> {
    if (!this.userAgent) {
      throw new Error('UserAgent not initialized');
    }

    this.registerer = new Registerer(this.userAgent, {
      expires: 600
    });

    // Setup registerer event handlers
    this.registerer.stateChange.addListener((state) => {
      if (state === 'Registered') {
        this.isRegistered = true;
        this.emit('registered');
      } else if (state === 'Unregistered') {
        this.isRegistered = false;
        this.emit('unregistered');
      }
    });

    await this.registerer.register();
  }

  /**
   * Unregister from SIP server
   */
  async unregister(): Promise<void> {
    if (this.registerer) {
      await this.registerer.unregister();
      this.registerer.dispose();
      this.registerer = null;
    }
  }

  /**
   * Make an outbound call
   */
  async call(target: string, extraHeaders?: string[]): Promise<string> {
    if (!this.userAgent) {
      throw new Error('UserAgent not initialized');
    }

    const targetUri = UserAgent.makeURI(target);
    if (!targetUri) {
      throw new Error('Invalid target URI');
    }

    const inviter = new Inviter(this.userAgent, targetUri, {
      sessionDescriptionHandlerOptions: {
        constraints: { 
          audio: true, 
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          }
        }
      },
      extraHeaders
    });

    const sessionId = this.generateSessionId();
    const callSession: CallSession = {
      id: sessionId,
      session: inviter,
      direction: CallDirection.OUTBOUND,
      state: CallState.CONNECTING,
      remoteUri: target,
      localUri: this.config.uri,
      startTime: new Date(),
      muted: false,
      held: false,
      videoEnabled: true,
      isConference: false,
      conferenceParticipants: []
    };

    this.sessions.set(sessionId, callSession);
    this.setupSessionHandlers(inviter, sessionId);

    try {
      await inviter.invite();
      this.updateCallState(sessionId, CallState.RINGING);
      this.emit('callInitiated', { sessionId, target });
      return sessionId;
    } catch (error) {
      this.updateCallState(sessionId, CallState.FAILED);
      this.emit('callFailed', { sessionId, error });
      throw error;
    }
  }

  /**
   * Answer an incoming call
   */
  async answer(sessionId: string): Promise<void> {
    const callSession = this.sessions.get(sessionId);
    if (!callSession) {
      throw new Error('Session not found');
    }

    const invitation = callSession.session as Invitation;
    try {
      await invitation.accept();
      this.updateCallState(sessionId, CallState.ACTIVE);
      this.emit('callAnswered', { sessionId });
    } catch (error) {
      this.emit('error', { sessionId, error });
      throw error;
    }
  }

  /**
   * Reject/decline an incoming call
   */
  async decline(sessionId: string): Promise<void> {
    const callSession = this.sessions.get(sessionId);
    if (!callSession) {
      throw new Error('Session not found');
    }

    const invitation = callSession.session as Invitation;
    await invitation.reject();
    this.updateCallState(sessionId, CallState.ENDED);
    this.sessions.delete(sessionId);
    this.emit('callEnded', { sessionId });
  }

  /**
   * Hang up / end a call
   */
  async hangup(sessionId: string): Promise<void> {
    const callSession = this.sessions.get(sessionId);
    if (!callSession) {
      throw new Error('Session not found');
    }

    try {
      switch (callSession.session.state) {
        case SessionState.Initial:
        case SessionState.Establishing:
          if (callSession.direction === CallDirection.OUTBOUND) {
            await (callSession.session as Inviter).cancel();
          } else {
            await (callSession.session as Invitation).reject();
          }
          break;
        case SessionState.Established:
          await callSession.session.bye();
          break;
      }
      
      this.updateCallState(sessionId, CallState.ENDED);
      this.sessions.delete(sessionId);
      this.emit('callEnded', { sessionId });
    } catch (error) {
      this.emit('error', { sessionId, error });
      throw error;
    }
  }

  /**
   * Hold a call
   */
  async hold(sessionId: string): Promise<void> {
    const callSession = this.sessions.get(sessionId);
    if (!callSession) {
      throw new Error('Session not found');
    }

    const sessionDescriptionHandler = callSession.session.sessionDescriptionHandler;
    if (!sessionDescriptionHandler) {
      throw new Error('Session description handler not available');
    }

    // Use re-INVITE to put call on hold
    await callSession.session.invite();

    callSession.held = true;
    this.updateCallState(sessionId, CallState.HOLD);
    this.emit('callHold', { sessionId });
  }

  /**
   * Unhold a call
   */
  async unhold(sessionId: string): Promise<void> {
    const callSession = this.sessions.get(sessionId);
    if (!callSession) {
      throw new Error('Session not found');
    }

    // Use re-INVITE to resume the call
    await callSession.session.invite();

    callSession.held = false;
    this.updateCallState(sessionId, CallState.ACTIVE);
    this.emit('callResume', { sessionId });
  }

  /**
   * Mute audio
   */
  mute(sessionId: string): void {
    const callSession = this.sessions.get(sessionId);
    if (!callSession) {
      throw new Error('Session not found');
    }

    const pc = (callSession.session.sessionDescriptionHandler as any)?.peerConnection as RTCPeerConnection;
    if (pc) {
      pc.getSenders().forEach((sender: RTCRtpSender) => {
        if (sender.track && sender.track.kind === 'audio') {
          sender.track.enabled = false;
        }
      });
      callSession.muted = true;
      this.emit('callMuted', { sessionId });
    }
  }

  /**
   * Unmute audio
   */
  unmute(sessionId: string): void {
    const callSession = this.sessions.get(sessionId);
    if (!callSession) {
      throw new Error('Session not found');
    }

    const pc = (callSession.session.sessionDescriptionHandler as any)?.peerConnection as RTCPeerConnection;
    if (pc) {
      pc.getSenders().forEach((sender: RTCRtpSender) => {
        if (sender.track && sender.track.kind === 'audio') {
          sender.track.enabled = true;
        }
      });
      callSession.muted = false;
      this.emit('callUnmuted', { sessionId });
    }
  }

  /**
   * Enable video
   */
  enableVideo(sessionId: string): void {
    const callSession = this.sessions.get(sessionId);
    if (!callSession) {
      throw new Error('Session not found');
    }

    const pc = (callSession.session.sessionDescriptionHandler as any)?.peerConnection as RTCPeerConnection;
    if (pc) {
      pc.getSenders().forEach((sender: RTCRtpSender) => {
        if (sender.track && sender.track.kind === 'video') {
          sender.track.enabled = true;
        }
      });
      callSession.videoEnabled = true;
      this.emit('videoEnabled', { sessionId });
    }
  }

  /**
   * Disable video
   */
  disableVideo(sessionId: string): void {
    const callSession = this.sessions.get(sessionId);
    if (!callSession) {
      throw new Error('Session not found');
    }

    const pc = (callSession.session.sessionDescriptionHandler as any)?.peerConnection as RTCPeerConnection;
    if (pc) {
      pc.getSenders().forEach((sender: RTCRtpSender) => {
        if (sender.track && sender.track.kind === 'video') {
          sender.track.enabled = false;
        }
      });
      callSession.videoEnabled = false;
      this.emit('videoDisabled', { sessionId });
    }
  }

  /**
   * Get local video stream
   */
  getLocalStream(sessionId: string): MediaStream | null {
    const callSession = this.sessions.get(sessionId);
    if (!callSession) {
      return null;
    }

    const pc = (callSession.session.sessionDescriptionHandler as any)?.peerConnection as RTCPeerConnection;
    if (!pc) return null;

    const localStream = new MediaStream();
    pc.getSenders().forEach((sender: RTCRtpSender) => {
      if (sender.track) {
        localStream.addTrack(sender.track);
      }
    });

    callSession.localStream = localStream;
    return localStream;
  }

  /**
   * Get remote video stream
   */
  getRemoteStream(sessionId: string): MediaStream | null {
    const callSession = this.sessions.get(sessionId);
    if (!callSession) {
      return null;
    }

    const pc = (callSession.session.sessionDescriptionHandler as any)?.peerConnection as RTCPeerConnection;
    if (!pc) return null;

    const remoteStream = new MediaStream();
    pc.getReceivers().forEach((receiver: RTCRtpReceiver) => {
      if (receiver.track) {
        remoteStream.addTrack(receiver.track);
      }
    });

    callSession.remoteStream = remoteStream;
    return remoteStream;
  }

  /**
   * Start conference call
   */
  async startConference(sessionIds: string[]): Promise<string> {
    if (sessionIds.length < 2) {
      throw new Error('Conference requires at least 2 participants');
    }

    // Create a conference session from existing calls
    const conferenceSessions = sessionIds
      .map(id => this.sessions.get(id))
      .filter(session => session !== undefined) as CallSession[];

    if (conferenceSessions.length !== sessionIds.length) {
      throw new Error('One or more sessions not found');
    }

    // Mark all sessions as conference participants
    const conferenceId = `conf_${Date.now()}`;
    conferenceSessions.forEach(session => {
      session.isConference = true;
      session.conferenceParticipants = sessionIds;
    });

    this.emit('conferenceStarted', { 
      conferenceId, 
      participants: sessionIds,
      participantCount: sessionIds.length 
    });

    return conferenceId;
  }

  /**
   * Add participant to conference
   */
  async addToConference(conferenceSessionId: string, newParticipantUri: string): Promise<string> {
    const conferenceSession = this.sessions.get(conferenceSessionId);
    if (!conferenceSession || !conferenceSession.isConference) {
      throw new Error('Conference session not found');
    }

    // Make call to new participant
    const newSessionId = await this.call(newParticipantUri);
    const newSession = this.sessions.get(newSessionId);
    
    if (newSession) {
      newSession.isConference = true;
      newSession.conferenceParticipants = [
        ...(conferenceSession.conferenceParticipants || []),
        newSessionId
      ];

      // Update all conference participants
      conferenceSession.conferenceParticipants?.forEach(participantId => {
        const participant = this.sessions.get(participantId);
        if (participant) {
          participant.conferenceParticipants?.push(newSessionId);
        }
      });

      this.emit('conferenceParticipantAdded', { 
        conferenceSessionId, 
        newParticipantUri, 
        newSessionId,
        participantCount: (conferenceSession.conferenceParticipants?.length || 0) + 1
      });
    }

    return newSessionId;
  }

  /**
   * Remove participant from conference
   */
  async removeFromConference(conferenceSessionId: string, participantSessionId: string): Promise<void> {
    const conferenceSession = this.sessions.get(conferenceSessionId);
    if (!conferenceSession || !conferenceSession.isConference) {
      throw new Error('Conference session not found');
    }

    // Hangup the participant
    await this.hangup(participantSessionId);

    // Update conference participants list
    if (conferenceSession.conferenceParticipants) {
      conferenceSession.conferenceParticipants = conferenceSession.conferenceParticipants.filter(
        id => id !== participantSessionId
      );

      // Update remaining participants
      conferenceSession.conferenceParticipants.forEach(participantId => {
        const participant = this.sessions.get(participantId);
        if (participant && participant.conferenceParticipants) {
          participant.conferenceParticipants = participant.conferenceParticipants.filter(
            id => id !== participantSessionId
          );
        }
      });

      this.emit('conferenceParticipantRemoved', { 
        conferenceSessionId, 
        participantSessionId,
        remainingParticipants: conferenceSession.conferenceParticipants.length
      });

      // End conference if less than 2 participants
      if (conferenceSession.conferenceParticipants.length < 2) {
        await this.endConference(conferenceSessionId);
      }
    }
  }

  /**
   * End conference call
   */
  async endConference(conferenceSessionId: string): Promise<void> {
    const conferenceSession = this.sessions.get(conferenceSessionId);
    if (!conferenceSession || !conferenceSession.isConference) {
      throw new Error('Conference session not found');
    }

    // Hangup all participants
    const participants = conferenceSession.conferenceParticipants || [];
    for (const participantId of participants) {
      try {
        await this.hangup(participantId);
      } catch (error) {
        console.error(`Error ending conference participant ${participantId}:`, error);
      }
    }

    this.emit('conferenceEnded', { conferenceSessionId });
  }

  /**
   * Send DTMF tones
   */
  sendDTMF(sessionId: string, tone: string): void {
    const callSession = this.sessions.get(sessionId);
    if (!callSession) {
      throw new Error('Session not found');
    }

    callSession.session.info({
      requestOptions: {
        body: {
          contentDisposition: 'render',
          contentType: 'application/dtmf-relay',
          content: `Signal=${tone}\r\nDuration=100`
        }
      }
    });

    this.emit('dtmfSent', { sessionId, tone });
  }

  /**
   * Transfer call (blind transfer)
   */
  async transfer(sessionId: string, target: string): Promise<void> {
    const callSession = this.sessions.get(sessionId);
    if (!callSession) {
      throw new Error('Session not found');
    }

    const targetUri = UserAgent.makeURI(target);
    if (!targetUri) {
      throw new Error('Invalid target URI');
    }

    this.updateCallState(sessionId, CallState.TRANSFERRING);
    await callSession.session.refer(targetUri);
    this.emit('callTransferred', { sessionId, target });
  }

  /**
   * Get active call session
   */
  getSession(sessionId: string): CallSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all active sessions
   */
  getAllSessions(): CallSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Disconnect and cleanup
   */
  async disconnect(): Promise<void> {
    // Hang up all active calls
    for (const [sessionId] of this.sessions) {
      try {
        await this.hangup(sessionId);
      } catch (error) {
        console.error(`Error hanging up session ${sessionId}:`, error);
      }
    }

    // Unregister
    if (this.isRegistered) {
      await this.unregister();
    }

    // Stop UserAgent
    if (this.userAgent) {
      await this.userAgent.stop();
      this.userAgent = null;
    }

    this.emit('disconnected');
  }

  /**
   * Setup UserAgent event handlers
   */
  private setupUserAgentHandlers(): void {
    if (!this.userAgent) return;

    this.userAgent.delegate = {
      onInvite: (invitation: Invitation) => {
        const sessionId = this.generateSessionId();
        const callSession: CallSession = {
          id: sessionId,
          session: invitation,
          direction: CallDirection.INBOUND,
          state: CallState.RINGING,
          remoteUri: invitation.remoteIdentity.uri.toString(),
          localUri: this.config.uri,
          startTime: new Date(),
          muted: false,
          held: false,
          videoEnabled: true,
          isConference: false,
          conferenceParticipants: []
        };

        this.sessions.set(sessionId, callSession);
        this.setupSessionHandlers(invitation, sessionId);

        this.emit('incomingCall', {
          sessionId,
          from: invitation.remoteIdentity.uri.toString(),
          displayName: invitation.remoteIdentity.displayName
        });
      },
      onDisconnect: (error?: Error) => {
        this.emit('disconnected', error);
      }
    };
  }

  /**
   * Setup Session event handlers
   */
  private setupSessionHandlers(session: Session, sessionId: string): void {
    session.stateChange.addListener((state: SessionState) => {
      switch (state) {
        case SessionState.Established:
          this.updateCallState(sessionId, CallState.ACTIVE);
          this.emit('callEstablished', { sessionId });
          break;
        case SessionState.Terminated:
          this.updateCallState(sessionId, CallState.ENDED);
          this.sessions.delete(sessionId);
          this.emit('callEnded', { sessionId });
          break;
      }
    });
  }

  /**
   * Update call state
   */
  private updateCallState(sessionId: string, state: CallState): void {
    const callSession = this.sessions.get(sessionId);
    if (callSession) {
      callSession.state = state;
      this.emit('callStateChanged', { sessionId, state });
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if registered
   */
  isConnected(): boolean {
    return this.isRegistered;
  }
}
