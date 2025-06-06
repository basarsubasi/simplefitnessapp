import AsyncStorage from '@react-native-async-storage/async-storage';

// AsyncStorage keys for rest timer preferences
const REST_TIME_BETWEEN_SETS_KEY = '@rest_time_between_sets';
const REST_TIME_BETWEEN_EXERCISES_KEY = '@rest_time_between_exercises';
const ENABLE_VIBRATION_KEY = '@enable_vibration';
const ENABLE_NOTIFICATIONS_KEY = '@enable_notifications';

// Default values
const DEFAULT_SET_REST_TIME = '30';
const DEFAULT_EXERCISE_REST_TIME = '60';

export interface RestTimerPreferences {
  restTimeBetweenSets: string;
  restTimeBetweenExercises: string;
  enableVibration: boolean;
  enableNotifications: boolean;
}

/**
 * Load saved rest timer preferences from AsyncStorage
 * returns Promise<RestTimerPreferences> - The saved preferences or defaults
 */
export const loadRestTimerPreferences = async (): Promise<RestTimerPreferences> => {
  try {
    const [
      savedSetRestTime,
      savedExerciseRestTime,
      savedVibration,
      savedNotifications,
    ] = await Promise.all([
      AsyncStorage.getItem(REST_TIME_BETWEEN_SETS_KEY),
      AsyncStorage.getItem(REST_TIME_BETWEEN_EXERCISES_KEY),
      AsyncStorage.getItem(ENABLE_VIBRATION_KEY),
      AsyncStorage.getItem(ENABLE_NOTIFICATIONS_KEY),
    ]);

    return {
      restTimeBetweenSets: savedSetRestTime || DEFAULT_SET_REST_TIME,
      restTimeBetweenExercises:
        savedExerciseRestTime || DEFAULT_EXERCISE_REST_TIME,
      enableVibration:
        savedVibration !== null ? JSON.parse(savedVibration) : true,
      enableNotifications:
        savedNotifications !== null ? JSON.parse(savedNotifications) : false,
    };
  } catch (error) {
    console.error('Error loading rest timer preferences:', error);
    // Return defaults if loading fails
    return {
      restTimeBetweenSets: DEFAULT_SET_REST_TIME,
      restTimeBetweenExercises: DEFAULT_EXERCISE_REST_TIME,
      enableVibration: true,
      enableNotifications: false,
    };
  }
};

/**
 * Save rest time between sets to AsyncStorage
 * param time - The rest time in seconds as a string
 * returns Promise<void>
 */
export const saveRestTimeBetweenSets = async (time: string): Promise<void> => {
  try {
    // Validate input
    const timeNumber = parseInt(time);
    if (isNaN(timeNumber) || timeNumber < 0) {
      throw new Error('Invalid rest time value');
    }

    await AsyncStorage.setItem(REST_TIME_BETWEEN_SETS_KEY, time);
  } catch (error) {
    console.error('Error saving rest time between sets:', error);
    throw error;
  }
};

/**
 * Save rest time between exercises to AsyncStorage
 * param time - The rest time in seconds as a string
 * returns Promise<void>
 */
export const saveRestTimeBetweenExercises = async (time: string): Promise<void> => {
  try {
    // Validate input
    const timeNumber = parseInt(time);
    if (isNaN(timeNumber) || timeNumber < 0) {
      throw new Error('Invalid rest time value');
    }

    await AsyncStorage.setItem(REST_TIME_BETWEEN_EXERCISES_KEY, time);
  } catch (error) {
    console.error('Error saving rest time between exercises:', error);
    throw error;
  }
};

/**
 * Save vibration preference to AsyncStorage
 * @param isEnabled - Whether vibration is enabled
 * @returns Promise<void>
 */
export const saveVibrationPreference = async (
  isEnabled: boolean
): Promise<void> => {
  try {
    await AsyncStorage.setItem(ENABLE_VIBRATION_KEY, JSON.stringify(isEnabled));
  } catch (error) {
    console.error('Error saving vibration preference:', error);
    throw error;
  }
};

/**
 * Save notification preference to AsyncStorage
 * @param isEnabled - Whether notifications are enabled
 * @returns Promise<void>
 */
export const saveNotificationPreference = async (
  isEnabled: boolean
): Promise<void> => {
  try {
    await AsyncStorage.setItem(
      ENABLE_NOTIFICATIONS_KEY,
      JSON.stringify(isEnabled)
    );
  } catch (error) {
    console.error('Error saving notification preference:', error);
    throw error;
  }
};

/**
 * Save both rest timer preferences at once
 * param preferences - Object containing both rest time values
 * returns Promise<void>
 */
export const saveRestTimerPreferences = async (
  preferences: RestTimerPreferences
): Promise<void> => {
  try {
    await Promise.all([
      saveRestTimeBetweenSets(preferences.restTimeBetweenSets),
      saveRestTimeBetweenExercises(preferences.restTimeBetweenExercises),
      saveVibrationPreference(preferences.enableVibration),
      saveNotificationPreference(preferences.enableNotifications),
    ]);
  } catch (error) {
    console.error('Error saving rest timer preferences:', error);
    throw error;
  }
};

/**
 * Get the default rest timer preferences
 * @returns RestTimerPreferences - The default values
 */
export const getDefaultRestTimerPreferences = (): RestTimerPreferences => {
  return {
    restTimeBetweenSets: DEFAULT_SET_REST_TIME,
    restTimeBetweenExercises: DEFAULT_EXERCISE_REST_TIME,
    enableVibration: true,
    enableNotifications: false,
  };
};
