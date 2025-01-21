export const insertWorkouts = async (db: any) => {
    try {
        // Insert Workouts into Template_Workouts
        db.runAsync(
          `INSERT OR IGNORE INTO Template_Workouts (workout_name, workout_difficulty)
          VALUES 
          ('Push Pull Legs', 'Intermediate'),
          ('Newbie\'s Luck', 'Beginner'),
          ('Bro Split', 'Advanced');`
        );
  
        // Insert Days into Template_Days
        db.runAsync(
          `INSERT OR IGNORE INTO Template_Days (workout_id, day_name)
          VALUES 
          (1, 'Push Day'),
          (1, 'Pull Day'),
          (1, 'Leg Day'),
          (2, 'Day 1'),
          (3, 'Chest'),
          (3, 'Back'),
          (3, 'Shoulders'),
          (3, 'Arms'),
          (3, 'Legs');`
        );
  
        // Insert Exercises into Template_Exercises
        db.runAsync(          
        `INSERT OR IGNORE INTO Template_Exercises (day_id, exercise_name, sets, reps)
          VALUES 
          (1, 'Bench Press', 6, 8),
          (1, 'Incline Bench Press', 4, 8),
          (1, 'Cable Crossovers', 4, 12),
          (1, 'Dumbell Shoulder Press', 4, 12),
          (1, 'Lateral Raises', 4, 15),
          (1, 'Skull Crushers', 4, 12),
          (2, 'Deadlift', 4, 8),
          (2, 'Lat Pulldown', 4, 12),
          (2, 'T-Bar Row', 4, 8),
          (2, 'Hammer Curl', 4, 12),
          (3, 'Squat', 6, 12),
          (3, 'Leg Extension', 4, 12),
          (3, 'Leg Curl', 4, 12),
          (3, 'Leg Press', 4, 8),
          (3, 'Calf Raise', 4, 15),
          (4, 'Chest Press Machine', 3, 12),
          (4, 'Dumbell Fly', 3, 12),
          (4, 'Shoulder Press Machine', 3, 12),
          (4, 'Lateral Raises', 3, 12),
          (4, 'Lat Pulldown', 3, 12),
          (4, 'Dumbell Curl', 3, 12),
          (4, 'Triceps Pushdown', 3, 12),
          (4, 'Goblet Squats', 3, 12),
          (5, 'Bench Press', 6, 6),
          (5, 'Incline Bench Press', 6, 6),
          (5, 'Decline Bench Press', 6, 6),
          (5, 'Dumbell Fly', 6, 12),
          (5, 'Incline Dumbell Fly', 6, 12),
          (6, 'Lat Pulldown', 6, 12),
          (6, 'Barbell Row', 6, 6),
          (6, 'Seated Row', 6, 6),
          (6, 'Deadlift', 6, 6),
          (7, 'Arnold Press', 6, 6),
          (7, 'Military Press', 6, 6),
          (7, 'Lateral Raises', 6, 20),
          (7, 'Front Raises', 6, 12),
          (8, 'Barbell Curl', 6, 12),
          (8, 'Concentration Curl', 6, 12),
          (8, 'Scott Curl', 6, 12),
          (8, 'Close Grip Bench Press', 6, 12),
          (8, 'V Pushdown', 6, 12),
          (8, 'Skull Crushers', 6, 12),
          (9, 'Squats', 6, 6),
          (9, 'Leg Press', 6, 6),
          (9, 'Leg Curl', 6, 12),
          (9, 'Leg Extension', 6, 12);`
        );
  
        console.log('Initial workouts inserted into the database.');
    } catch (error) {
      console.error('Error inserting workouts:', error);
    }
  };
  