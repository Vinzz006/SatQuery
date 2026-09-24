import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Radio } from 'lucide-react';

interface VoiceQueryInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

// Browser Web Speech API type declarations
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export const VoiceQueryInput: React.FC<VoiceQueryInputProps> = ({ onTranscript, disabled = false }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const speechToText = event.results[0][0].transcript;
      if (speechToText && speechToText.trim()) {
        onTranscript(speechToText.trim());
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition event:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, [onTranscript]);

  const toggleListening = () => {
    if (!recognitionRef.current || disabled) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.warn('Error starting speech recognition:', err);
      }
    }
  };

  if (!isSupported) {
    return (
      <button
        type="button"
        disabled
        title="Web Speech API is not supported in this browser"
        className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-600 cursor-not-allowed transition-colors"
      >
        <MicOff className="w-4 h-4" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleListening}
      disabled={disabled}
      title={isListening ? "Listening... Speak your query (e.g. 'Compute NDVI vegetation index')" : "Dictate query via voice assistant"}
      className={`relative p-2 rounded-lg border transition-all duration-200 flex items-center justify-center ${
        isListening
          ? 'bg-rose-500/20 border-rose-500/80 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.4)] animate-pulse'
          : 'bg-slate-900/80 hover:bg-cyan-950/40 border-cyan-800/40 hover:border-cyan-500/60 text-slate-300 hover:text-cyan-400'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {isListening ? (
        <span className="flex items-center gap-1.5">
          <Radio className="w-4 h-4 text-rose-400 animate-spin" />
          <span className="text-[10px] font-mono font-bold uppercase text-rose-300 tracking-wider">REC</span>
        </span>
      ) : (
        <Mic className="w-4 h-4" />
      )}
    </button>
  );
};
