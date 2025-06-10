// utils/recurringWorkoutUtils.ts

import { useSQLiteContext } from 'expo-sqlite';
import { useCallback } from 'react';

// Constants
const DAY_IN_SECONDS = 86400; // 24 hours in seconds

// Interface for recurring workout data
interface RecurringWorkout {
  recurring_workout_id: number;
  workout_id: number;
  workout_name: string;
  day_name: string;
  recurring_start_date: number;
  recurring_interval: number;
  recurring_days: string | null;
}

interface Exercise {
  exercise_name: string;
  sets: number;
  reps: number;
}

/**
 * Check and schedule any pending recurring workouts
 * This should be called on app startup or when the user opens relevant screens
 */
// utils/recurringWorkoutUtils.ts

/**
 * Check and schedule any pending recurring workouts.
 * This version will schedule a specified number of upcoming occurrences.
 *
 * @param db The database connection.
 * @param scheduleAheadCount The number of upcoming occurrences to schedule.
 */
export const checkAndScheduleRecurringWorkouts = async (
  db: any,
  scheduleAheadCount: number = 2 // Schedule the next 2 occurrences by default
) => {
  try {
    console.log("RECURRING CHECK STARTED");
    const recurringWorkouts = (await db.getAllAsync(
      "SELECT * FROM Recurring_Workouts"
    )) as RecurringWorkout[];

    // Current date at midnight (normalized)
    const now = new Date();
    const currentTimestamp = Math.floor(
      new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() /
        1000
    );

    console.log(
      `Current timestamp: ${currentTimestamp} (${new Date(
        currentTimestamp * 1000
      ).toDateString()})`
    );
    console.log(`Will attempt to schedule ${scheduleAheadCount} occurrences.`);

    // Process each recurring workout definition
    for (const workout of recurringWorkouts) {
      console.log(
        `--- Checking workout: ${workout.workout_name}/${workout.day_name} ---`
      );

      // This variable will track where to start the search for the next occurrence.
      // It starts with today and gets updated after each occurrence is found.
      let searchFromTimestamp = currentTimestamp;

      // Loop to find and schedule the desired number of occurrences
      for (let i = 0; i < scheduleAheadCount; i++) {
        // Find the next occurrence starting from our search date
        const nextOccurrence = await calculateNextOccurrence(
          db,
          workout,
          searchFromTimestamp
        );

        // --- VALIDATION CHECKS ---

        // 1. Skip if the calculated date is in the past.
        //    We use the original `currentTimestamp` for this check.
        if (nextOccurrence < currentTimestamp) {
          console.log(
            `Occurrence on ${new Date(
              nextOccurrence * 1000
            ).toDateString()} is in the past. Skipping.`
          );
          // We still need to update the search date to avoid an infinite loop
          searchFromTimestamp = nextOccurrence + DAY_IN_SECONDS;
          continue;
        }

        // 2. Check if a workout is already logged for this exact date and name
        const existingLog = await db.getAllAsync(
          `SELECT workout_log_id FROM Workout_Log 
           WHERE workout_date = ? AND workout_name = ? AND day_name = ?`,
          [nextOccurrence, workout.workout_name, workout.day_name]
        );

        if (existingLog.length > 0) {
          console.log(
            `SKIPPING - Workout already scheduled for ${new Date(
              nextOccurrence * 1000
            ).toDateString()}`
          );
        } else {
          // --- SCHEDULING ---
          console.log(
            `SCHEDULING - New workout for ${new Date(
              nextOccurrence * 1000
            ).toDateString()}`
          );
          await scheduleWorkout(
            db,
            workout,
            nextOccurrence,
          );
        }

        // --- PREPARE FOR NEXT ITERATION ---
        // Set the start for the next search to be the day AFTER the one we just found.
        // This is crucial to ensure we find the *next* occurrence in the next loop.
        searchFromTimestamp = nextOccurrence + DAY_IN_SECONDS;
      }
    }

    console.log("RECURRING CHECK COMPLETED");
    return true;
  } catch (error) {
    console.error("Error in checkAndScheduleRecurringWorkouts:", error);
    return false;
  }
};

