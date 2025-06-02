export const insertTestData = async (db: any) => {
    try {
      // Execute each statement separately
      
      // Insert the workout template
      await db.runAsync('INSERT OR IGNORE INTO Workouts (workout_name) VALUES (?)', ['Push Pull Legs']);
  
      // Insert days for the workout
      await db.runAsync('INSERT OR IGNORE INTO Days (workout_id, day_name) VALUES (?, ?)', [1, 'Push']);
      await db.runAsync('INSERT OR IGNORE INTO Days (workout_id, day_name) VALUES (?, ?)', [1, 'Pull']);
      await db.runAsync('INSERT OR IGNORE INTO Days (workout_id, day_name) VALUES (?, ?)', [1, 'Legs']);
  
      // Insert exercises for Push day
      await db.runAsync('INSERT OR IGNORE INTO Exercises (day_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [1, 'Bench Press', 5, 8]);
      await db.runAsync('INSERT OR IGNORE INTO Exercises (day_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [1, 'Overhead Press', 3, 8]);
      await db.runAsync('INSERT OR IGNORE INTO Exercises (day_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [1, 'Incline Dumbbell Press', 3, 10]);
      await db.runAsync('INSERT OR IGNORE INTO Exercises (day_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [1, 'Tricep Dips', 3, 12]);
  
      // Insert exercises for Pull day
      await db.runAsync('INSERT OR IGNORE INTO Exercises (day_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [2, 'Deadlift', 4, 5]);
      await db.runAsync('INSERT OR IGNORE INTO Exercises (day_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [2, 'Pull-ups', 3, 8]);
      await db.runAsync('INSERT OR IGNORE INTO Exercises (day_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [2, 'Barbell Rows', 3, 8]);
      await db.runAsync('INSERT OR IGNORE INTO Exercises (day_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [2, 'Face Pulls', 3, 15]);
  
      // Insert exercises for Legs day
      await db.runAsync('INSERT OR IGNORE INTO Exercises (day_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [3, 'Squats', 5, 8]);
      await db.runAsync('INSERT OR IGNORE INTO Exercises (day_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [3, 'Romanian Deadlift', 3, 10]);
      await db.runAsync('INSERT OR IGNORE INTO Exercises (day_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [3, 'Leg Press', 3, 12]);
      await db.runAsync('INSERT OR IGNORE INTO Exercises (day_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [3, 'Calf Raises', 4, 15]);
  
      // Insert workout log entries - Push Days
      await db.runAsync('INSERT OR IGNORE INTO Workout_Log (workout_name, day_name, workout_date) VALUES (?, ?, ?)', ['Push Pull Legs', 'Push', 1701388800]);
      await db.runAsync('INSERT OR IGNORE INTO Workout_Log (workout_name, day_name, workout_date) VALUES (?, ?, ?)', ['Push Pull Legs', 'Push', 1701993600]);
      await db.runAsync('INSERT OR IGNORE INTO Workout_Log (workout_name, day_name, workout_date) VALUES (?, ?, ?)', ['Push Pull Legs', 'Push', 1702598400]);
      await db.runAsync('INSERT OR IGNORE INTO Workout_Log (workout_name, day_name, workout_date) VALUES (?, ?, ?)', ['Push Pull Legs', 'Push', 1703203200]);
      await db.runAsync('INSERT OR IGNORE INTO Workout_Log (workout_name, day_name, workout_date) VALUES (?, ?, ?)', ['Push Pull Legs', 'Push', 1703808000]);
      await db.runAsync('INSERT OR IGNORE INTO Workout_Log (workout_name, day_name, workout_date) VALUES (?, ?, ?)', ['Push Pull Legs', 'Push', 1704412800]);
      await db.runAsync('INSERT OR IGNORE INTO Workout_Log (workout_name, day_name, workout_date) VALUES (?, ?, ?)', ['Push Pull Legs', 'Push', 1705017600]);
      await db.runAsync('INSERT OR IGNORE INTO Workout_Log (workout_name, day_name, workout_date) VALUES (?, ?, ?)', ['Push Pull Legs', 'Push', 1705622400]);
  
      // Insert workout log entries - Pull Days
      await db.runAsync('INSERT OR IGNORE INTO Workout_Log (workout_name, day_name, workout_date) VALUES (?, ?, ?)', ['Push Pull Legs', 'Pull', 1701475200]);
      await db.runAsync('INSERT OR IGNORE INTO Workout_Log (workout_name, day_name, workout_date) VALUES (?, ?, ?)', ['Push Pull Legs', 'Pull', 1702080000]);
      await db.runAsync('INSERT OR IGNORE INTO Workout_Log (workout_name, day_name, workout_date) VALUES (?, ?, ?)', ['Push Pull Legs', 'Pull', 1702684800]);
      await db.runAsync('INSERT OR IGNORE INTO Workout_Log (workout_name, day_name, workout_date) VALUES (?, ?, ?)', ['Push Pull Legs', 'Pull', 1703289600]);
      await db.runAsync('INSERT OR IGNORE INTO Workout_Log (workout_name, day_name, workout_date) VALUES (?, ?, ?)', ['Push Pull Legs', 'Pull', 1703894400]);
      await db.runAsync('INSERT OR IGNORE INTO Workout_Log (workout_name, day_name, workout_date) VALUES (?, ?, ?)', ['Push Pull Legs', 'Pull', 1704499200]);
      await db.runAsync('INSERT OR IGNORE INTO Workout_Log (workout_name, day_name, workout_date) VALUES (?, ?, ?)', ['Push Pull Legs', 'Pull', 1705104000]);
      await db.runAsync('INSERT OR IGNORE INTO Workout_Log (workout_name, day_name, workout_date) VALUES (?, ?, ?)', ['Push Pull Legs', 'Pull', 1705708800]);
  
      // Insert logged exercises for Push Day sessions
      await db.runAsync('INSERT OR IGNORE INTO Logged_Exercises (workout_log_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [1, 'Bench Press', 4, 8]);
      await db.runAsync('INSERT OR IGNORE INTO Logged_Exercises (workout_log_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [1, 'Overhead Press', 3, 8]);
      await db.runAsync('INSERT OR IGNORE INTO Logged_Exercises (workout_log_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [2, 'Bench Press', 4, 8]);
      await db.runAsync('INSERT OR IGNORE INTO Logged_Exercises (workout_log_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [2, 'Overhead Press', 3, 8]);
      await db.runAsync('INSERT OR IGNORE INTO Logged_Exercises (workout_log_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [3, 'Bench Press', 5, 8]);
      await db.runAsync('INSERT OR IGNORE INTO Logged_Exercises (workout_log_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [3, 'Overhead Press', 3, 8]);
      await db.runAsync('INSERT OR IGNORE INTO Logged_Exercises (workout_log_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [4, 'Bench Press', 5, 8]);
      await db.runAsync('INSERT OR IGNORE INTO Logged_Exercises (workout_log_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [4, 'Overhead Press', 3, 8]);
      await db.runAsync('INSERT OR IGNORE INTO Logged_Exercises (workout_log_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [5, 'Bench Press', 5, 8]);
      await db.runAsync('INSERT OR IGNORE INTO Logged_Exercises (workout_log_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [5, 'Overhead Press', 3, 8]);
      await db.runAsync('INSERT OR IGNORE INTO Logged_Exercises (workout_log_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [6, 'Bench Press', 3, 10]);
      await db.runAsync('INSERT OR IGNORE INTO Logged_Exercises (workout_log_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [6, 'Overhead Press', 3, 10]);
      await db.runAsync('INSERT OR IGNORE INTO Logged_Exercises (workout_log_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [7, 'Bench Press', 5, 8]);
      await db.runAsync('INSERT OR IGNORE INTO Logged_Exercises (workout_log_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [7, 'Overhead Press', 3, 8]);
      await db.runAsync('INSERT OR IGNORE INTO Logged_Exercises (workout_log_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [8, 'Bench Press', 5, 8]);
      await db.runAsync('INSERT OR IGNORE INTO Logged_Exercises (workout_log_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [8, 'Overhead Press', 3, 8]);
  
      // Insert logged exercises for Pull Day sessions
      await db.runAsync('INSERT OR IGNORE INTO Logged_Exercises (workout_log_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [9, 'Deadlift', 4, 5]);
      await db.runAsync('INSERT OR IGNORE INTO Logged_Exercises (workout_log_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [9, 'Pull-ups', 3, 8]);
      await db.runAsync('INSERT OR IGNORE INTO Logged_Exercises (workout_log_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [10, 'Deadlift', 4, 5]);
      await db.runAsync('INSERT OR IGNORE INTO Logged_Exercises (workout_log_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [10, 'Pull-ups', 3, 8]);
      await db.runAsync('INSERT OR IGNORE INTO Logged_Exercises (workout_log_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [11, 'Deadlift', 3, 5]);
      await db.runAsync('INSERT OR IGNORE INTO Logged_Exercises (workout_log_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [11, 'Pull-ups', 3, 8]);
      await db.runAsync('INSERT OR IGNORE INTO Logged_Exercises (workout_log_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [12, 'Deadlift', 3, 5]);
      await db.runAsync('INSERT OR IGNORE INTO Logged_Exercises (workout_log_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [12, 'Pull-ups', 3, 8]);
      await db.runAsync('INSERT OR IGNORE INTO Logged_Exercises (workout_log_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [13, 'Deadlift', 3, 5]);
      await db.runAsync('INSERT OR IGNORE INTO Logged_Exercises (workout_log_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [13, 'Pull-ups', 3, 8]);
      await db.runAsync('INSERT OR IGNORE INTO Logged_Exercises (workout_log_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [14, 'Deadlift', 2, 6]);
      await db.runAsync('INSERT OR IGNORE INTO Logged_Exercises (workout_log_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [14, 'Pull-ups', 3, 10]);
      await db.runAsync('INSERT OR IGNORE INTO Logged_Exercises (workout_log_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [15, 'Deadlift', 3, 5]);
      await db.runAsync('INSERT OR IGNORE INTO Logged_Exercises (workout_log_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [15, 'Pull-ups', 3, 8]);
      await db.runAsync('INSERT OR IGNORE INTO Logged_Exercises (workout_log_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [16, 'Deadlift', 3, 5]);
      await db.runAsync('INSERT OR IGNORE INTO Logged_Exercises (workout_log_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [16, 'Pull-ups', 3, 8]);
  
      // Bench Press weight progression
      const benchPressWeights = [
        [1, 1, 'Bench Press', 80.0, 8, 1], [1, 1, 'Bench Press', 80.0, 7, 2], [1, 1, 'Bench Press', 77.5, 6, 3], [1, 1, 'Bench Press', 75.0, 5, 4],
        [2, 3, 'Bench Press', 82.5, 8, 1], [2, 3, 'Bench Press', 82.5, 7, 2], [2, 3, 'Bench Press', 80.0, 6, 3], [2, 3, 'Bench Press', 77.5, 6, 4],
        [3, 5, 'Bench Press', 85.0, 8, 1], [3, 5, 'Bench Press', 85.0, 7, 2], [3, 5, 'Bench Press', 82.5, 6, 3], [3, 5, 'Bench Press', 80.0, 6, 4], [3, 5, 'Bench Press', 77.5, 5, 5],
        [4, 7, 'Bench Press', 87.5, 8, 1], [4, 7, 'Bench Press', 87.5, 7, 2], [4, 7, 'Bench Press', 85.0, 6, 3], [4, 7, 'Bench Press', 82.5, 6, 4], [4, 7, 'Bench Press', 80.0, 5, 5],
        [5, 9, 'Bench Press', 90.0, 8, 1], [5, 9, 'Bench Press', 90.0, 7, 2], [5, 9, 'Bench Press', 87.5, 6, 3], [5, 9, 'Bench Press', 85.0, 6, 4], [5, 9, 'Bench Press', 82.5, 5, 5],
        [6, 11, 'Bench Press', 85.0, 10, 1], [6, 11, 'Bench Press', 85.0, 9, 2], [6, 11, 'Bench Press', 82.5, 8, 3],
        [7, 13, 'Bench Press', 92.5, 8, 1], [7, 13, 'Bench Press', 92.5, 7, 2], [7, 13, 'Bench Press', 90.0, 6, 3], [7, 13, 'Bench Press', 87.5, 6, 4], [7, 13, 'Bench Press', 85.0, 5, 5],
        [8, 15, 'Bench Press', 95.0, 8, 1], [8, 15, 'Bench Press', 95.0, 7, 2], [8, 15, 'Bench Press', 92.5, 6, 3], [8, 15, 'Bench Press', 90.0, 6, 4], [8, 15, 'Bench Press', 87.5, 5, 5]
      ];
  
      for (const weight of benchPressWeights) {
        await db.runAsync('INSERT OR IGNORE INTO Weight_Log (workout_log_id, logged_exercise_id, exercise_name, weight_logged, reps_logged, set_number) VALUES (?, ?, ?, ?, ?, ?)', weight);
      }
  
      // Overhead Press weight progression
      const ohpWeights = [
        [1, 2, 'Overhead Press', 50.0, 8, 1], [1, 2, 'Overhead Press', 50.0, 7, 2], [1, 2, 'Overhead Press', 47.5, 6, 3],
        [2, 4, 'Overhead Press', 52.5, 8, 1], [2, 4, 'Overhead Press', 52.5, 7, 2], [2, 4, 'Overhead Press', 50.0, 6, 3],
        [3, 6, 'Overhead Press', 55.0, 8, 1], [3, 6, 'Overhead Press', 55.0, 7, 2], [3, 6, 'Overhead Press', 52.5, 6, 3],
        [4, 8, 'Overhead Press', 57.5, 8, 1], [4, 8, 'Overhead Press', 57.5, 7, 2], [4, 8, 'Overhead Press', 55.0, 6, 3],
        [5, 10, 'Overhead Press', 60.0, 8, 1], [5, 10, 'Overhead Press', 60.0, 7, 2], [5, 10, 'Overhead Press', 57.5, 6, 3],
        [6, 12, 'Overhead Press', 55.0, 10, 1], [6, 12, 'Overhead Press', 55.0, 9, 2], [6, 12, 'Overhead Press', 52.5, 8, 3],
        [7, 14, 'Overhead Press', 62.5, 8, 1], [7, 14, 'Overhead Press', 62.5, 7, 2], [7, 14, 'Overhead Press', 60.0, 6, 3],
        [8, 16, 'Overhead Press', 65.0, 8, 1], [8, 16, 'Overhead Press', 65.0, 7, 2], [8, 16, 'Overhead Press', 62.5, 6, 3]
      ];
  
      for (const weight of ohpWeights) {
        await db.runAsync('INSERT OR IGNORE INTO Weight_Log (workout_log_id, logged_exercise_id, exercise_name, weight_logged, reps_logged, set_number) VALUES (?, ?, ?, ?, ?, ?)', weight);
      }
  
      // Deadlift weight progression
      const deadliftWeights = [
        [9, 17, 'Deadlift', 120.0, 5, 1], [9, 17, 'Deadlift', 120.0, 5, 2], [9, 17, 'Deadlift', 115.0, 5, 3], [9, 17, 'Deadlift', 110.0, 5, 4],
        [10, 19, 'Deadlift', 125.0, 5, 1], [10, 19, 'Deadlift', 125.0, 5, 2], [10, 19, 'Deadlift', 120.0, 5, 3], [10, 19, 'Deadlift', 115.0, 5, 4],
        [11, 21, 'Deadlift', 130.0, 5, 1], [11, 21, 'Deadlift', 130.0, 5, 2], [11, 21, 'Deadlift', 125.0, 5, 3],
        [12, 23, 'Deadlift', 135.0, 5, 1], [12, 23, 'Deadlift', 135.0, 5, 2], [12, 23, 'Deadlift', 130.0, 5, 3],
        [13, 25, 'Deadlift', 140.0, 5, 1], [13, 25, 'Deadlift', 140.0, 4, 2], [13, 25, 'Deadlift', 135.0, 4, 3],
        [14, 27, 'Deadlift', 130.0, 6, 1], [14, 27, 'Deadlift', 130.0, 6, 2],
        [15, 29, 'Deadlift', 145.0, 5, 1], [15, 29, 'Deadlift', 145.0, 4, 2], [15, 29, 'Deadlift', 140.0, 4, 3],
        [16, 31, 'Deadlift', 150.0, 5, 1], [16, 31, 'Deadlift', 150.0, 4, 2], [16, 31, 'Deadlift', 145.0, 4, 3]
      ];
  
      for (const weight of deadliftWeights) {
        await db.runAsync('INSERT OR IGNORE INTO Weight_Log (workout_log_id, logged_exercise_id, exercise_name, weight_logged, reps_logged, set_number) VALUES (?, ?, ?, ?, ?, ?)', weight);
      }
  
      // Pull-ups weight progression
      const pullUpWeights = [
        [9, 18, 'Pull-ups', 5.0, 8, 1], [9, 18, 'Pull-ups', 5.0, 7, 2], [9, 18, 'Pull-ups', 2.5, 6, 3],
        [10, 20, 'Pull-ups', 7.5, 8, 1], [10, 20, 'Pull-ups', 7.5, 7, 2], [10, 20, 'Pull-ups', 5.0, 6, 3],
        [11, 22, 'Pull-ups', 10.0, 8, 1], [11, 22, 'Pull-ups', 10.0, 7, 2], [11, 22, 'Pull-ups', 7.5, 6, 3],
        [12, 24, 'Pull-ups', 12.5, 8, 1], [12, 24, 'Pull-ups', 12.5, 7, 2], [12, 24, 'Pull-ups', 10.0, 6, 3],
        [13, 26, 'Pull-ups', 15.0, 8, 1], [13, 26, 'Pull-ups', 15.0, 7, 2], [13, 26, 'Pull-ups', 12.5, 6, 3],
        [14, 28, 'Pull-ups', 10.0, 10, 1], [14, 28, 'Pull-ups', 10.0, 9, 2], [14, 28, 'Pull-ups', 7.5, 8, 3],
        [15, 30, 'Pull-ups', 17.5, 8, 1], [15, 30, 'Pull-ups', 17.5, 7, 2], [15, 30, 'Pull-ups', 15.0, 6, 3],
        [16, 32, 'Pull-ups', 20.0, 8, 1], [16, 32, 'Pull-ups', 20.0, 7, 2], [16, 32, 'Pull-ups', 17.5, 6, 3]
      ];
  
      for (const weight of pullUpWeights) {
        await db.runAsync('INSERT OR IGNORE INTO Weight_Log (workout_log_id, logged_exercise_id, exercise_name, weight_logged, reps_logged, set_number) VALUES (?, ?, ?, ?, ?, ?)', weight);
      }
  
      console.log('Test Data inserted into the database.');
    } catch (error) {
      console.error('Error inserting test data:', error);
    }
  };