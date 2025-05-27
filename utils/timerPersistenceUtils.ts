// utils/timerPersistenceUtils.ts
import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage key for timer state
const TIMER_STATE_KEY = '@workout_timer_state';

// Type definitions
export interface TimerState {
  workoutStartTime: number | null;
  workoutDuration: number;
  restStartTime: number | null;
  restRemaining: number;
  isResting: boolean;
  isExerciseRest: boolean;
  currentSetIndex: number;
  workoutStage: 'overview' | 'exercise' | 'rest' | 'completed';
  workoutStarted: boolean;
}

export interface TimerCallbacks {
  onRestore: (savedState: TimerState, elapsedSeconds: number) => void;
  onError?: (error: Error) => void;
}

export interface TimerPersistenceOptions {
  enabled?: boolean;
  debugMode?: boolean;
}

// Utility functions for timer state management
export const timerStateUtils = {
  /**
   * Save timer state to AsyncStorage
   */
  saveTimerState: async (timerState: TimerState): Promise<void> => {
    try {
      const stateWithTimestamp = {
        ...timerState,
        timestamp: Date.now()
      };
      
      await AsyncStorage.setItem(TIMER_STATE_KEY, JSON.stringify(stateWithTimestamp));
      
      if (__DEV__) {
        console.log('Timer state saved:', stateWithTimestamp);
      }
    } catch (error) {
      console.error('Error saving timer state:', error);
      throw error;
    }
  },

  /**
   * Load timer state from AsyncStorage
   */
  loadTimerState: async (): Promise<(TimerState & { timestamp: number }) | null> => {
    try {
      const stored = await AsyncStorage.getItem(TIMER_STATE_KEY);
      
      if (!stored) {
        return null;
      }
      
      const parsedState = JSON.parse(stored);
      
      if (__DEV__) {
        console.log('Timer state loaded:', parsedState);
      }
      
      return parsedState;
    } catch (error) {
      console.error('Error loading timer state:', error);
      return null;
    }
  },

  /**
   * Clear timer state from AsyncStorage
   */
  clearTimerState: async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(TIMER_STATE_KEY);
      
      if (__DEV__) {
        console.log('Timer state cleared');
      }
    } catch (error) {
      console.error('Error clearing timer state:', error);
    }
  },

  /**
   * Calculate elapsed time since timestamp
   */
  calculateElapsedTime: (timestamp: number): number => {
    return Math.floor((Date.now() - timestamp) / 1000);
  },

  /**
   * Check if timer state is valid for restoration
   */
  isValidTimerState: (state: any): state is TimerState => {
    return (
      state &&
      typeof state === 'object' &&
      typeof state.workoutDuration === 'number' &&
      typeof state.currentSetIndex === 'number' &&
      typeof state.workoutStarted === 'boolean' &&
      ['overview', 'exercise', 'rest', 'completed'].includes(state.workoutStage)
    );
  }
};

/**
 * Custom hook for timer persistence
 */
export const useTimerPersistence = (
  timerState: TimerState,
  callbacks: TimerCallbacks,
  options: TimerPersistenceOptions = {}
) => {
  const { enabled = true, debugMode = __DEV__ } = options;
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const isRestoringRef = useRef(false);

  const handleAppStateChange = useCallback(async (nextAppState: AppStateStatus) => {
    if (!enabled || !timerState.workoutStarted || timerState.workoutStage === 'completed') {
      appState.current = nextAppState;
      return;
    }

    try {
      // Going to background
      if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        if (debugMode) {
          console.log('=== APP GOING TO BACKGROUND ===');
          console.log('Saving timer state:', timerState);
        }
        
        await timerStateUtils.saveTimerState(timerState);
      }
      // Coming to foreground
      else if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        if (debugMode) {
          console.log('=== APP RETURNING TO FOREGROUND ===');
        }
        
        // Prevent multiple restoration attempts
        if (isRestoringRef.current) {
          if (debugMode) {
            console.log('Restoration already in progress, skipping...');
          }
          return;
        }
        
        isRestoringRef.current = true;
        
        try {
          const savedState = await timerStateUtils.loadTimerState();
          
          if (savedState && timerStateUtils.isValidTimerState(savedState)) {
            const elapsedSeconds = timerStateUtils.calculateElapsedTime(savedState.timestamp);
            
            if (debugMode) {
              console.log('Elapsed time in background:', elapsedSeconds, 'seconds');
              console.log('Restoring state:', savedState);
            }
            
            callbacks.onRestore(savedState, elapsedSeconds);
            await timerStateUtils.clearTimerState();
          } else if (debugMode) {
            console.log('No valid saved state found');
          }
        } finally {
          isRestoringRef.current = false;
        }
      }
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      console.error('Error in app state change handler:', errorObj);
      
      if (callbacks.onError) {
        callbacks.onError(errorObj);
      }
      
      isRestoringRef.current = false;
    }
    
    appState.current = nextAppState;
  }, [timerState, callbacks, enabled, debugMode]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
      // Clean up any stored state when component unmounts
      if (enabled) {
        timerStateUtils.clearTimerState().catch(error => {
          console.error('Error cleaning up timer state on unmount:', error);
        });
      }
    };
  }, [handleAppStateChange, enabled]);

  // Return utility functions for manual control
  return {
    saveState: () => timerStateUtils.saveTimerState(timerState),
    clearState: timerStateUtils.clearTimerState,
    loadState: timerStateUtils.loadTimerState
  };
};

/**
 * Helper function to create timer state object
 */
export const createTimerState = (
  overrides: Partial<TimerState> = {}
): TimerState => {
  return {
    workoutStartTime: null,
    workoutDuration: 0,
    restStartTime: null,
    restRemaining: 0,
    isResting: false,
    isExerciseRest: false,
    currentSetIndex: 0,
    workoutStage: 'overview',
    workoutStarted: false,
    ...overrides
  };
};

/**
 * Helper function to update timer state immutably
 */
export const updateTimerState = (
  currentState: TimerState,
  updates: Partial<TimerState>
): TimerState => {
  return {
    ...currentState,
    ...updates
  };
};

/**
 * Timer calculation utilities
 */
export const timerCalculations = {
  /**
   * Calculate current workout duration based on start time
   */
  getCurrentWorkoutDuration: (startTime: number | null): number => {
    if (!startTime) return 0;
    return Math.floor((Date.now() - startTime) / 1000);
  },

  /**
   * Calculate remaining rest time based on start time and initial duration
   */
  getCurrentRestRemaining: (startTime: number | null, initialDuration: number): number => {
    if (!startTime) return 0;
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    return Math.max(0, initialDuration - elapsed);
  },

  /**
   * Format time in HH:MM:SS format
   */
  formatTime: (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
};

export default {
  useTimerPersistence,
  timerStateUtils,
  createTimerState,
  updateTimerState,
  timerCalculations
};