/**
 * Calculate the next occurrence date for a recurring workout
 */
const calculateNextOccurrence = async (
  db: any,
  workout: RecurringWorkout,
  currentTimestamp: number
): Promise<number> => {
  try {
    console.log(
      `Calculating next occurrence for ${
        workout.workout_name
      } from current date (${new Date(
        currentTimestamp * 1000
      ).toDateString()})`
    );

    // For interval-based scheduling (daily, every N days)
    if (workout.recurring_interval > 0) {
      let nextOccurrence = workout.recurring_start_date;
      const intervalInSeconds = workout.recurring_interval * DAY_IN_SECONDS;

      // Keep adding the interval until the next occurrence is in the future (or today)
      while (nextOccurrence < currentTimestamp) {
        nextOccurrence += intervalInSeconds;
      }

      console.log(
        `Next interval occurs on: ${new Date(
          nextOccurrence * 1000
        ).toDateString()}`
      );
      return nextOccurrence;
    }
    // For day-of-week based scheduling
    else if (workout.recurring_days) {
      // This logic was already correct.
      // Always find the next matching day from the current date.
      return findNextMatchingDay(
        workout.recurring_days,
        currentTimestamp // Always start from the current date
      );
    }

    // Default fallback
    return currentTimestamp;
  } catch (error) {
    console.error("Error calculating next occurrence:", error);
    return currentTimestamp;
  }
};

/**
 * Find the next matching day based on the recurring_days pattern
 */
const findNextMatchingDay = (
  recurringDays: string,
  currentTimestamp: number
): number => {
  // Parse selected days (0-6, where 0 is Sunday)
  const selectedDays = recurringDays.split(",").map((day) => parseInt(day, 10));

  if (selectedDays.length === 0) {
    return currentTimestamp;
  }

  // --- THIS IS THE FIX ---
  // Start checking from today, not tomorrow.
  let checkDate = new Date(currentTimestamp * 1000);

  // Look up to 7 days ahead to find the next matching day
  for (let i = 0; i < 7; i++) {
    const dayOfWeek = checkDate.getDay();

    if (selectedDays.includes(dayOfWeek)) {
      // Found a matching day, normalize to midnight
      return Math.floor(
        new Date(
          checkDate.getFullYear(),
          checkDate.getMonth(),
          checkDate.getDate()
        ).getTime() / 1000
      );
    }

    // Check the next day
    checkDate.setDate(checkDate.getDate() + 1);
  }

  // Fallback - should not reach here if selectedDays is valid
  return currentTimestamp;
};

/**
 * Schedule a workout in the Workout_Log table
 */
const scheduleWorkout = async (
  db: any, 
  workout: RecurringWorkout, 
  scheduledDate: number,
) => {
  try {    
    // First, insert the workout into the log
    const { lastInsertRowId: workoutLogId } = await db.runAsync(
      'INSERT INTO Workout_Log (workout_date, day_name, workout_name) VALUES (?, ?, ?);',
      [scheduledDate, workout.day_name, workout.workout_name] 
    );
    
    console.log(`Successfully inserted workout into log with ID: ${workoutLogId}`);
    
    
    // Get exercises for this day
    const dayId = await getDayId(db, workout.workout_id, workout.day_name);
    if (!dayId) {
      console.error(`Day ID not found for workout_id ${workout.workout_id}, day_name ${workout.day_name}`);
      throw new Error('Day not found');
    }
    
    // Fetch all exercises associated with the selected day
    const exercises = await db.getAllAsync(
      'SELECT exercise_name, sets, reps FROM Exercises WHERE day_id = ?;',
      [dayId]
    ) as Exercise[];
    
    console.log(`Adding ${exercises.length} exercises to the logged workout`);
    
    // Insert exercises into the Logged_Exercises table
    const insertExercisePromises = exercises.map((exercise: Exercise) =>
      db.runAsync(
        'INSERT INTO Logged_Exercises (workout_log_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?);',
        [workoutLogId, exercise.exercise_name, exercise.sets, exercise.reps]
      )
    );
    
    await Promise.all(insertExercisePromises);
    console.log(`Workout successfully scheduled with ${exercises.length} exercises`);
    return true;
  } catch (error) {
    console.error('Error scheduling workout:', error);
    return false;
  }
};

