import { createContext, useState, useContext, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// API Response types
interface ConversationResponse {
  userText: string;
  responseText: string;
  audio: string | null;
  messages: ChatMessage[];
  error?: string;
}

interface ChatResponse {
  response: string;
  message: ChatMessage;
  error?: string;
}

interface SynthesizeResponse {
  audio: string;
  contentType: string;
  error?: string;
}

interface VoiceAssistantContextType {
  // UI State
  isOpen: boolean;
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  error: string | null;

  // Conversation
  messages: ChatMessage[];
  currentTranscript: string;

  // Audio
  audioUrl: string | null;

  // Actions
  toggleOpen: () => void;
  startListening: () => Promise<void>;
  stopListening: () => void;
  sendTextMessage: (text: string) => Promise<void>;
  playAudio: () => void;
  stopAudio: () => void;
  clearConversation: () => void;
  clearError: () => void;
}

const VoiceAssistantContext = createContext<VoiceAssistantContextType | undefined>(undefined);

export function VoiceAssistantProvider({ children }: { children: ReactNode }) {
  // UI State
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Conversation
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');

  // Audio
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearConversation = useCallback(() => {
    setMessages([]);
    setCurrentTranscript('');
    setAudioUrl(null);
    setError(null);
  }, []);

  const stopAudio = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
    }
    setIsSpeaking(false);
  }, []);

  const playAudio = useCallback(() => {
    if (audioUrl && audioElementRef.current) {
      audioElementRef.current.src = audioUrl;
      audioElementRef.current.play().catch((err) => {
        console.error('Audio playback failed:', err);
        setError('Failed to play audio');
      });
      setIsSpeaking(true);
    }
  }, [audioUrl]);

  // Process audio and get response
  const processAudio = useCallback(async (audioBlob: Blob) => {
    setIsProcessing(true);
    setError(null);

    try {
      // Create form data with audio and history
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('history', JSON.stringify({ history: messages }));

      // Call conversation endpoint
      const response = await fetch('/api/voice/conversation', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        throw new Error(errorData.error || 'Failed to process voice');
      }

      const data = await response.json() as ConversationResponse;

      // Update transcript
      setCurrentTranscript(data.userText);

      // Add messages to conversation
      if (data.messages) {
        setMessages((prev) => [...prev, ...data.messages]);
      }

      // Set audio for playback
      if (data.audio) {
        setAudioUrl(data.audio);

        // Auto-play the response
        if (audioElementRef.current) {
          audioElementRef.current.src = data.audio;
          audioElementRef.current.play().catch((err) => {
            console.error('Auto-play failed:', err);
          });
          setIsSpeaking(true);
        }
      }
    } catch (err: any) {
      console.error('Voice processing error:', err);
      setError(err.message || 'Failed to process voice');
    } finally {
      setIsProcessing(false);
    }
  }, [messages]);

  const startListening = useCallback(async () => {
    setError(null);

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4',
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType,
        });
        processAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsListening(true);
    } catch (err: any) {
      console.error('Microphone access error:', err);
      if (err.name === 'NotAllowedError') {
        setError('Microphone access denied. Please allow microphone access to use voice.');
      } else {
        setError('Failed to access microphone');
      }
    }
  }, [processAudio]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setIsListening(false);
  }, []);

  const sendTextMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    setIsProcessing(true);
    setError(null);

    // Add user message immediately
    const userMessage: ChatMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMessage]);

    try {
      // Call chat endpoint
      const response = await fetch('/api/voice/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        throw new Error(errorData.error || 'Failed to get response');
      }

      const data = await response.json() as ChatResponse;

      // Add assistant message
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.response,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Synthesize response to speech
      const ttsResponse = await fetch('/api/voice/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: data.response }),
      });

      if (ttsResponse.ok) {
        const ttsData = await ttsResponse.json() as SynthesizeResponse;
        if (ttsData.audio) {
          setAudioUrl(ttsData.audio);

          // Auto-play
          if (audioElementRef.current) {
            audioElementRef.current.src = ttsData.audio;
            audioElementRef.current.play().catch((err) => {
              console.error('Auto-play failed:', err);
            });
            setIsSpeaking(true);
          }
        }
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      setError(err.message || 'Failed to send message');
    } finally {
      setIsProcessing(false);
    }
  }, [messages]);

  // Create audio element on mount
  if (typeof window !== 'undefined' && !audioElementRef.current) {
    audioElementRef.current = new Audio();
    audioElementRef.current.onended = () => {
      setIsSpeaking(false);
    };
    audioElementRef.current.onerror = () => {
      setIsSpeaking(false);
      setError('Audio playback error');
    };
  }

  return (
    <VoiceAssistantContext.Provider
      value={{
        isOpen,
        isListening,
        isProcessing,
        isSpeaking,
        error,
        messages,
        currentTranscript,
        audioUrl,
        toggleOpen,
        startListening,
        stopListening,
        sendTextMessage,
        playAudio,
        stopAudio,
        clearConversation,
        clearError,
      }}
    >
      {children}
    </VoiceAssistantContext.Provider>
  );
}

export function useVoiceAssistant() {
  const context = useContext(VoiceAssistantContext);
  if (context === undefined) {
    throw new Error('useVoiceAssistant must be used within a VoiceAssistantProvider');
  }
  return context;
}
