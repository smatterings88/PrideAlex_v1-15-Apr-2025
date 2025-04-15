'use client';
import { UltravoxSession, UltravoxSessionStatus, Transcript, UltravoxExperimentalMessageEvent, Role } from 'ultravox-client';
import { JoinUrlResponse, CallConfig, RoleEnum } from '@/lib/types';
import { updateOrderTool } from './clientTools';
import { db } from './firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { updateMinutesWallet, getMinutesWallet } from './minutesWallet';
import toast from 'react-hot-toast';

let uvSession: UltravoxSession | null = null;
let callStartTime: Date | null = null;
let durationCheckTimer: NodeJS.Timeout | null = null;
const debugMessages: Set<string> = new Set(["debug"]);

let statusListener: ((event: any) => void) | null = null;
let transcriptListener: ((event: any) => void) | null = null;
let experimentalMessageListener: ((event: any) => void) | null = null;
let currentUserId: string | null = null;

interface CallCallbacks {
  onStatusChange: (status: UltravoxSessionStatus | string | undefined) => void;
  onTranscriptChange: (transcripts: Transcript[] | undefined) => void;
  onDebugMessage?: (message: UltravoxExperimentalMessageEvent) => void;
}

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([hms])$/);
  if (!match) {
    throw new Error('Invalid duration format. Use format like "1h", "30m", or "1800s"');
  }
  
  const [, value, unit] = match;
  let milliseconds: number;
  switch (unit) {
    case 'h':
      milliseconds = parseInt(value) * 60 * 60 * 1000;
      break;
    case 'm':
      milliseconds = parseInt(value) * 60 * 1000;
      break;
    case 's':
      milliseconds = parseInt(value) * 1000;
      break;
    default:
      throw new Error('Invalid duration unit');
  }
  return milliseconds;
}

export function toggleMute(role: Role): void {
  if (!uvSession) {
    console.warn('Cannot toggle mute: No active session');
    return;
  }

  if (role == Role.USER) {
    uvSession.isMicMuted ? uvSession.unmuteMic() : uvSession.muteMic();
  } else {
    uvSession.isSpeakerMuted ? uvSession.unmuteSpeaker() : uvSession.muteSpeaker();
  }
}

async function createCall(callConfig: CallConfig, showDebugMessages?: boolean): Promise<JoinUrlResponse> {
  try {
    if(showDebugMessages) {
      console.log(`Using model ${callConfig.model}`);
    }

    const response = await fetchWithRetry(`/api/ultravox`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...callConfig }),
    });

    const data: JoinUrlResponse = await response.json();

    if(showDebugMessages) {
      console.log(`Call created. Join URL: ${data.joinUrl}`);
    }
    
    return data;
  } catch (error) {
    console.error('Error creating call:', error);
    throw error;
  }
}

async function saveCallLog(userId: string, status: 'completed' | 'disconnected' | 'error' | 'duration_exceeded'): Promise<void> {
  if (!callStartTime) {
    console.warn('No call start time recorded, skipping call log');
    return;
  }

  try {
    const endTime = new Date();
    const duration = Math.round((endTime.getTime() - callStartTime.getTime()) / 1000);

    const callLog = {
      userId,
      startTime: Timestamp.fromDate(callStartTime),
      endTime: Timestamp.fromDate(endTime),
      duration,
      status,
      createdAt: Timestamp.fromDate(new Date())
    };

    const callLogsRef = collection(db, 'callLogs');
    const docRef = await addDoc(callLogsRef, callLog);
    console.log('Call log saved successfully with ID:', docRef.id);

    await updateMinutesWallet(userId, duration);
    console.log('Minutes wallet updated successfully');

    const updatedWallet = await getMinutesWallet(userId);
    
    if (typeof window !== 'undefined' && updatedWallet) {
      window.dispatchEvent(new CustomEvent('minutesWalletUpdated', {
        detail: updatedWallet
      }));
    }
  } catch (error) {
    console.error('Error in saveCallLog:', error);
    toast.error('Error updating call records');
    throw error;
  }
}

