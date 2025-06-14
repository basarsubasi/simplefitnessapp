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
        `INSERT OR IGNORE INTO Template_Exercises (day_id, exercise_name, sets, reps, web_link)
          VALUES 
          (1, 'Bench Press', 6, 8, 'https://www.youtube.com/watch?v=gRVjAtPip0Y'),
          (1, 'Incline Bench Press', 4, 8, 'https://www.youtube.com/watch?v=lJ2o89kcnxY'),
          (1, 'Cable Crossovers', 4, 12, 'https://www.youtube.com/watch?v=taI4XduLpTk'),
          (1, 'Dumbell Shoulder Press', 4, 12, 'https://www.youtube.com/watch?v=qEwKCR5JCog'),
          (1, 'Lateral Raises', 4, 15, 'https://www.youtube.com/watch?v=PzsMitRdI_8'),
          (1, 'Skull Crushers', 4, 12, 'https://www.youtube.com/watch?v=l3rHYPtMUo8'),
          (2, 'Deadlift', 4, 8, 'https://www.youtube.com/watch?v=CN_7cz3P-1U'),
          (2, 'Lat Pulldown', 4, 12, 'https://www.youtube.com/watch?v=hnSqbBk15tw'),
          (2, 'T-Bar Row', 4, 8, 'https://www.youtube.com/watch?v=VmrKhFyC4cM'),
          (2, 'Hammer Curl', 4, 12, 'https://www.youtube.com/watch?v=VuEclXR7sZY'),
          (3, 'Back Squat', 6, 12, 'https://www.youtube.com/watch?v=ultWZbUMPL8'),
          (3, 'Leg Extension', 4, 12, 'https://www.youtube.com/watch?v=m0FOpMEgero'),
          (3, 'Leg Curl', 4, 12, 'https://www.youtube.com/watch?v=SiwJ_T62l9c'),
          (3, 'Leg Press', 4, 8, 'https://www.youtube.com/watch?v=nDh_BlnLCGc'),
          (3, 'Calf Raise', 4, 15, 'https://www.youtube.com/watch?v=c5Kv6-fnTj8'),
          (4, 'Chest Press Machine', 3, 12, 'https://www.youtube.com/watch?v=2awX3rTGa1k'),
          (4, 'Dumbell Fly', 3, 12, 'https://www.youtube.com/watch?v=JFm8KbhjibM'),
          (4, 'Shoulder Press Machine', 3, 12, 'https://www.youtube.com/watch?v=WvLMauqrnK8'),
          (4, 'Lateral Raises', 3, 12, 'https://www.youtube.com/watch?v=PzsMitRdI_8'),
          (4, 'Lat Pulldown', 3, 12, 'https://www.youtube.com/watch?v=hnSqbBk15tw'),
          (4, 'Dumbell Curl', 3, 12, 'https://www.youtube.com/watch?v=MKWBV29S6c0'),
          (4, 'Triceps Pushdown', 3, 12, 'https://www.youtube.com/watch?v=1FjkhpZsaxc'),
          (4, 'Goblet Squat', 3, 12, 'https://www.youtube.com/watch?v=0OWbS1WiUGU'),
          (5, 'Bench Press', 6, 6, 'https://www.youtube.com/watch?v=gRVjAtPip0Y'),
          (5, 'Incline Bench Press', 6, 6, 'https://www.youtube.com/watch?v=lJ2o89kcnxY'),
          (5, 'Decline Bench Press', 6, 6, 'https://www.youtube.com/watch?v=a-UFQE4oxWY'),
          (5, 'Dumbell Fly', 6, 12, 'https://www.youtube.com/watch?v=JFm8KbhjibM'),
          (5, 'Incline Dumbell Fly', 6, 12, 'https://www.youtube.com/watch?v=JFm8KbhjibM'),
          (6, 'Lat Pulldown', 6, 12, 'https://www.youtube.com/watch?v=hnSqbBk15tw'),
          (6, 'Barbell Row', 6, 6, 'https://example.com'),
          (6, 'Seated Row', 6, 6, 'https://example.com'),
          (6, 'Deadlift', 6, 6, 'https://www.youtube.com/watch?v=CN_7cz3P-1U'),
          (7, 'Arnold Press', 6, 6, 'https://example.com'),
          (7, 'Military Press', 6, 6, 'https://example.com'),
          (7, 'Lateral Raises', 6, 20, 'https://www.youtube.com/watch?v=PzsMitRdI_8'),
          (7, 'Front Raises', 6, 12, 'https://example.com'),
          (8, 'Barbell Curl', 6, 12, 'https://example.com'),
          (8, 'Concentration Curl', 6, 12, 'https://example.com'),
          (8, 'Scott Curl', 6, 12, 'https://example.com'),
          (8, 'Close Grip Bench Press', 6, 12, 'https://example.com'),
          (8, 'V Pushdown', 6, 12, 'https://example.com'),
          (8, 'Skull Crushers', 6, 12, 'https://www.youtube.com/watch?v=l3rHYPtMUo8'),
          (9, 'Back Squat', 6, 6, 'https://www.youtube.com/watch?v=ultWZbUMPL8'),
          (9, 'Leg Press', 6, 6, 'https://www.youtube.com/watch?v=nDh_BlnLCGc'),
          (9, 'Leg Curl', 6, 12, 'https://www.youtube.com/watch?v=SiwJ_T62l9c'),
          (9, 'Leg Extension', 6, 12, 'https://www.youtube.com/watch?v=m0FOpMEgero');`
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
          `INSERT OR IGNORE INTO Template_Exercises (day_id, exercise_name, sets, reps, web_link)
          VALUES 
          -- Upper Lower: Upper (Strength)
          (10, 'Bench Press', 5, 5, 'https://example.com'),
          (10, 'Dumbell Incline Bench Press', 5, 5, 'https://example.com'),
          (10, 'Overhead Press', 5, 5, 'https://example.com'),
          (10, 'Arnold Press', 5, 5, 'https://example.com'),
          (10, 'Barbell Row', 5, 5, 'https://example.com'),
          (10, 'Dumbell Row', 5, 5, 'https://example.com'),

          -- Upper Lower: Lower (Strength)
          (11, 'Back Squat', 6, 6, 'https://www.youtube.com/watch?v=ultWZbUMPL8'),
          (11, 'Front Squat', 6, 6, 'https://example.com'),
          (11, 'Deadlift', 6, 6, 'https://www.youtube.com/watch?v=CN_7cz3P-1U'),
          (11, 'Barbell Hip Thrust', 6, 6, 'https://example.com'),

          -- Upper Lower: Upper (Hypertrophy)
          (12, 'Bench Press', 4, 15, 'https://example.com'),
          (12, 'Cable Crossovers', 4, 15, 'https://www.youtube.com/watch?v=taI4XduLpTk'),
          (12, 'Dumbell Shoulder Press', 4, 15, 'https://www.youtube.com/watch?v=qEwKCR5JCog'),
          (12, 'Lateral Raises', 6, 15, 'https://www.youtube.com/watch?v=PzsMitRdI_8'),
          (12, 'Lat Pulldown', 4, 15, 'https://www.youtube.com/watch?v=hnSqbBk15tw'),
          (12, 'Seated Row', 4, 15, 'https://example.com'),
          (12, 'Triceps Pushdown', 4, 15, 'https://www.youtube.com/watch?v=1FjkhpZsaxc'),
          (12, 'Biceps Curl', 4, 15, 'https://example.com'),

          -- Upper Lower: Lower (Hypertrophy)
          (13, 'Bulgarian Split Squat', 4, 15, 'https://example.com'),
          (13, 'Goblet Squat', 4, 15, 'https://www.youtube.com/watch?v=0OWbS1WiUGU'),
          (13, 'Leg Press', 4, 15, 'https://www.youtube.com/watch?v=nDh_BlnLCGc'),
          (13, 'Leg Extension', 4, 15, 'https://www.youtube.com/watch?v=m0FOpMEgero'),
          (13, 'Leg Curl', 4, 15, 'https://www.youtube.com/watch?v=SiwJ_T62l9c'),
          (13, 'Calf Raises', 4, 15, 'https://www.youtube.com/watch?v=c5Kv6-fnTj8'),

          -- Optimize!: Chest & Arms
          (14, 'Bench Press', 6, 8, 'https://example.com'),
          (14, 'Incline Dumbell Press', 4, 12, 'https://example.com'),
          (14, 'Pec Deck Machine', 4, 12, 'https://example.com'),
          (14, 'Dumbell Curl', 4, 12, 'https://www.youtube.com/watch?v=MKWBV29S6c0'),
          (14, 'Triceps Pushdown', 4, 12, 'https://www.youtube.com/watch?v=1FjkhpZsaxc'),

          -- Optimize!: Back & Shoulders
          (15, 'Dumbell Shoulder Press', 6, 12, 'https://www.youtube.com/watch?v=qEwKCR5JCog'),
          (15, 'Lateral Raises', 6, 15, 'https://www.youtube.com/watch?v=PzsMitRdI_8'),
          (15, 'Front Raises', 4, 12, 'https://example.com'),
          (15, 'Lat Pulldown', 6, 12, 'https://www.youtube.com/watch?v=hnSqbBk15tw'),
          (15, 'T-Bar Row', 6, 12, 'https://www.youtube.com/watch?v=VmrKhFyC4cM'),

          -- Optimize!: Legs
          (16, 'Back Squat', 4, 10, 'https://www.youtube.com/watch?v=ultWZbUMPL8'),
          (16, 'Leg Press', 4, 12, 'https://www.youtube.com/watch?v=nDh_BlnLCGc'),
          (16, 'Leg Curl', 4, 12, 'https://www.youtube.com/watch?v=SiwJ_T62l9c'),
          (16, 'Leg Extension', 4, 12, 'https://www.youtube.com/watch?v=m0FOpMEgero'),
          (16, 'Calf Raises', 4, 12, 'https://www.youtube.com/watch?v=c5Kv6-fnTj8'),

          -- Split it!: First Half
          (17, 'Bench Press', 3, 10, 'https://example.com'),
          (17, 'Dumbell Fly', 3, 12, 'https://www.youtube.com/watch?v=JFm8KbhjibM'),
          (17, 'Shoulder Press Machine', 3, 10, 'https://www.youtube.com/watch?v=WvLMauqrnK8'),
          (17, 'Lateral Raises', 3, 15, 'https://www.youtube.com/watch?v=PzsMitRdI_8'),
          (17, 'Dumbell Curl', 3, 12, 'https://www.youtube.com/watch?v=MKWBV29S6c0'),

          -- Split it!: Second Half
          (18, 'Lat Pulldown', 3, 12, 'https://www.youtube.com/watch?v=hnSqbBk15tw'),
          (18, 'Dumbell Row', 3, 12, 'https://example.com'),
          (18, 'Goblet Squat', 3, 12, 'https://www.youtube.com/watch?v=0OWbS1WiUGU'),
          (18, 'Hack Squat', 3, 12, 'https://example.com'),
          (18, 'Triceps Pushdown', 3, 12, 'https://www.youtube.com/watch?v=1FjkhpZsaxc');`
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
    `INSERT OR IGNORE INTO Template_Exercises (day_id, exercise_name, sets, reps, web_link)
    VALUES
    -- Home Alone Exercises (day_id: 19)
    (19, 'Push Ups', 4, 10, 'https://example.com'),
    (19, 'Lateral Raises', 4, 12, 'https://www.youtube.com/watch?v=PzsMitRdI_8'),
    (19, 'Dumbell Curl', 4, 12, 'https://www.youtube.com/watch?v=MKWBV29S6c0'),
    (19, 'Goblet Squats', 4, 12, 'https://www.youtube.com/watch?v=0OWbS1WiUGU'),

    -- Calisthenics+ Exercises (day_id: 20)
    (20, 'Diamond Push Ups', 4, 10, 'https://example.com'),
    (20, 'Pull ups', 4, 10, 'https://example.com'),
    (20, 'Straight Push Ups', 4, 20, 'https://example.com'),
    (20, 'Dumbell Shoulder Press', 4, 12, 'https://www.youtube.com/watch?v=qEwKCR5JCog'),
    (20, 'Lateral Raises', 4, 20, 'https://www.youtube.com/watch?v=PzsMitRdI_8'),
    (20, 'Concentration Curl', 4, 12, 'https://example.com'),
    (20, 'Lunge', 4, 12, 'https://example.com'),
    (20, 'Goblet Squats', 4, 12, 'https://www.youtube.com/watch?v=0OWbS1WiUGU'),

    -- Bodyweight Beast Exercises (day_id: 21)
    (21, 'Devils Press', 4, 12, 'https://example.com'),
    (21, 'Pull ups', 6, 15, 'https://example.com'),
    (21, 'Decline Push Ups', 4, 25, 'https://example.com'),
    (21, 'Incline Push Ups', 4, 25, 'https://example.com'),
    (21, 'Plyometric Push Ups', 4, 12, 'https://example.com'),
    (21, 'Arnold Press', 4, 12, 'https://example.com'),
    (21, 'Lateral Raises', 6, 25, 'https://www.youtube.com/watch?v=PzsMitRdI_8'),
    (21, 'Front Raises', 4, 12, 'https://example.com'),
    (21, 'Hammer Curl', 4, 12, 'https://www.youtube.com/watch?v=VuEclXR7sZY'),
    (21, 'Jumping Lunge', 4, 12, 'https://example.com'),
    (21, 'Bulgarian Split Squats', 4, 12, 'https://example.com');`
  );

  console.log(
    'Home Alone, Calisthenics+, and Bodyweight Beast workouts inserted into the database.'
  );


    } catch (error) {
      console.error('Error inserting workouts:', error);
    }
  };
  