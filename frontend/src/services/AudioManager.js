/**
 * AudioManager.js — Centralized TTS audio playback control
 * 
 * Handles:
 * ✅ Play, pause, resume, stop controls
 * ✅ Progress tracking
 * ✅ Auto-cleanup on unmount
 * ✅ Prevents multiple simultaneous playbacks
 * ✅ Integrates with React state
 */

export class AudioManager {
  constructor(onStateChange = null) {
    this.currentAudio = null;       // Active Audio element
    this.isPlaying = false;         // Play state
    this.isPaused = false;          // Pause state
    this.currentTime = 0;           // Current position
    this.duration = 0;              // Total duration
    this.onStateChange = onStateChange; // Callback for state updates
  }

  /**
   * Create and play audio from base64
   * @param {string} base64Data - Base64 encoded audio
   * @param {function} onPlay - Called when playback starts
   * @param {function} onEnd - Called when playback ends
   */
  playAudio(base64Data, onPlay = null, onEnd = null) {
    try {
      // Stop any existing playback
      this.stopAudio();

      // Create new Audio element
      this.currentAudio = new Audio(`data:audio/mp3;base64,${base64Data}`);

      // Event listeners
      this.currentAudio.addEventListener('play', () => {
        this.isPlaying = true;
        this.isPaused = false;
        this._notifyStateChange();
        onPlay?.();
      });

      this.currentAudio.addEventListener('pause', () => {
        this.isPlaying = false;
        this.isPaused = true;
        this._notifyStateChange();
      });

      this.currentAudio.addEventListener('ended', () => {
        this.isPlaying = false;
        this.isPaused = false;
        this.currentTime = 0;
        this._notifyStateChange();
        onEnd?.();
        this.currentAudio = null; // Clean up reference
      });

      this.currentAudio.addEventListener('timeupdate', () => {
        // ✅ SAFETY CHECK: Prevents crash if audio was stopped/nulled
        if (!this.currentAudio) return; 
        
        this.currentTime = this.currentAudio.currentTime;
        this.duration = this.currentAudio.duration;
        this._notifyStateChange();
      });

      this.currentAudio.addEventListener('loadedmetadata', () => {
        // ✅ SAFETY CHECK
        if (!this.currentAudio) return; 
        
        this.duration = this.currentAudio.duration;
        this._notifyStateChange();
      });

      this.currentAudio.addEventListener('error', (e) => {
        console.error('❌ Audio playback error:', e);
        this.isPlaying = false;
        this.isPaused = false;
        this._notifyStateChange();
      });

      // Start playback
      this.currentAudio.play().catch(err => {
        console.error('❌ Could not play audio:', err);
      });

      return this.currentAudio;
    } catch (error) {
      console.error('❌ AudioManager.playAudio error:', error);
      return null;
    }
  }

  /**
   * Pause current playback
   */
  pauseAudio() {
    if (this.currentAudio && this.isPlaying) {
      this.currentAudio.pause();
      this.isPlaying = false;
      this.isPaused = true;
      this._notifyStateChange();
    }
  }

  /**
   * Resume paused audio
   */
  resumeAudio() {
    if (this.currentAudio && this.isPaused) {
      this.currentAudio.play().catch(err => {
        console.error('❌ Could not resume audio:', err);
      });
      this.isPlaying = true;
      this.isPaused = false;
      this._notifyStateChange();
    }
  }

  /**
   * Stop and reset audio completely
   */
  stopAudio() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    this.isPlaying = false;
    this.isPaused = false;
    this.currentTime = 0;
    this.duration = 0;
    this._notifyStateChange();
  }

  /**
   * Seek to a specific time
   */
  seekTo(timeInSeconds) {
    if (this.currentAudio) {
      this.currentAudio.currentTime = Math.max(0, Math.min(timeInSeconds, this.duration));
      this.currentTime = this.currentAudio.currentTime;
      this._notifyStateChange();
    }
  }

  /**
   * Check if audio is currently playing
   */
  isCurrentlyPlaying() {
    return this.isPlaying && this.currentAudio !== null;
  }

  /**
   * Get current state
   */
  getState() {
    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      currentTime: this.currentTime,
      duration: this.duration,
      isCurrentlyPlaying: this.isCurrentlyPlaying(),
    };
  }

  /**
   * Internal: notify state change to React
   */
  _notifyStateChange() {
    if (this.onStateChange) {
      this.onStateChange(this.getState());
    }
  }

  /**
   * Cleanup: stop and remove all listeners
   */
  cleanup() {
    this.stopAudio();
    this.currentAudio = null;
    this.onStateChange = null;
  }
}

export default AudioManager;