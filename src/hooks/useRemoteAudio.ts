import { useRef, useCallback } from 'react';

/**
 * Hook to manage remote audio stream for voice calls.
 * Provides functions to attach and detach MediaStreams from an audio element.
 * Used for browser-based softphone to play remote party's audio.
 */
export function useRemoteAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const attachStream = useCallback((stream: MediaStream) => {
    if (audioRef.current && stream) {
      console.log('[RemoteAudio] Attaching stream to audio element');
      audioRef.current.srcObject = stream;
      audioRef.current.play().catch(e => 
        console.error('[RemoteAudio] Error playing remote audio:', e)
      );
    }
  }, []);
  
  const detachStream = useCallback(() => {
    if (audioRef.current) {
      console.log('[RemoteAudio] Detaching stream from audio element');
      audioRef.current.srcObject = null;
    }
  }, []);
  
  return { audioRef, attachStream, detachStream };
}
