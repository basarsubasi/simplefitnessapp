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
        `INSERT OR IGNORE INTO Template_Exercises (day_id, exercise_name, sets, reps, web_link, muscle_group)
          VALUES 
          (1, 'Bench Press', 6, 8, 'https://www.youtube.com/watch?v=gRVjAtPip0Y', 'chest'),
          (1, 'Incline Bench Press', 4, 8, 'https://www.youtube.com/watch?v=lJ2o89kcnxY', 'chest'),
          (1, 'Cable Crossovers', 4, 12, 'https://www.youtube.com/watch?v=taI4XduLpTk', 'chest'),
          (1, 'Dumbell Shoulder Press', 4, 12, 'https://www.youtube.com/watch?v=qEwKCR5JCog', 'shoulders'),
          (1, 'Lateral Raises', 4, 15, 'https://www.youtube.com/watch?v=PzsMitRdI_8', 'shoulders'),
          (1, 'Skull Crushers', 4, 12, 'https://www.youtube.com/watch?v=l3rHYPtMUo8', 'triceps'),
          (2, 'Deadlift', 4, 8, 'https://www.youtube.com/watch?v=CN_7cz3P-1U', 'back'),
          (2, 'Lat Pulldown', 4, 12, 'https://www.youtube.com/watch?v=hnSqbBk15tw', 'back'),
          (2, 'T-Bar Row', 4, 8, 'https://www.youtube.com/watch?v=VmrKhFyC4cM', 'back'),
          (2, 'Hammer Curl', 4, 12, 'https://www.youtube.com/watch?v=VuEclXR7sZY', 'biceps'),
          (3, 'Back Squat', 6, 12, 'https://www.youtube.com/watch?v=ultWZbUMPL8', 'legs'),
          (3, 'Leg Extension', 4, 12, 'https://www.youtube.com/watch?v=m0FOpMEgero', 'legs'),
          (3, 'Leg Curl', 4, 12, 'https://www.youtube.com/watch?v=SiwJ_T62l9c', 'legs'),
          (3, 'Leg Press', 4, 8, 'https://www.youtube.com/watch?v=nDh_BlnLCGc', 'legs'),
          (3, 'Calf Raise', 4, 15, 'https://www.youtube.com/watch?v=c5Kv6-fnTj8', 'legs'),
          (4, 'Chest Press Machine', 3, 12, 'https://www.youtube.com/watch?v=2awX3rTGa1k', 'chest'),
          (4, 'Dumbell Fly', 3, 12, 'https://www.youtube.com/watch?v=JFm8KbhjibM', 'chest'),
          (4, 'Shoulder Press Machine', 3, 12, 'https://www.youtube.com/watch?v=WvLMauqrnK8', 'shoulders'),
          (4, 'Lateral Raises', 3, 12, 'https://www.youtube.com/watch?v=PzsMitRdI_8', 'shoulders'),
          (4, 'Lat Pulldown', 3, 12, 'https://www.youtube.com/watch?v=hnSqbBk15tw', 'back'),
          (4, 'Dumbell Curl', 3, 12, 'https://www.youtube.com/watch?v=MKWBV29S6c0', 'biceps'),
          (4, 'Triceps Pushdown', 3, 12, 'https://www.youtube.com/watch?v=1FjkhpZsaxc', 'triceps'),
          (4, 'Goblet Squat', 3, 12, 'https://www.youtube.com/watch?v=0OWbS1WiUGU', 'legs'),
          (5, 'Bench Press', 6, 6, 'https://www.youtube.com/watch?v=gRVjAtPip0Y', 'chest'),
          (5, 'Incline Bench Press', 6, 6, 'https://www.youtube.com/watch?v=lJ2o89kcnxY', 'chest'),
          (5, 'Decline Bench Press', 6, 6, 'https://www.youtube.com/watch?v=a-UFQE4oxWY', 'chest'),
          (5, 'Dumbell Fly', 6, 12, 'https://www.youtube.com/watch?v=JFm8KbhjibM', 'chest'),
          (5, 'Incline Dumbell Fly', 6, 12, 'https://www.youtube.com/watch?v=JFm8KbhjibM', 'chest'),
          (6, 'Lat Pulldown', 6, 12, 'https://www.youtube.com/watch?v=hnSqbBk15tw', 'back'),
          (6, 'Barbell Row', 6, 6, 'https://www.youtube.com/watch?v=6FZHJGzMFEc', 'back'),
          (6, 'Seated Row', 6, 6, 'https://www.youtube.com/watch?v=UCXxvVItLoM', 'back'),
          (6, 'Deadlift', 6, 6, 'https://www.youtube.com/watch?v=CN_7cz3P-1U', 'back'),
          (7, 'Arnold Press', 6, 6, 'https://www.youtube.com/watch?v=6Z15_WdXmVw', 'shoulders'),
          (7, 'Military Press', 6, 6, 'https://www.youtube.com/watch?v=G2qpTG1Eh40', 'shoulders'),
          (7, 'Lateral Raises', 6, 20, 'https://www.youtube.com/watch?v=PzsMitRdI_8', 'shoulders'),
          (7, 'Front Raises', 6, 12, 'https://www.youtube.com/watch?v=hRJ6tR5-if0', 'shoulders'),
          (8, 'Barbell Curl', 6, 12, 'https://www.youtube.com/watch?v=54x2WF1_Suc', 'biceps'),
          (8, 'Concentration Curl', 6, 12, 'https://www.youtube.com/watch?v=VMbDQ8PZazY', 'biceps'),
          (8, 'Scott Curl', 6, 12, 'https://www.youtube.com/watch?v=PJdMzP9yAus', 'biceps'),
          (8, 'Close Grip Bench Press', 6, 12, 'https://www.youtube.com/watch?v=FiQUzPtS90E', 'triceps'),
          (8, 'V Pushdown', 6, 12, 'https://www.youtube.com/watch?v=-xa-6cQaZKY', 'triceps'),
          (8, 'Skull Crushers', 6, 12, 'https://www.youtube.com/watch?v=l3rHYPtMUo8', 'triceps'),
          (9, 'Back Squat', 6, 6, 'https://www.youtube.com/watch?v=ultWZbUMPL8', 'legs'),
          (9, 'Leg Press', 6, 6, 'https://www.youtube.com/watch?v=nDh_BlnLCGc', 'legs'),
          (9, 'Leg Curl', 6, 12, 'https://www.youtube.com/watch?v=SiwJ_T62l9c', 'legs'),
          (9, 'Leg Extension', 6, 12, 'https://www.youtube.com/watch?v=m0FOpMEgero', 'legs');`
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
          `INSERT OR IGNORE INTO Template_Exercises (day_id, exercise_name, sets, reps, web_link, muscle_group)
          VALUES 
          -- Upper Lower: Upper (Strength)
          (10, 'Bench Press', 5, 5, 'https://www.youtube.com/watch?v=gRVjAtPip0Y', 'chest'),
          (10, 'Incline Dumbell Press', 5, 5, 'https://www.youtube.com/watch?v=8fXfwG4ftaQ', 'chest'),
          (10, 'Overhead Press', 5, 5, 'https://www.youtube.com/watch?v=cGnhixvC8uA', 'shoulders'),
          (10, 'Arnold Press', 5, 5, 'https://www.youtube.com/watch?v=6Z15_WdXmVw', 'shoulders'),
          (10, 'Barbell Row', 5, 5, 'https://www.youtube.com/watch?v=6FZHJGzMFEc', 'back'),
          (10, 'Dumbell Row', 5, 5, 'https://www.youtube.com/watch?v=DMo3HJoawrU', 'back'),

          -- Upper Lower: Lower (Strength)
          (11, 'Back Squat', 6, 6, 'https://www.youtube.com/watch?v=ultWZbUMPL8', 'legs'),
          (11, 'Front Squat', 6, 6, 'https://www.youtube.com/watch?v=HHxNbhP16UE', 'legs'),
          (11, 'Deadlift', 6, 6, 'https://www.youtube.com/watch?v=CN_7cz3P-1U', 'back'),
          (11, 'Barbell Hip Thrust', 6, 6, 'https://www.youtube.com/watch?v=5S8SApGU_Lk', 'legs'),

          -- Upper Lower: Upper (Hypertrophy)
          (12, 'Bench Press', 4, 15, 'https://www.youtube.com/watch?v=gRVjAtPip0Y', 'chest'),
          (12, 'Cable Crossovers', 4, 15, 'https://www.youtube.com/watch?v=taI4XduLpTk', 'chest'),
          (12, 'Dumbell Shoulder Press', 4, 15, 'https://www.youtube.com/watch?v=qEwKCR5JCog', 'shoulders'),
          (12, 'Lateral Raises', 6, 15, 'https://www.youtube.com/watch?v=PzsMitRdI_8', 'shoulders'),
          (12, 'Lat Pulldown', 4, 15, 'https://www.youtube.com/watch?v=hnSqbBk15tw', 'back'),
          (12, 'Seated Row', 4, 15, 'https://www.youtube.com/watch?v=UCXxvVItLoM', 'back'),
          (12, 'Triceps Pushdown', 4, 15, 'https://www.youtube.com/watch?v=1FjkhpZsaxc', 'triceps'),
          (12, 'Dumbell Curl', 4, 15, 'https://www.youtube.com/watch?v=MKWBV29S6c0', 'biceps'),

          -- Upper Lower: Lower (Hypertrophy)
          (13, 'Bulgarian Split Squat', 4, 15, 'https://www.youtube.com/watch?v=r3jzvjt-0l8', 'legs'),
          (13, 'Goblet Squat', 4, 15, 'https://www.youtube.com/watch?v=0OWbS1WiUGU', 'legs'),
          (13, 'Leg Press', 4, 15, 'https://www.youtube.com/watch?v=nDh_BlnLCGc', 'legs'),
          (13, 'Leg Extension', 4, 15, 'https://www.youtube.com/watch?v=m0FOpMEgero', 'legs'),
          (13, 'Leg Curl', 4, 15, 'https://www.youtube.com/watch?v=SiwJ_T62l9c', 'legs'),
          (13, 'Calf Raises', 4, 15, 'https://www.youtube.com/watch?v=c5Kv6-fnTj8', 'legs'),

          -- Optimize!: Chest & Arms
          (14, 'Bench Press', 6, 8, 'https://www.youtube.com/watch?v=gRVjAtPip0Y', 'chest'),
          (14, 'Incline Dumbell Press', 4, 12, 'https://www.youtube.com/watch?v=8fXfwG4ftaQ', 'chest'),
          (14, 'Pec Deck Machine', 4, 12, 'https://www.youtube.com/watch?v=FDay9wFe5uE', 'chest'),
          (14, 'Dumbell Curl', 4, 12, 'https://www.youtube.com/watch?v=MKWBV29S6c0', 'biceps'),
          (14, 'Triceps Pushdown', 4, 12, 'https://www.youtube.com/watch?v=1FjkhpZsaxc', 'triceps'),

          -- Optimize!: Back & Shoulders
          (15, 'Dumbell Shoulder Press', 6, 12, 'https://www.youtube.com/watch?v=qEwKCR5JCog', 'shoulders'),
          (15, 'Lateral Raises', 6, 15, 'https://www.youtube.com/watch?v=PzsMitRdI_8', 'shoulders'),
          (15, 'Front Raises', 4, 12, 'https://www.youtube.com/watch?v=hRJ6tR5-if0', 'shoulders'),
          (15, 'Lat Pulldown', 6, 12, 'https://www.youtube.com/watch?v=hnSqbBk15tw', 'back'),
          (15, 'T-Bar Row', 6, 12, 'https://www.youtube.com/watch?v=VmrKhFyC4cM', 'back'),

          -- Optimize!: Legs
          (16, 'Back Squat', 4, 10, 'https://www.youtube.com/watch?v=ultWZbUMPL8', 'legs'),
          (16, 'Leg Press', 4, 12, 'https://www.youtube.com/watch?v=nDh_BlnLCGc', 'legs'),
          (16, 'Leg Curl', 4, 12, 'https://www.youtube.com/watch?v=SiwJ_T62l9c', 'legs'),
          (16, 'Leg Extension', 4, 12, 'https://www.youtube.com/watch?v=m0FOpMEgero', 'legs'),
          (16, 'Calf Raises', 4, 12, 'https://www.youtube.com/watch?v=c5Kv6-fnTj8', 'legs'),

          -- Split it!: First Half
          (17, 'Bench Press', 3, 10, 'https://www.youtube.com/watch?v=gRVjAtPip0Y', 'chest'),
          (17, 'Dumbell Fly', 3, 12, 'https://www.youtube.com/watch?v=JFm8KbhjibM', 'chest'),
          (17, 'Shoulder Press Machine', 3, 10, 'https://www.youtube.com/watch?v=WvLMauqrnK8', 'shoulders'),
          (17, 'Lateral Raises', 3, 15, 'https://www.youtube.com/watch?v=PzsMitRdI_8', 'shoulders'),
          (17, 'Dumbell Curl', 3, 12, 'https://www.youtube.com/watch?v=MKWBV29S6c0', 'biceps'),

          -- Split it!: Second Half
          (18, 'Lat Pulldown', 3, 12, 'https://www.youtube.com/watch?v=hnSqbBk15tw', 'back'),
          (18, 'Dumbell Row', 3, 12, 'https://www.youtube.com/watch?v=DMo3HJoawrU', 'back'),
          (18, 'Goblet Squat', 3, 12, 'https://www.youtube.com/watch?v=0OWbS1WiUGU', 'legs'),
          (18, 'Hack Squat', 3, 12, 'https://www.youtube.com/watch?v=rYgNArpwE7E', 'legs'),
          (18, 'Triceps Pushdown', 3, 12, 'https://www.youtube.com/watch?v=1FjkhpZsaxc', 'triceps');`
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
    `INSERT OR IGNORE INTO Template_Exercises (day_id, exercise_name, sets, reps, web_link, muscle_group)
    VALUES
    -- Home Alone Exercises (day_id: 19)
    (19, 'Straight Push Ups', 4, 10, 'https://www.youtube.com/watch/4Bc1tPaYkOo', 'chest'),
    (19, 'Lateral Raises', 4, 12, 'https://www.youtube.com/watch?v=PzsMitRdI_8', 'shoulders'),
    (19, 'Dumbell Curl', 4, 12, 'https://www.youtube.com/watch?v=MKWBV29S6c0', 'biceps'),
    (19, 'Goblet Squats', 4, 12, 'https://www.youtube.com/watch?v=0OWbS1WiUGU', 'legs'),

    -- Calisthenics+ Exercises (day_id: 20)
    (20, 'Diamond Push Ups', 4, 10, 'https://www.youtube.com/watch?v=XtU2VQVuLYs', 'triceps'),
    (20, 'Pull ups', 4, 10, 'https://www.youtube.com/watch?v=FVqgCT9H1pg', 'back'),
    (20, 'Straight Push Ups', 4, 20, 'https://www.youtube.com/watch/4Bc1tPaYkOo', 'chest'),
    (20, 'Dumbell Shoulder Press', 4, 12, 'https://www.youtube.com/watch?v=qEwKCR5JCog', 'shoulders'),
    (20, 'Lateral Raises', 4, 20, 'https://www.youtube.com/watch?v=PzsMitRdI_8', 'shoulders'),
    (20, 'Concentration Curl', 4, 12, 'https://www.youtube.com/watch?v=VMbDQ8PZazY', 'biceps'),
    (20, 'Lunge', 4, 12, 'https://www.youtube.com/watch?v=tTej-ax9XiA', 'legs'),
    (20, 'Goblet Squats', 4, 12, 'https://www.youtube.com/watch?v=0OWbS1WiUGU', 'legs'),

    -- Bodyweight Beast Exercises (day_id: 21)
    (21, 'Devils Press', 4, 12, 'https://www.youtube.com/watch?v=hc6dfJHRcD0', 'shoulders'),
    (21, 'Pull ups', 6, 15, 'https://www.youtube.com/watch?v=FVqgCT9H1pg', 'back'),
    (21, 'Decline Push Ups', 4, 25, 'https://www.youtube.com/watch?v=QBlYp-EwHlo', 'chest'),
    (21, 'Incline Push Ups', 4, 25, 'https://www.youtube.com/watch?v=Gvm5Q29UHbk', 'chest'),
    (21, 'Plyometric Push Ups', 4, 12, 'https://www.youtube.com/watch?v=QcAAKuEgYjw', 'chest'),
    (21, 'Arnold Press', 4, 12, 'https://www.youtube.com/watch?v=6Z15_WdXmVw', 'shoulders'),
    (21, 'Lateral Raises', 6, 25, 'https://www.youtube.com/watch?v=PzsMitRdI_8', 'shoulders'),
    (21, 'Front Raises', 4, 12, 'https://www.youtube.com/watch?v=hRJ6tR5-if0', 'shoulders'),
    (21, 'Hammer Curl', 4, 12, 'https://www.youtube.com/watch?v=VuEclXR7sZY', 'biceps'),
    (21, 'Jumping Lunge', 4, 12, 'https://www.youtube.com/watch?v=cIkkHg8YZQU', 'legs'),
    (21, 'Bulgarian Split Squats', 4, 12, 'https://www.youtube.com/watch?v=r3jzvjt-0l8', 'legs');`
  );

  console.log(
    'Home Alone, Calisthenics+, and Bodyweight Beast workouts inserted into the database.'
  );


    } catch (error) {
      console.error('Error inserting workouts:', error);
    }
  };
  
