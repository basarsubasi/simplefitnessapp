import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import i18n from './i18n'; // Import the i18n instance



// Define the structure of the exported JSON
interface ExportedExercise {
  exercise_name: string;
  sets: number;
  reps: number;
  web_link: string | null;
}

interface ExportedDay {
  day_name: string;
  exercises: ExportedExercise[];
}

interface ExportedWorkout {
  workout_name: string;
  days: ExportedDay[];
}

/**
 * Exports a workout to a JSON file and shares it.
 * @param db - The SQLite database connection object.
 * @param workoutId - The ID of the workout to export.
 */
export const exportWorkout = async (db: any, workoutId: number) => {
  try {
    // 1. Fetch workout details
    const workout = await db.getFirstAsync('SELECT workout_name FROM Workouts WHERE workout_id = ?', [workoutId]);
    if (!workout) {
      throw new Error('Workout not found.');
    }

    const exportedWorkout: ExportedWorkout = {
      workout_name: workout.workout_name,
      days: [],
    };

    // 2. Fetch days for the workout
    const days = await db.getAllAsync('SELECT day_id, day_name FROM Days WHERE workout_id = ?', [workoutId]);

    // 3. Fetch exercises for each day
    for (const day of days) {
      const exercises = await db.getAllAsync(
        'SELECT exercise_name, sets, reps, web_link FROM Exercises WHERE day_id = ?',
        [day.day_id]
      );

      const exportedDay: ExportedDay = {
        day_name: day.day_name,
        exercises: exercises.map((ex: any) => ({
          exercise_name: ex.exercise_name,
          sets: ex.sets,
          reps: ex.reps,
          web_link: ex.web_link,
        })),
      };
      exportedWorkout.days.push(exportedDay);
    }

    // 4. Create JSON and save to a file
    const jsonString = JSON.stringify(exportedWorkout, null, 2);
    const fileName = `SimpleWorkout_${workout.workout_name.replace(/\s+/g, '_')}.json`;
    const filePath = FileSystem.documentDirectory + fileName;

    await FileSystem.writeAsStringAsync(filePath, jsonString);

    // 5. Share the file
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'application/json',
        dialogTitle: `Export ${workout.workout_name}`,
      });
    } else {
      Alert.alert('Sharing not available', 'Sharing is not available on this device.');
    }
  } catch (error) {
    console.error('Error exporting workout:', error);
    Alert.alert(i18n.t('exportFailedTitle'), i18n.t('exportFailedMessage'));
  }
};

/**
 * Imports a workout from a JSON string into the database.
 * @param db - The SQLite database connection object.
 * @param jsonString - The JSON string representing the workout.
 * @returns {Promise<boolean>} - True if import was successful, false otherwise.
 */
export const importWorkout = async (db: any, jsonString: string): Promise<boolean> => {
    try {
      const workoutData: ExportedWorkout = JSON.parse(jsonString);
  
      // Basic validation
      if (!workoutData.workout_name || !Array.isArray(workoutData.days)) {
        throw new Error('Invalid workout data format.');
      }
      
      // Check if workout name already exists
      const workoutName = workoutData.workout_name;
      const existingWorkout = await db.getFirstAsync('SELECT workout_id FROM Workouts WHERE workout_name = ?', [workoutName]);

      if (existingWorkout) {
        Alert.alert(i18n.t('importFailedTitle'), i18n.t('workoutAlreadyExistsError'));
        return false;
      }
  
      await db.withTransactionAsync(async () => {
        // Insert workout
        const workoutResult = await db.runAsync('INSERT INTO Workouts (workout_name) VALUES (?)', [workoutName]);
        const newWorkoutId = workoutResult.lastInsertRowId;
  
        if (!newWorkoutId) {
          throw new Error('Failed to create new workout.');
        }
  
        // Insert days and exercises
        for (const day of workoutData.days) {
          const dayResult = await db.runAsync('INSERT INTO Days (workout_id, day_name) VALUES (?, ?)', [newWorkoutId, day.day_name]);
          const newDayId = dayResult.lastInsertRowId;
  
          if (!newDayId) {
            throw new Error(`Failed to create day: ${day.day_name}`);
          }
  
          for (const exercise of day.exercises) {
            await db.runAsync(
              'INSERT INTO Exercises (day_id, exercise_name, sets, reps, web_link) VALUES (?, ?, ?, ?, ?)',
              [newDayId, exercise.exercise_name, exercise.sets, exercise.reps, exercise.web_link || null]
            );
          }
        }
      });
  
      return true;
    } catch (error) {
      console.error('Error importing workout:', error);
      Alert.alert(i18n.t('importFailedTitle'), i18n.t('fileNotSelectedError'));
      return false;
    }
  }; 