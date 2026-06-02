/**
 * useAudio.js — React hook for audio playback control
 * 
 * Usage:
 * const audio = useAudio();
 * 
 * audio.play(base64Data) — Play audio
 * audio.pause() — Pause playback
 * audio.resume() — Resume paused audio
 * audio.stop() — Stop completely
 * audio.seekTo(seconds) — Jump to time
 * audio.state — { isPlaying, isPaused, currentTime, duration }
 */

import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import AudioManager from '../services/AudioManager';

export function useAudio() {
  const managerRef = useRef(null);
  const updateTimeoutRef = useRef(null);
  const [audioState, setAudioState] = useState({
    isPlaying: false,
    isPaused: false,
    currentTime: 0,
    duration: 0,
    isCurrentlyPlaying: false,
  });

  // Initialize manager on mount
  useEffect(() => {
    // ✅ FIX: Debounce state updates to prevent excessive re-renders
    const debouncedUpdate = (state) => {
      // Clear previous timeout
      clearTimeout(updateTimeoutRef.current);
      
      // Only update state if something actually changed
      // This prevents unnecessary re-renders during timeupdate events
      setAudioState((prevState) => {
        const hasChanged = 
          prevState.isPlaying !== state.isPlaying ||
          prevState.isPaused !== state.isPaused ||
          Math.abs(prevState.currentTime - state.currentTime) > 0.1 || // Only update if >0.1s difference
          prevState.duration !== state.duration;
        
        return hasChanged ? state : prevState;
      });
    };

    managerRef.current = new AudioManager(debouncedUpdate);

    return () => {
      clearTimeout(updateTimeoutRef.current);
      managerRef.current?.cleanup();
    };
  }, []);

  // ✅ FIX: Use useCallback to keep functions stable
  const play = useCallback((base64Data, onPlay, onEnd) => {
    return managerRef.current?.playAudio(base64Data, onPlay, onEnd);
  }, []);

  const pause = useCallback(() => {
    managerRef.current?.pauseAudio();
  }, []);

  const resume = useCallback(() => {
    managerRef.current?.resumeAudio();
  }, []);

  const stop = useCallback(() => {
    managerRef.current?.stopAudio();
  }, []);

  const seekTo = useCallback((seconds) => {
    managerRef.current?.seekTo(seconds);
  }, []);

  // ✅ FIX: Return stable object using useMemo
  return useMemo(
    () => ({
      play,
      pause,
      resume,
      stop,
      seekTo,
      state: audioState,
    }),
    [play, pause, resume, stop, seekTo, audioState]
  );
}

export default useAudio;