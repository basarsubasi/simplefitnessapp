export const addTables = async (db: any) => {
    try {
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
        console.log("tables created")
    } catch (error) {
      console.error('Database initialization error:', error);
    }

  };