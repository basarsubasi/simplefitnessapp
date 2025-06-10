export const addTables = async (db: any) => {
    try {

      await db.runAsync(`DROP TABLE IF EXISTS Template_Exercises;`);
      await db.runAsync(`DROP TABLE IF EXISTS Template_Days;`);
      await db.runAsync(`DROP TABLE IF EXISTS Template_Workouts;`);
      await db.runAsync(`DROP TABLE IF EXISTS Template_Workouts;`);



   await db.runAsync(
        
          `CREATE TABLE IF NOT EXISTS Template_Workouts (
            workout_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
            workout_name TEXT NOT NULL UNIQUE,
            workout_difficulty TEXT NOT NULL
          );`
        );
  
       await db.runAsync(
          `CREATE TABLE IF NOT EXISTS Template_Days (
            day_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
            workout_id INTEGER NOT NULL,
            day_name TEXT NOT NULL,
            FOREIGN KEY (workout_id) REFERENCES Template_Workouts(workout_id) ON DELETE CASCADE,
            UNIQUE(workout_id, day_name)
          );`
        );
  
        await db.runAsync(
          `CREATE TABLE IF NOT EXISTS Template_Exercises (
            exercise_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
            day_id INTEGER NOT NULL,
            exercise_name TEXT NOT NULL,
            sets INTEGER NOT NULL,
            reps INTEGER NOT NULL,
            FOREIGN KEY (day_id) REFERENCES Template_Days(day_id) ON DELETE CASCADE
            UNIQUE(day_id, exercise_name)
          );`
        );


        await db.runAsync(
          `CREATE TABLE IF NOT EXISTS Recurring_Workouts (
           recurring_workout_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
            workout_id INTEGER NOT NULL,
            workout_name TEXT NOT NULL,
            day_name TEXT NOT NULL,
            recurring_start_date INTEGER NOT NULL,
            recurring_interval INTEGER NOT NULL,
            recurring_days TEXT,
            notification_id TEXT,
            notification_enabled BOOLEAN NOT NULL,
            notification_time TEXT,
            FOREIGN KEY (workout_id) REFERENCES Workouts(workout_id) ON DELETE CASCADE,
            UNIQUE (workout_id, day_name)
          );`
        );

        console.log("tables created")
    } catch (error) {
      console.error('Database initialization error:', error);
    }

  };