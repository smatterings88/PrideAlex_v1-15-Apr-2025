'use client';

import React, { useState, useCallback, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation'; 
import { startCall, endCall } from '@/lib/callFunctions'
import { CallConfig } from '@/lib/types'
import { getDemoConfig } from './demo-config';
import { Role, Transcript, UltravoxExperimentalMessageEvent, UltravoxSessionStatus } from 'ultravox-client';
import CallStatus from './components/CallStatus';
import DebugMessages from '@/app/components/DebugMessages';
import MicToggleButton from './components/MicToggleButton';
import { PhoneOffIcon } from 'lucide-react';
import OrderDetails from './components/OrderDetails';
import Hero from './components/Hero';
import { useAuth } from '@/lib/AuthContext';
import toast from 'react-hot-toast';
import SignInModal from './components/auth/SignInModal';
import SignUpModal from './components/auth/SignUpModal';

interface SearchParamsProps {
  showMuteSpeakerButton: boolean;
  modelOverride: string | undefined;
  showDebugMessages: boolean;
}

interface SearchParamsHandlerProps {
  children: (props: SearchParamsProps) => React.ReactNode;
}

const SearchParamsHandler: React.FC<SearchParamsHandlerProps> = ({ children }) => {
  const searchParams = useSearchParams();
  const showMuteSpeakerButton = searchParams.get('showSpeakerMute') === 'true';
  const modelOverride = searchParams.get('model') ?? undefined;
  const showDebugMessages = searchParams.get('showDebugMessages') === 'true';

  return children({
    showMuteSpeakerButton,
    modelOverride,
    showDebugMessages,
  });
};

export default function Home() {
  const { user, minutesWallet } = useAuth();
  const [isCallActive, setIsCallActive] = useState(false);
  const [callTranscript, setCallTranscript] = useState<Transcript[]>([]);
  const [agentStatus, setAgentStatus] = useState<string>('Ready');
  const [callDebugMessages, setCallDebugMessages] = useState<UltravoxExperimentalMessageEvent[]>([]);
  const [emotionalInsights, setEmotionalInsights] = useState<any[]>([]);
  const [isEndingCall, setIsEndingCall] = useState(false);
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  const demoConfig = getDemoConfig(user?.firstName);

  useEffect(() => {
    if (transcriptContainerRef.current) {
      transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
    }
  }, [callTranscript]);

  // Listen for call ended event
  useEffect(() => {
    const handleCallEnded = () => {
      setIsCallActive(false);
      setCallTranscript([]);
      setCallDebugMessages([]);
      setEmotionalInsights([]);
      setAgentStatus('Ready');
      setIsEndingCall(false);
    };

    window.addEventListener('callEnded', handleCallEnded);
    return () => window.removeEventListener('callEnded', handleCallEnded);
  }, []);

  const handleStatusChange = useCallback((status: UltravoxSessionStatus | string | undefined) => {
    if (status) {
      console.log('Status changed:', status);
      setAgentStatus(status.toString());
    } else {
      setAgentStatus('Ready');
    }
  }, []);

  const handleTranscriptChange = useCallback((transcripts: Transcript[] | undefined) => {
    if (transcripts) {
      console.log('Received new transcripts:', transcripts);
      setCallTranscript(transcripts);
    }
  }, []);

  const handleDebugMessage = useCallback((message: UltravoxExperimentalMessageEvent) => {
    setCallDebugMessages(prev => [...prev, message]);
    
    if (message.message.message.includes('updateOrder')) {
      try {
        const parts = message.message.message.split('orderDetailsData=');
        if (parts.length < 2) {
          console.log('No order details data found in message');
          return;
        }

        const jsonString = parts[1].trim();
        if (!jsonString) {
          console.log('Empty order details data');
          return;
        }

        console.log('Attempting to parse JSON:', jsonString);
        const data = JSON.parse(jsonString);
        
        if (Array.isArray(data)) {
          setEmotionalInsights(prev => [...prev, ...data]);
        } else {
          console.log('Parsed data is not an array:', data);
        }
      } catch (error) {
        console.error('Error parsing emotional insights. Message content:', message.message.message);
        console.error('Error details:', error);
      }
    }
  }, []);

  const handleStartCallButtonClick = useCallback(async (modelOverride?: string, showDebugMessages?: boolean) => {
    if (!user) {
      setIsSignInOpen(true);
      return;
    }

    if (!minutesWallet || minutesWallet.seconds <= 0) {
      toast.error('You have no minutes remaining in your wallet');
      return;
    }

    try {
      handleStatusChange('Starting call...');
      setCallTranscript([]);
      setCallDebugMessages([]);
      setEmotionalInsights([]);

      const callConfig: CallConfig = {
        ...demoConfig.callConfig,
        model: modelOverride ? `fixie-ai/${modelOverride}` : demoConfig.callConfig.model,
        maxDuration: `${minutesWallet.seconds}s`,
        timeExceededMessage: 'Your minutes have been used up. Thank you for talking with Alex!'
      };

      await startCall({
        onStatusChange: handleStatusChange,
        onTranscriptChange: handleTranscriptChange,
        onDebugMessage: handleDebugMessage
      }, callConfig, user.uid, showDebugMessages);

      setIsCallActive(true);
      handleStatusChange('Call started successfully');
    } catch (error) {
      handleStatusChange(`Error starting call: ${error instanceof Error ? error.message : String(error)}`);
      console.error('Error starting call:', error);
      setIsCallActive(false);
    }
  }, [handleStatusChange, handleTranscriptChange, handleDebugMessage, demoConfig, user, minutesWallet]);

  const handleEndCallButtonClick = useCallback(async () => {
    if (!isCallActive || isEndingCall) return;
    
    try {
      setIsEndingCall(true);
      handleStatusChange('Ending call...');
      
      if (!user) {
        await endCall('completed');
      } else {
        await endCall('completed', user.uid);
      }
    } catch (error) {
      handleStatusChange(`Error ending call: ${error instanceof Error ? error.message : String(error)}`);
      console.error('Error ending call:', error);
    }
  }, [handleStatusChange, user, isCallActive, isEndingCall]);

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchParamsHandler>
        {({ showMuteSpeakerButton, modelOverride, showDebugMessages }) => (
          <>
            <Hero />
            <section className="py-8 sm:py-16 bg-gradient-to-b from-[#004AAA]/5 to-white">
              <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="bg-white rounded-xl p-4 sm:p-8 shadow-2xl">
                  <div className="flex flex-col lg:flex-row gap-4 sm:gap-8">
                    <div className="w-full lg:w-2/3">
                      <div className="flex justify-between items-center mb-4 sm:mb-8">
                        <h2 className="text-2xl sm:text-4xl font-bold text-[#004AAA]">Try Alex out</h2>
                      </div>
                      <div className="flex flex-col h-full">
                        <div className="w-full">
                          {isCallActive ? (
                            <>
                              <div className="mb-4 sm:mb-5 relative">
                                <div 
                                  ref={transcriptContainerRef}
                                  className="h-[300px] sm:h-[400px] p-4 sm:p-6 overflow-y-auto relative bg-gray-50 rounded-xl border border-gray-200 shadow-inner"
                                >
                                  {callTranscript && callTranscript.length > 0 ? (
                                    callTranscript.map((transcript, index) => (
                                      <div key={index} className="mb-4">
                                        <p className={`text-base sm:text-lg font-semibold ${transcript.speaker === 'agent' ? 'text-[#004AAA]' : 'text-gray-700'}`}>
                                          {transcript.speaker === 'agent' ? "Alex" : "You"}
                                        </p>
                                        <p className="text-gray-700 text-lg sm:text-xl">{transcript.text}</p>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-gray-500 text-center mt-4">Start speaking to begin the conversation...</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2 sm:gap-4 mt-4 sm:mt-6">
                                <MicToggleButton role={Role.USER}/>
                                {showMuteSpeakerButton && <MicToggleButton role={Role.AGENT}/>}
                                <button
                                  type="button"
                                  className="flex-grow flex items-center justify-center h-10 sm:h-14 bg-red-600 hover:bg-red-700 text-white transition-colors rounded-xl text-base sm:text-xl shadow-lg disabled:opacity-50"
                                  onClick={handleEndCallButtonClick}
                                  disabled={!isCallActive || isEndingCall}
                                >
                                  <PhoneOffIcon className="w-6 sm:w-7 brightness-0 invert" />  
                                  <span className="ml-2">{isEndingCall ? 'Ending Call...' : 'End Call'}</span>
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="bg-gray-50 rounded-xl p-4 sm:p-8 mb-4 sm:mb-6 h-[300px] sm:h-[400px] text-gray-700 text-base sm:text-xl border border-gray-200">
                                <div className="max-w-2xl mx-auto">
                                  <h3 className="text-xl sm:text-2xl font-bold text-[#004AAA] mb-4">How It Works</h3>
                                  <p className="mb-4 sm:mb-6">{demoConfig.overview}</p>
                                  <ul className="space-y-4">
                                    <li className="flex items-center">
                                      <span className="bg-[#004AAA]/10 rounded-full w-6 sm:w-8 h-6 sm:h-8 flex items-center justify-center text-[#004AAA] font-bold mr-3">1</span>
                                      <span>{user ? 'Click the Start button below' : 'Sign in to get started'}</span>
                                    </li>
                                    <li className="flex items-center">
                                      <span className="bg-[#004AAA]/10 rounded-full w-6 sm:w-8 h-6 sm:h-8 flex items-center justify-center text-[#004AAA] font-bold mr-3">2</span>
                                      <span>Allow microphone access when prompted</span>
                                    </li>
                                    <li className="flex items-center">
                                      <span className="bg-[#004AAA]/10 rounded-full w-6 sm:w-8 h-6 sm:h-8 flex items-center justify-center text-[#004AAA] font-bold mr-3">3</span>
                                      <span>Start talking to Alex</span>
                                    </li>
                                  </ul>
                                </div>
                              </div>
                              <button
                                type="button"
                                className="w-full py-3 sm:py-5 px-4 sm:px-8 bg-[#004AAA] text-white hover:bg-[#004AAA]/90 transition-colors rounded-xl font-semibold text-xl sm:text-2xl shadow-lg disabled:opacity-50"
                                onClick={() => handleStartCallButtonClick(modelOverride, showDebugMessages)}
                                disabled={!user || !minutesWallet || minutesWallet.seconds <= 0}
                              >
                                {!user ? 'Sign in to Start' : 
                                 !minutesWallet || minutesWallet.seconds <= 0 ? 'No Minutes Available' : 'Start'}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <CallStatus status={agentStatus}>
                      <OrderDetails />
                    </CallStatus>
                  </div>
                </div>
              </div>
              <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-4 sm:mt-8">
                <DebugMessages debugMessages={callDebugMessages} />
              </div>
            </section>

            <SignInModal
              isOpen={isSignInOpen}
              onClose={() => setIsSignInOpen(false)}
              onSignUpClick={() => {
                setIsSignInOpen(false);
                setIsSignUpOpen(true);
              }}
            />

            <SignUpModal
              isOpen={isSignUpOpen}
              onClose={() => setIsSignUpOpen(false)}
            />
          </>
        )}
      </SearchParamsHandler>
    </Suspense>
  );
}