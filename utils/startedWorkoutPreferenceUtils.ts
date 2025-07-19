import AsyncStorage from '@react-native-async-storage/async-storage';

// AsyncStorage keys for rest timer preferences
const REST_TIME_BETWEEN_SETS_KEY = '@rest_time_between_sets';
const REST_TIME_BETWEEN_EXERCISES_KEY = '@rest_time_between_exercises';
const ENABLE_VIBRATION_KEY = '@enable_vibration';
const AUTO_FILL_WEIGHT_KEY = '@auto_fill_weight';
const ENABLE_SET_SWITCH_SOUND_KEY = '@enable_set_switch_sound';
const AUTO_FILL_REPS_KEY = '@auto_fill_reps';
const USE_LOGS_FOR_REP_INPUT_KEY = '@use_logs_for_rep_input';

// Default values
const DEFAULT_SET_REST_TIME = '30';
const DEFAULT_EXERCISE_REST_TIME = '60';

export interface RestTimerPreferences {
  restTimeBetweenSets: string;
  restTimeBetweenExercises: string;
  enableVibration: boolean;
  autoFillWeight: boolean;
  enableSetSwitchSound: boolean;
  autoFillReps: boolean;
  useLogsForRepInput: boolean;
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
      savedAutoFillWeight,
      savedSetSwitchSound,
      savedAutoFillReps,
      savedUseLogsForRepInput,
    ] = await Promise.all([
      AsyncStorage.getItem(REST_TIME_BETWEEN_SETS_KEY),
      AsyncStorage.getItem(REST_TIME_BETWEEN_EXERCISES_KEY),
      AsyncStorage.getItem(ENABLE_VIBRATION_KEY),
      AsyncStorage.getItem(AUTO_FILL_WEIGHT_KEY),
      AsyncStorage.getItem(ENABLE_SET_SWITCH_SOUND_KEY),
      AsyncStorage.getItem(AUTO_FILL_REPS_KEY),
      AsyncStorage.getItem(USE_LOGS_FOR_REP_INPUT_KEY),
    ]);

    return {
      restTimeBetweenSets: savedSetRestTime || DEFAULT_SET_REST_TIME,
      restTimeBetweenExercises:
        savedExerciseRestTime || DEFAULT_EXERCISE_REST_TIME,
      enableVibration:
        savedVibration !== null ? JSON.parse(savedVibration) : true,
      autoFillWeight:
        savedAutoFillWeight !== null ? JSON.parse(savedAutoFillWeight) : true,
      enableSetSwitchSound:
        savedSetSwitchSound !== null ? JSON.parse(savedSetSwitchSound) : false,
      autoFillReps:
        savedAutoFillReps !== null ? JSON.parse(savedAutoFillReps) : true,
      useLogsForRepInput:
        savedUseLogsForRepInput !== null ? JSON.parse(savedUseLogsForRepInput) : false,
    };
  } catch (error) {
    console.error('Error loading rest timer preferences:', error);
    // Return defaults if loading fails
    return {
      restTimeBetweenSets: DEFAULT_SET_REST_TIME,
      restTimeBetweenExercises: DEFAULT_EXERCISE_REST_TIME,
      enableVibration: true,
      autoFillWeight: true,
      enableSetSwitchSound: false,
      autoFillReps: true,
      useLogsForRepInput: false,
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
 * Save auto-fill preference to AsyncStorage
 * @param isEnabled - Whether auto-fill is enabled
 * @returns Promise<void>
 */
export const saveAutoFillPreference = async (
  isEnabled: boolean
): Promise<void> => {
  try {
    await AsyncStorage.setItem(AUTO_FILL_WEIGHT_KEY, JSON.stringify(isEnabled));
  } catch (error) {
    console.error('Error saving auto-fill preference:', error);
    throw error;
  }
};

/**
 * Save auto-fill reps preference to AsyncStorage
 * @param isEnabled - Whether auto-fill reps is enabled
 * @returns Promise<void>
 */
export const saveAutoFillRepsPreference = async (
  isEnabled: boolean
): Promise<void> => {
  try {
    await AsyncStorage.setItem(AUTO_FILL_REPS_KEY, JSON.stringify(isEnabled));
  } catch (error) {
    console.error('Error saving auto-fill reps preference:', error);
    throw error;
  }
};

/**
 * Save use logs for rep input preference to AsyncStorage
 * @param isEnabled - Whether use logs for rep input is enabled
 * @returns Promise<void>
 */
export const saveUseLogsForRepInputPreference = async (
  isEnabled: boolean
): Promise<void> => {
  try {
    await AsyncStorage.setItem(
      USE_LOGS_FOR_REP_INPUT_KEY,
      JSON.stringify(isEnabled)
    );
  } catch (error) {
    console.error('Error saving use logs for rep input preference:', error);
    throw error;
  }
};

/**
 * Save set switch sound preference to AsyncStorage
 * @param isEnabled - Whether set switch sound is enabled
 * @returns Promise<void>
 */
export const saveSetSwitchSoundPreference = async (
  isEnabled: boolean
): Promise<void> => {
  try {
    await AsyncStorage.setItem(ENABLE_SET_SWITCH_SOUND_KEY, JSON.stringify(isEnabled));
  } catch (error) {
    console.error('Error saving set switch sound preference:', error);
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
      saveAutoFillPreference(preferences.autoFillWeight),
      saveSetSwitchSoundPreference(preferences.enableSetSwitchSound),
      saveAutoFillRepsPreference(preferences.autoFillReps),
      saveUseLogsForRepInputPreference(preferences.useLogsForRepInput),
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
    autoFillWeight: true,
    enableSetSwitchSound: false,
    autoFillReps: true,
    useLogsForRepInput: false,
  };
};
