import { useState, useRef, useEffect } from 'react';
import { useVoiceAssistant } from '../lib/VoiceAssistantContext';
import { useAuth } from '../lib/AuthContext';

export function VoiceAssistant() {
  const { isAuthenticated } = useAuth();
  const {
    isOpen,
    isListening,
    isProcessing,
    isSpeaking,
    error,
    messages,
    audioUrl,
    toggleOpen,
    startListening,
    stopListening,
    sendTextMessage,
    playAudio,
    stopAudio,
    clearConversation,
    clearError,
  } = useVoiceAssistant();

  const [textInput, setTextInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Only show for authenticated users
  if (!isAuthenticated) {
    return null;
  }

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim() && !isProcessing) {
      sendTextMessage(textInput);
      setTextInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTextSubmit(e);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={toggleOpen}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
          isOpen
            ? 'bg-shade-black-500 neon-border'
            : 'bg-shade-red-600 hover:bg-shade-red-500'
        } ${isListening ? 'animate-pulse' : ''}`}
        aria-label={isOpen ? 'Close voice assistant' : 'Open voice assistant'}
      >
        {isOpen ? (
          // Close icon
          <svg
            className="w-6 h-6 text-shade-red-100"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          // Microphone icon
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          </svg>
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 max-h-[70vh] flex flex-col glass-panel neon-border rounded-lg overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-shade-red-800/30 bg-shade-black-600/80">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isListening
                    ? 'bg-green-500 animate-pulse'
                    : isProcessing
                    ? 'bg-yellow-500 animate-pulse'
                    : isSpeaking
                    ? 'bg-blue-500 animate-pulse'
                    : 'bg-shade-red-500'
                }`}
              />
              <span className="text-sm font-medium text-shade-red-100">
                Voice Assistant
              </span>
            </div>
            <button
              onClick={clearConversation}
              className="text-shade-red-400 hover:text-shade-red-200 text-xs"
              title="Clear conversation"
            >
              Clear
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[200px] max-h-[40vh]">
            {messages.length === 0 ? (
              <div className="text-center text-shade-red-400 text-sm py-8">
                <p>Hi! I'm your voice assistant.</p>
                <p className="mt-2 text-xs">
                  Press the microphone or type below to start.
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      msg.role === 'user'
                        ? 'bg-shade-red-600/40 text-shade-red-100'
                        : 'bg-shade-black-500 text-shade-red-200 border border-shade-red-800/30'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Error message */}
          {error && (
            <div className="px-3 py-2 bg-red-900/50 border-t border-red-700/50">
              <div className="flex items-center justify-between">
                <span className="text-xs text-red-300">{error}</span>
                <button
                  onClick={clearError}
                  className="text-red-400 hover:text-red-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Audio controls */}
          {audioUrl && (
            <div className="px-3 py-2 bg-shade-black-600/50 border-t border-shade-red-800/30">
              <div className="flex items-center gap-2">
                <button
                  onClick={isSpeaking ? stopAudio : playAudio}
                  className="flex items-center gap-1 text-xs text-shade-red-300 hover:text-shade-red-100"
                >
                  {isSpeaking ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                      </svg>
                      Stop
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Replay
                    </>
                  )}
                </button>
                {isSpeaking && (
                  <div className="flex-1 flex items-center gap-1">
                    <div className="w-1 h-3 bg-shade-red-500 animate-pulse rounded" />
                    <div className="w-1 h-4 bg-shade-red-500 animate-pulse rounded delay-75" />
                    <div className="w-1 h-2 bg-shade-red-500 animate-pulse rounded delay-150" />
                    <div className="w-1 h-5 bg-shade-red-500 animate-pulse rounded delay-200" />
                    <div className="w-1 h-3 bg-shade-red-500 animate-pulse rounded delay-300" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Input area */}
          <div className="p-3 border-t border-shade-red-800/30 bg-shade-black-600/80">
            <div className="flex items-center gap-2">
              {/* Microphone button */}
              <button
                onClick={handleMicClick}
                disabled={isProcessing}
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  isListening
                    ? 'bg-red-600 animate-pulse'
                    : isProcessing
                    ? 'bg-shade-black-400 cursor-not-allowed'
                    : 'bg-shade-red-600 hover:bg-shade-red-500'
                }`}
                title={isListening ? 'Stop recording' : 'Start recording'}
              >
                {isProcessing ? (
                  <svg
                    className="w-5 h-5 text-shade-red-300 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    />
                  </svg>
                )}
              </button>

              {/* Text input */}
              <form onSubmit={handleTextSubmit} className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isListening ? 'Listening...' : 'Type a message...'}
                  disabled={isProcessing || isListening}
                  className="flex-1 bg-shade-black-500 border border-shade-red-800/30 rounded-lg px-3 py-2 text-sm text-shade-red-100 placeholder-shade-red-500 focus:outline-none focus:border-shade-red-600 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!textInput.trim() || isProcessing || isListening}
                  className="flex-shrink-0 px-3 py-2 bg-shade-red-600 hover:bg-shade-red-500 disabled:bg-shade-black-400 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                </button>
              </form>
            </div>

            {/* Status indicator */}
            {isListening && (
              <div className="mt-2 flex items-center justify-center gap-2 text-xs text-green-400">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Listening... Tap mic to stop
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