export async function startCall(callbacks: CallCallbacks, callConfig: CallConfig, userId?: string, showDebugMessages?: boolean): Promise<void> {
  try {
    if (uvSession) {
      await endCall('completed', userId);
    }

    callStartTime = new Date();
    currentUserId = userId || null;
    
    const callData = await createCall(callConfig, showDebugMessages);
    const joinUrl = callData.joinUrl;

    if (!joinUrl) {
      throw new Error('Join URL is required');
    }

    console.log('Joining call:', joinUrl);

    uvSession = new UltravoxSession({ experimentalMessages: debugMessages });
    uvSession.registerToolImplementation("updateOrder", updateOrderTool);

    if(showDebugMessages) {
      console.log('uvSession created:', uvSession);
    }

    if (callConfig.maxDuration) {
      try {
        const durationMs = parseDuration(callConfig.maxDuration);
        
        if (durationCheckTimer) {
          clearTimeout(durationCheckTimer);
        }

        durationCheckTimer = setTimeout(async () => {
          const message = callConfig.timeExceededMessage || "Maximum call duration reached.";
          toast(message);
          if (currentUserId) {
            await endCall('duration_exceeded', currentUserId);
          } else {
            await endCall('duration_exceeded');
          }
        }, durationMs);
      } catch (error) {
        console.error('Error setting up duration check:', error);
      }
    }

    statusListener = (event: any) => {
      console.log('Status event:', event);
      callbacks.onStatusChange(uvSession?.status);
      
      if (uvSession?.status === UltravoxSessionStatus.DISCONNECTED && callStartTime) {
        if (currentUserId) {
          endCall('disconnected', currentUserId).catch(console.error);
        } else {
          endCall('disconnected').catch(console.error);
        }
      }
    };

    transcriptListener = (event: any) => {
      console.log('Transcript event:', event);
      if (uvSession?.transcripts) {
        const transcripts = [...uvSession.transcripts];
        console.log('Sending transcripts to callback:', transcripts);
        callbacks.onTranscriptChange(transcripts);
      }
    };

    experimentalMessageListener = (msg: any) => {
      callbacks?.onDebugMessage?.(msg);
    };

    uvSession.addEventListener('status', statusListener);
    uvSession.addEventListener('transcript', transcriptListener);
    uvSession.addEventListener('experimental_message', experimentalMessageListener);

    await uvSession.joinCall(joinUrl);
    console.log('Call joined successfully');

  } catch (error) {
    console.error('Error in startCall:', error);
    if (uvSession) {
      await endCall('error', currentUserId || undefined);
    }
    throw error;
  }
}

export async function endCall(status: 'completed' | 'disconnected' | 'error' | 'duration_exceeded' = 'completed', userId?: string): Promise<void> {
  try {
    const session = uvSession;
    
    if (!session) {
      console.log('No active session to end');
      
      if (durationCheckTimer) {
        clearTimeout(durationCheckTimer);
        durationCheckTimer = null;
      }
      
      callStartTime = null;
      currentUserId = null;
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('callEnded'));
      }
      
      return;
    }

    if (durationCheckTimer) {
      clearTimeout(durationCheckTimer);
      durationCheckTimer = null;
    }

    if (userId || currentUserId) {
      try {
        await saveCallLog(userId || currentUserId!, status);
      } catch (error) {
        console.error('Error saving call log:', error);
      }
    }

    if (statusListener) {
      session.removeEventListener('status', statusListener);
      statusListener = null;
    }
    if (transcriptListener) {
      session.removeEventListener('transcript', transcriptListener);
      transcriptListener = null;
    }
    if (experimentalMessageListener) {
      session.removeEventListener('experimental_message', experimentalMessageListener);
      experimentalMessageListener = null;
    }

    console.log('Leaving call...');
    await session.leaveCall();
    
    uvSession = null;
    callStartTime = null;
    currentUserId = null;

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('callEnded'));
    }

    console.log('Call ended successfully');
  } catch (error) {
    console.error('Error ending call:', error);
    uvSession = null;
    callStartTime = null;
    currentUserId = null;
    throw error;
  }
}