/**
 * Get the day_id for a workout day
 */
const getDayId = async (db: any, workoutId: number, dayName: string): Promise<number | null> => {
  try {
    const results = await db.getAllAsync(
      'SELECT day_id FROM Days WHERE workout_id = ? AND day_name = ?',
      [workoutId, dayName]
    ) as Array<{ day_id: number }>;
    
    const result = results[0];
    return result ? result.day_id : null;
  } catch (error) {
    console.error('Error getting day ID:', error);
    return null;
  }
};

/**
 * Custom hook to use recurring workout utilities
 */
export const useRecurringWorkouts = () => {
  const db = useSQLiteContext();

  
 const checkRecurringWorkouts = useCallback(async () => {

    
return await checkAndScheduleRecurringWorkouts(
    db,
    3
  );
}, [db]);
  
  // Create a new recurring workout
  const createRecurringWorkout = async (data: {
    workout_id: number;
    workout_name: string;
    day_name: string;
    recurring_interval: number;
    recurring_days?: string;
  }) => {
    try {
      const startDate = Math.floor(new Date().getTime() / 1000);
      
      await db.runAsync(
        `INSERT INTO Recurring_Workouts (
          workout_id, workout_name, day_name, recurring_start_date, 
          recurring_interval, recurring_days
        ) VALUES (?, ?, ?, ?, ?, ?);`,
        [
          data.workout_id,
          data.workout_name,
          data.day_name,
          startDate,
          data.recurring_interval,
          data.recurring_days || null,

        ]
      );
      
      return true;
    } catch (error) {
      console.error('Error creating recurring workout:', error);
      return false;
    }
  };
  
  // Update an existing recurring workout
  const updateRecurringWorkout = async (
    recurringWorkoutId: number,
    updates: {
      recurring_interval?: number;
      recurring_days?: string;
  
    }
  ) => {
    try {
      // Build the update query dynamically based on provided fields
      let updateFields = [];
      let params = [];
      
      if (updates.recurring_interval !== undefined) {
        updateFields.push('recurring_interval = ?');
        params.push(updates.recurring_interval);
      }
      
      if (updates.recurring_days !== undefined) {
        updateFields.push('recurring_days = ?');
        params.push(updates.recurring_days);
      }
      
    
      if (updateFields.length === 0) {
        return false; // Nothing to update
      }
      
      // Add the recurring workout ID to params
      params.push(recurringWorkoutId);
      
      await db.runAsync(
        `UPDATE Recurring_Workouts SET ${updateFields.join(', ')} WHERE recurring_workout_id = ?;`,
        params
      );
      
      return true;
    } catch (error) {
      console.error('Error updating recurring workout:', error);
      return false;
    }
  };
  
  // Delete a recurring workout
  const deleteRecurringWorkout = async (recurringWorkoutId: number) => {
    try {
      await db.runAsync(
        'DELETE FROM Recurring_Workouts WHERE recurring_workout_id = ?;',
        [recurringWorkoutId]
      );
      return true;
    } catch (error) {
      console.error('Error deleting recurring workout:', error);
      return false;
    }
  };
  
  // Get all recurring workouts
  const getAllRecurringWorkouts = async () => {
    try {
      return await db.getAllAsync(
        'SELECT * FROM Recurring_Workouts ORDER BY workout_name, day_name;'
      ) as RecurringWorkout[];
    } catch (error) {
      console.error('Error fetching recurring workouts:', error);
      return [];
    }
  };
  
  return {
    checkRecurringWorkouts,
    createRecurringWorkout,
    updateRecurringWorkout,
    deleteRecurringWorkout,
    getAllRecurringWorkouts
  };
};