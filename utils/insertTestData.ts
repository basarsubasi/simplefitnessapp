export const insertTestData = async (db: any) => {
    try {
      // Execute each statement separately
      
      // Insert workout templates
      await db.runAsync('INSERT OR IGNORE INTO Workouts (workout_name) VALUES (?)', ['Push Pull Legs']);
      await db.runAsync('INSERT OR IGNORE INTO Workouts (workout_name) VALUES (?)', ['Upper Lower']);
      await db.runAsync('INSERT OR IGNORE INTO Workouts (workout_name) VALUES (?)', ['Full Body']);
  
      // Insert days for Push Pull Legs
      await db.runAsync('INSERT OR IGNORE INTO Days (workout_id, day_name) VALUES (?, ?)', [1, 'Push']);
      await db.runAsync('INSERT OR IGNORE INTO Days (workout_id, day_name) VALUES (?, ?)', [1, 'Pull']);
      await db.runAsync('INSERT OR IGNORE INTO Days (workout_id, day_name) VALUES (?, ?)', [1, 'Legs']);
  
      // Insert days for Upper Lower
      await db.runAsync('INSERT OR IGNORE INTO Days (workout_id, day_name) VALUES (?, ?)', [2, 'Upper']);
      await db.runAsync('INSERT OR IGNORE INTO Days (workout_id, day_name) VALUES (?, ?)', [2, 'Lower']);
  
      // Insert days for Full Body
      await db.runAsync('INSERT OR IGNORE INTO Days (workout_id, day_name) VALUES (?, ?)', [3, 'Full Body A']);
      await db.runAsync('INSERT OR IGNORE INTO Days (workout_id, day_name) VALUES (?, ?)', [3, 'Full Body B']);
  
      // Insert exercises for Push day
      await db.runAsync('INSERT OR IGNORE INTO Exercises (day_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [1, 'Bench Press', 5, 8]);
      await db.runAsync('INSERT OR IGNORE INTO Exercises (day_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [1, 'Overhead Press', 4, 8]);
      await db.runAsync('INSERT OR IGNORE INTO Exercises (day_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [1, 'Incline Dumbbell Press', 3, 10]);
      await db.runAsync('INSERT OR IGNORE INTO Exercises (day_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [1, 'Tricep Dips', 3, 12]);
      await db.runAsync('INSERT OR IGNORE INTO Exercises (day_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [1, 'Lateral Raises', 3, 15]);
  
      // Insert exercises for Pull day
      await db.runAsync('INSERT OR IGNORE INTO Exercises (day_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [2, 'Deadlift', 4, 5]);
      await db.runAsync('INSERT OR IGNORE INTO Exercises (day_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [2, 'Pull-ups', 4, 8]);
      await db.runAsync('INSERT OR IGNORE INTO Exercises (day_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [2, 'Barbell Rows', 4, 8]);
      await db.runAsync('INSERT OR IGNORE INTO Exercises (day_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [2, 'Face Pulls', 3, 15]);
      await db.runAsync('INSERT OR IGNORE INTO Exercises (day_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [2, 'Bicep Curls', 3, 12]);
  
      // Insert exercises for Legs day
      await db.runAsync('INSERT OR IGNORE INTO Exercises (day_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [3, 'Squats', 5, 8]);
      await db.runAsync('INSERT OR IGNORE INTO Exercises (day_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [3, 'Romanian Deadlift', 4, 10]);
      await db.runAsync('INSERT OR IGNORE INTO Exercises (day_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [3, 'Leg Press', 3, 12]);
      await db.runAsync('INSERT OR IGNORE INTO Exercises (day_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [3, 'Leg Curls', 3, 12]);
      await db.runAsync('INSERT OR IGNORE INTO Exercises (day_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [3, 'Calf Raises', 4, 15]);
  
      // Insert exercises for Upper day
      await db.runAsync('INSERT OR IGNORE INTO Exercises (day_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [4, 'Bench Press', 4, 8]);
      await db.runAsync('INSERT OR IGNORE INTO Exercises (day_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [4, 'Bent Over Rows', 4, 8]);
      await db.runAsync('INSERT OR IGNORE INTO Exercises (day_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [4, 'Overhead Press', 3, 10]);
      await db.runAsync('INSERT OR IGNORE INTO Exercises (day_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [4, 'Pull-ups', 3, 10]);
  
      // Insert exercises for Lower day
      await db.runAsync('INSERT OR IGNORE INTO Exercises (day_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [5, 'Squats', 4, 8]);
      await db.runAsync('INSERT OR IGNORE INTO Exercises (day_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [5, 'Deadlift', 3, 5]);
      await db.runAsync('INSERT OR IGNORE INTO Exercises (day_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [5, 'Bulgarian Split Squats', 3, 12]);
      await db.runAsync('INSERT OR IGNORE INTO Exercises (day_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', [5, 'Calf Raises', 4, 15]);
  
      // Generate workout log entries spanning 8 months (timestamps from June 2024 to January 2025)
      const workoutDates = [
        // June 2024
        1717200000, 1717372800, 1717545600, 1717718400, 1717891200, 1718064000,
        1718236800, 1718409600, 1718582400, 1718755200, 1718928000, 1719100800,
        // July 2024
        1719273600, 1719446400, 1719619200, 1719792000, 1719964800, 1720137600,
        1720310400, 1720483200, 1720656000, 1720828800, 1721001600, 1721174400,
        // August 2024
        1721347200, 1721520000, 1721692800, 1721865600, 1722038400, 1722211200,
        1722384000, 1722556800, 1722729600, 1722902400, 1723075200, 1723248000,
        // September 2024
        1723420800, 1723593600, 1723766400, 1723939200, 1724112000, 1724284800,
        1724457600, 1724630400, 1724803200, 1724976000, 1725148800, 1725321600,
        // October 2024
        1725494400, 1725667200, 1725840000, 1726012800, 1726185600, 1726358400,
        1726531200, 1726704000, 1726876800, 1727049600, 1727222400, 1727395200,
        // November 2024
        1727568000, 1727740800, 1727913600, 1728086400, 1728259200, 1728432000,
        1728604800, 1728777600, 1728950400, 1729123200, 1729296000, 1729468800,
        // December 2024
        1729641600, 1729814400, 1729987200, 1730160000, 1730332800, 1730505600,
        1730678400, 1730851200, 1731024000, 1731196800, 1731369600, 1731542400,
        // January 2025
        1731715200, 1731888000, 1732060800, 1732233600, 1732406400, 1732579200
      ];
  
      const dayTypes = ['Push', 'Pull', 'Legs'];
      const completionTimes = [2400, 2700, 3000, 3300, 3600, 2250, 2550, 2850]; // 40-60 minutes
  
      // Insert Push Pull Legs workout sessions
      let workoutLogId = 1;
      for (let i = 0; i < workoutDates.length; i++) {
        const dayType = dayTypes[i % dayTypes.length];
        const completionTime = completionTimes[i % completionTimes.length] + Math.floor(Math.random() * 600 - 300); // ±5 minutes variation
        
        await db.runAsync('INSERT OR IGNORE INTO Workout_Log (workout_name, day_name, workout_date, completion_time) VALUES (?, ?, ?, ?)', 
          ['Push Pull Legs', dayType, workoutDates[i], completionTime]);
        workoutLogId++;
      }
  
      // Insert some Upper Lower sessions
      for (let i = 0; i < 20; i++) {
        const dayType = i % 2 === 0 ? 'Upper' : 'Lower';
        const completionTime = 2800 + Math.floor(Math.random() * 800 - 400); // 40-53 minutes
        const dateOffset = Math.floor(i / 2) * 172800; // Every 2 days
        
        await db.runAsync('INSERT OR IGNORE INTO Workout_Log (workout_name, day_name, workout_date, completion_time) VALUES (?, ?, ?, ?)', 
          ['Upper Lower', dayType, workoutDates[0] + dateOffset, completionTime]);
        workoutLogId++;
      }
  
      // Insert logged exercises for Push sessions
      let loggedExerciseId = 1;
      for (let sessionId = 1; sessionId <= workoutDates.length; sessionId++) {
        if ((sessionId - 1) % 3 === 0) { // Push day
          await db.runAsync('INSERT OR IGNORE INTO Logged_Exercises (workout_log_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', 
            [sessionId, 'Bench Press', 5, 8]);
          await db.runAsync('INSERT OR IGNORE INTO Logged_Exercises (workout_log_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', 
            [sessionId, 'Overhead Press', 4, 8]);
          await db.runAsync('INSERT OR IGNORE INTO Logged_Exercises (workout_log_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', 
            [sessionId, 'Incline Dumbbell Press', 3, 10]);
          await db.runAsync('INSERT OR IGNORE INTO Logged_Exercises (workout_log_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', 
            [sessionId, 'Tricep Dips', 3, 12]);
          loggedExerciseId += 4;
        }
      }
  
      // Insert logged exercises for Pull sessions
      for (let sessionId = 1; sessionId <= workoutDates.length; sessionId++) {
        if ((sessionId - 1) % 3 === 1) { // Pull day
          await db.runAsync('INSERT OR IGNORE INTO Logged_Exercises (workout_log_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', 
            [sessionId, 'Deadlift', 4, 5]);
          await db.runAsync('INSERT OR IGNORE INTO Logged_Exercises (workout_log_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', 
            [sessionId, 'Pull-ups', 4, 8]);
          await db.runAsync('INSERT OR IGNORE INTO Logged_Exercises (workout_log_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', 
            [sessionId, 'Barbell Rows', 4, 8]);
          await db.runAsync('INSERT OR IGNORE INTO Logged_Exercises (workout_log_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', 
            [sessionId, 'Bicep Curls', 3, 12]);
          loggedExerciseId += 4;
        }
      }
  
      // Insert logged exercises for Legs sessions
      for (let sessionId = 1; sessionId <= workoutDates.length; sessionId++) {
        if ((sessionId - 1) % 3 === 2) { // Legs day
          await db.runAsync('INSERT OR IGNORE INTO Logged_Exercises (workout_log_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', 
            [sessionId, 'Squats', 5, 8]);
          await db.runAsync('INSERT OR IGNORE INTO Logged_Exercises (workout_log_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', 
            [sessionId, 'Romanian Deadlift', 4, 10]);
          await db.runAsync('INSERT OR IGNORE INTO Logged_Exercises (workout_log_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', 
            [sessionId, 'Leg Press', 3, 12]);
          await db.runAsync('INSERT OR IGNORE INTO Logged_Exercises (workout_log_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)', 
            [sessionId, 'Calf Raises', 4, 15]);
          loggedExerciseId += 4;
        }
      }
  
      // Generate comprehensive weight progression data for Bench Press
      const benchProgressionData = [];
      let benchWeight = 80.0;
      let loggedExId = 1;
      
      for (let sessionId = 1; sessionId <= workoutDates.length; sessionId++) {
        if ((sessionId - 1) % 3 === 0) { // Push day
          // Progressive overload with some deload weeks
          if (sessionId % 12 === 0) {
            benchWeight -= 10; // Deload every 4th session
          } else if (sessionId % 3 === 0) {
            benchWeight += 2.5; // Increase weight every 3rd session
          }
          
          // Generate 5 sets with realistic weight drops
          const baseWeight = benchWeight;
          const sets = [
            { weight: baseWeight, reps: 8, set: 1 },
            { weight: baseWeight, reps: Math.max(6, 8 - Math.floor(Math.random() * 2)), set: 2 },
            { weight: baseWeight - 2.5, reps: Math.max(5, 8 - Math.floor(Math.random() * 3)), set: 3 },
            { weight: baseWeight - 5.0, reps: Math.max(5, 8 - Math.floor(Math.random() * 3)), set: 4 },
            { weight: baseWeight - 7.5, reps: Math.max(4, 8 - Math.floor(Math.random() * 4)), set: 5 }
          ];
          
          for (const set of sets) {
            benchProgressionData.push([sessionId, loggedExId, 'Bench Press', set.weight, set.reps, set.set]);
          }
          loggedExId += 4; // Skip to next push session's logged exercise IDs
        }
      }
  
      // Insert Bench Press weight data
      for (const data of benchProgressionData) {
        await db.runAsync('INSERT OR IGNORE INTO Weight_Log (workout_log_id, logged_exercise_id, exercise_name, weight_logged, reps_logged, set_number) VALUES (?, ?, ?, ?, ?, ?)', data);
      }
  
      // Generate Overhead Press progression
      const ohpProgressionData = [];
      let ohpWeight = 50.0;
      loggedExId = 2; // Second exercise in push sessions
      
      for (let sessionId = 1; sessionId <= workoutDates.length; sessionId++) {
        if ((sessionId - 1) % 3 === 0) { // Push day
          if (sessionId % 15 === 0) {
            ohpWeight -= 7.5; // Deload
          } else if (sessionId % 4 === 0) {
            ohpWeight += 2.5; // Increase weight every 4th session
          }
          
          const baseWeight = ohpWeight;
          const sets = [
            { weight: baseWeight, reps: 8, set: 1 },
            { weight: baseWeight, reps: Math.max(6, 8 - Math.floor(Math.random() * 2)), set: 2 },
            { weight: baseWeight - 2.5, reps: Math.max(5, 8 - Math.floor(Math.random() * 3)), set: 3 },
            { weight: baseWeight - 5.0, reps: Math.max(4, 8 - Math.floor(Math.random() * 4)), set: 4 }
          ];
          
          for (const set of sets) {
            ohpProgressionData.push([sessionId, loggedExId, 'Overhead Press', set.weight, set.reps, set.set]);
          }
          loggedExId += 4;
        }
      }
  
      // Insert OHP weight data
      for (const data of ohpProgressionData) {
        await db.runAsync('INSERT OR IGNORE INTO Weight_Log (workout_log_id, logged_exercise_id, exercise_name, weight_logged, reps_logged, set_number) VALUES (?, ?, ?, ?, ?, ?)', data);
      }
  
      // Generate Deadlift progression
      const deadliftProgressionData = [];
      let deadliftWeight = 120.0;
      loggedExId = 5; // First exercise in pull sessions (after push sessions)
      
      for (let sessionId = 1; sessionId <= workoutDates.length; sessionId++) {
        if ((sessionId - 1) % 3 === 1) { // Pull day
          if (sessionId % 18 === 0) {
            deadliftWeight -= 15; // Deload
          } else if (sessionId % 3 === 0) {
            deadliftWeight += 5.0; // Increase weight
          }
          
          const baseWeight = deadliftWeight;
          const sets = [
            { weight: baseWeight, reps: 5, set: 1 },
            { weight: baseWeight, reps: Math.max(4, 5 - Math.floor(Math.random() * 2)), set: 2 },
            { weight: baseWeight - 5.0, reps: Math.max(3, 5 - Math.floor(Math.random() * 2)), set: 3 },
            { weight: baseWeight - 10.0, reps: Math.max(3, 5 - Math.floor(Math.random() * 2)), set: 4 }
          ];
          
          for (const set of sets) {
            deadliftProgressionData.push([sessionId, loggedExId, 'Deadlift', set.weight, set.reps, set.set]);
          }
          loggedExId += 4;
        }
      }
  
      // Insert Deadlift weight data
      for (const data of deadliftProgressionData) {
        await db.runAsync('INSERT OR IGNORE INTO Weight_Log (workout_log_id, logged_exercise_id, exercise_name, weight_logged, reps_logged, set_number) VALUES (?, ?, ?, ?, ?, ?)', data);
      }
  
      // Generate Pull-ups progression (with added weight)
      const pullUpProgressionData = [];
      let pullUpWeight = 0.0;
      loggedExId = 6; // Second exercise in pull sessions
      
      for (let sessionId = 1; sessionId <= workoutDates.length; sessionId++) {
        if ((sessionId - 1) % 3 === 1) { // Pull day
          if (sessionId % 21 === 0) {
            pullUpWeight = Math.max(0, pullUpWeight - 10); // Deload
          } else if (sessionId % 5 === 0) {
            pullUpWeight += 2.5; // Increase weight
          }
          
          const baseWeight = pullUpWeight;
          const sets = [
            { weight: baseWeight, reps: 8, set: 1 },
            { weight: baseWeight, reps: Math.max(6, 8 - Math.floor(Math.random() * 2)), set: 2 },
            { weight: Math.max(0, baseWeight - 2.5), reps: Math.max(5, 8 - Math.floor(Math.random() * 3)), set: 3 },
            { weight: Math.max(0, baseWeight - 5.0), reps: Math.max(4, 8 - Math.floor(Math.random() * 4)), set: 4 }
          ];
          
          for (const set of sets) {
            pullUpProgressionData.push([sessionId, loggedExId, 'Pull-ups', set.weight, set.reps, set.set]);
          }
          loggedExId += 4;
        }
      }
  
      // Insert Pull-ups weight data
      for (const data of pullUpProgressionData) {
        await db.runAsync('INSERT OR IGNORE INTO Weight_Log (workout_log_id, logged_exercise_id, exercise_name, weight_logged, reps_logged, set_number) VALUES (?, ?, ?, ?, ?, ?)', data);
      }
  
      // Generate Squats progression
      const squatsProgressionData = [];
      let squatsWeight = 100.0;
      loggedExId = 9; // First exercise in legs sessions
      
      for (let sessionId = 1; sessionId <= workoutDates.length; sessionId++) {
        if ((sessionId - 1) % 3 === 2) { // Legs day
          if (sessionId % 15 === 0) {
            squatsWeight -= 12.5; // Deload
          } else if (sessionId % 3 === 0) {
            squatsWeight += 5.0; // Increase weight
          }
          
          const baseWeight = squatsWeight;
          const sets = [
            { weight: baseWeight, reps: 8, set: 1 },
            { weight: baseWeight, reps: Math.max(6, 8 - Math.floor(Math.random() * 2)), set: 2 },
            { weight: baseWeight - 5.0, reps: Math.max(5, 8 - Math.floor(Math.random() * 3)), set: 3 },
            { weight: baseWeight - 7.5, reps: Math.max(5, 8 - Math.floor(Math.random() * 3)), set: 4 },
            { weight: baseWeight - 10.0, reps: Math.max(4, 8 - Math.floor(Math.random() * 4)), set: 5 }
          ];
          
          for (const set of sets) {
            squatsProgressionData.push([sessionId, loggedExId, 'Squats', set.weight, set.reps, set.set]);
          }
          loggedExId += 4;
        }
      }
  
      // Insert Squats weight data
      for (const data of squatsProgressionData) {
        await db.runAsync('INSERT OR IGNORE INTO Weight_Log (workout_log_id, logged_exercise_id, exercise_name, weight_logged, reps_logged, set_number) VALUES (?, ?, ?, ?, ?, ?)', data);
      }
  
      console.log('Comprehensive test data inserted into the database.');
    } catch (error) {
      console.error('Error inserting test data:', error);
    }
  };