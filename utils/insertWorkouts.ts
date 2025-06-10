export const insertWorkouts = async (db: any) => {
    try {

     
        // Insert Workouts into Template_Workouts
       await db.runAsync(
          `INSERT OR IGNORE INTO Template_Workouts (workout_name, workout_difficulty)
          VALUES 
          ('Push Pull Legs', 'Intermediate'),
          ('Newbie Gains', 'Beginner'),
          ('Bro Split', 'Advanced');`
          
        );
  
        // Insert Days into Template_Days
      await  db.runAsync(
          `INSERT OR IGNORE INTO Template_Days (workout_id, day_name)
          VALUES 
          (1, 'Push Day'),
          (1, 'Pull Day'),
          (1, 'Leg Day'),
          (2, 'Newbie Gains Cycle'),
          (3, 'Chest'),
          (3, 'Back'),
          (3, 'Shoulders'),
          (3, 'Arms'),
          (3, 'Legs');`
        );
  
        // Insert Exercises into Template_Exercises
      await db.runAsync(          
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
          (3, 'Back Squat', 6, 12),
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
          (4, 'Goblet Squat', 3, 12),
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
          (9, 'Back Squat', 6, 6),
          (9, 'Leg Press', 6, 6),
          (9, 'Leg Curl', 6, 12),
          (9, 'Leg Extension', 6, 12);`
        );

        await db.runAsync(
          `INSERT OR IGNORE INTO Template_Workouts (workout_name, workout_difficulty)
          VALUES 
          ('Upper Lower', 'Advanced'),
          ('Optimize!', 'Intermediate'),
          ('Split it!', 'Beginner');`
      );

      // Insert Days into Template_Days
      await db.runAsync(
          `INSERT OR IGNORE INTO Template_Days (workout_id, day_name)
          VALUES 
          (4, 'Upper (Strength)'),
          (4, 'Lower (Strength)'),
          (4, 'Upper (Hypertrophy)'),
          (4, 'Lower (Hypertrophy)'),
          (5, 'Chest & Arms'),
          (5, 'Back & Shoulders'),
          (5, 'Legs'),
          (6, 'First Half'),
          (6, 'Second Half');`
      );

      // Insert Exercises into Template_Exercises
      await db.runAsync(
          `INSERT OR IGNORE INTO Template_Exercises (day_id, exercise_name, sets, reps)
          VALUES 
          -- Upper Lower: Upper (Strength)
          (10, 'Bench Press', 5, 5),
          (10, 'Dumbell Incline Bench Press', 5, 5),
          (10, 'Overhead Press', 5, 5),
          (10, 'Arnold Press', 5, 5),
          (10, 'Barbell Row', 5, 5),
          (10, 'Dumbell Row', 5, 5),

          -- Upper Lower: Lower (Strength)
          (11, 'Back Squat', 6, 6),
          (11, 'Front Squat', 6, 6),
          (11, 'Deadlift', 6, 6),
          (11, 'Barbell Hip Thrust', 6, 6),

          -- Upper Lower: Upper (Hypertrophy)
          (12, 'Bench Press', 4, 15),
          (12, 'Cable Crossovers', 4, 15),
          (12, 'Dumbell Shoulder Press', 4, 15),
          (12, 'Lateral Raises', 6, 15),
          (12, 'Lat Pulldown', 4, 15),
          (12, 'Seated Row', 4, 15),
          (12, 'Triceps Pushdown', 4, 15),
          (12, 'Biceps Curl', 4, 15),

          -- Upper Lower: Lower (Hypertrophy)
          (13, 'Bulgarian Split Squat', 4, 15),
          (13, 'Goblet Squat', 4, 15),
          (13, 'Leg Press', 4, 15),
          (13, 'Leg Extension', 4, 15),
          (13, 'Leg Curl', 4, 15),
          (13, 'Calf Raises', 4, 15),

          -- Optimize!: Chest & Arms
          (14, 'Bench Press', 6, 8),
          (14, 'Incline Dumbell Press', 4, 12),
          (14, 'Pec Deck Machine', 4, 12),
          (14, 'Dumbell Curl', 4, 12),
          (14, 'Triceps Pushdown', 4, 12),

          -- Optimize!: Back & Shoulders
          (15, 'Dumbell Shoulder Press', 6, 12),
          (15, 'Lateral Raises', 6, 15),
          (15, 'Front Raises', 4, 12),
          (15, 'Lat Pulldown', 6, 12),
          (15, 'T-Bar Row', 6, 12),

          -- Optimize!: Legs
          (16, 'Back Squat', 4, 10),
          (16, 'Leg Press', 4, 12),
          (16, 'Leg Curl', 4, 12),
          (16, 'Leg Extension', 4, 12),
          (16, 'Calf Raises', 4, 12),

          -- Split it!: First Half
          (17, 'Bench Press', 3, 10),
          (17, 'Dumbell Fly', 3, 12),
          (17, 'Shoulder Press Machine', 3, 10),
          (17, 'Lateral Raises', 3, 15),
          (17, 'Dumbell Curl', 3, 12),

          -- Split it!: Second Half
          (18, 'Lat Pulldown', 3, 12),
          (18, 'Dumbell Row', 3, 12),
          (18, 'Goblet Squat', 3, 12),
          (18, 'Hack Squat', 3, 12),
          (18, 'Triceps Pushdown', 3, 12);`
      );
  
        console.log('Initial  Template workouts inserted into the database.');
        
   // Insert more Workouts into Template_Workouts
   await db.runAsync(
    `INSERT OR IGNORE INTO Template_Workouts (workout_name, workout_difficulty)
    VALUES
    ('Home Alone', 'Beginner'),
    ('Calisthenics+', 'Intermediate'),
    ('Bodyweight Beast', 'Advanced');`
  );

  // Insert more Days into Template_Days

  await db.runAsync(
    `INSERT OR IGNORE INTO Template_Days (workout_id, day_name)
    VALUES
    (7, 'Home Alone Cycle'),
    (8, 'Calisthenics+ Cycle'),
    (9, 'Bodyweight Beast Cycle');`
  );

  // Insert more Exercises into Template_Exercises
  
  await db.runAsync(
    `INSERT OR IGNORE INTO Template_Exercises (day_id, exercise_name, sets, reps)
    VALUES
    -- Home Alone Exercises (day_id: 19)
    (19, 'Push Ups', 4, 10),
    (19, 'Lateral Raises', 4, 12),
    (19, 'Dumbell Curl', 4, 12),
    (19, 'Goblet Squats', 4, 12),

    -- Calisthenics+ Exercises (day_id: 20)
    (20, 'Diamond Push Ups', 4, 10),
    (20, 'Pull ups', 4, 10),
    (20, 'Straight Push Ups', 4, 20),
    (20, 'Dumbell Shoulder Press', 4, 12),
    (20, 'Lateral Raises', 4, 20),
    (20, 'Concentration Curl', 4, 12),
    (20, 'Lunge', 4, 12),
    (20, 'Goblet Squats', 4, 12),

    -- Bodyweight Beast Exercises (day_id: 21)
    (21, 'Devils Press', 4, 12),
    (21, 'Pull ups', 6, 15),
    (21, 'Decline Push Ups', 4, 25),
    (21, 'Incline Push Ups', 4, 25),
    (21, 'Plyometric Push Ups', 4, 12),
    (21, 'Arnold Press', 4, 12),
    (21, 'Lateral Raises', 6, 25),
    (21, 'Front Raises', 4, 12),
    (21, 'Hammer Curl', 4, 12),
    (21, 'Jumping Lunge', 4, 12),
    (21, 'Bulgarian Split Squats', 4, 12);`
  );

  console.log(
    'Home Alone, Calisthenics+, and Bodyweight Beast workouts inserted into the database.'
  );


    } catch (error) {
      console.error('Error inserting workouts:', error);
    }
  };
  