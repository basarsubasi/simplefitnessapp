export const addRecurringTable = async (db: any) => {
    try {

        await db.runAsync(
          `CREATE TABLE IF NOT EXISTS Recurring_Workouts (
           recurring_workout_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
            workout_id INTEGER NOT NULL,
            workout_name TEXT NOT NULL,
            day_name TEXT NOT NULL,
            recurring_start_date INTEGER NOT NULL,
            recurring_interval INTEGER NOT NULL,
            recurring_days TEXT,
            FOREIGN KEY (workout_id) REFERENCES Workouts(workout_id) ON DELETE CASCADE,
            UNIQUE (workout_id, day_name)
          );`
        );

        console.log("tables created")
    } catch (error) {
      console.error('Database initialization error:', error);
    }

  };


  // Create triggers to update recurring workouts when workout names change
export const createUpdateTriggers = async (db: any) => {
    try {
      // When a workout name changes, update all recurring entries
      await db.runAsync(`
        CREATE TRIGGER IF NOT EXISTS update_recurring_workout_name
        AFTER UPDATE OF workout_name ON Workouts
        FOR EACH ROW
        BEGIN
          UPDATE Recurring_Workouts 
          SET workout_name = NEW.workout_name
          WHERE workout_id = OLD.workout_id;
        END;
      `);
      
      // When a day name changes, update all recurring entries
      await db.runAsync(`
        CREATE TRIGGER IF NOT EXISTS update_recurring_day_name
        AFTER UPDATE OF day_name ON Days
        FOR EACH ROW
        BEGIN
          UPDATE Recurring_Workouts 
          SET day_name = NEW.day_name
          WHERE workout_id = (SELECT workout_id FROM Days WHERE day_id = OLD.day_id)
          AND day_name = OLD.day_name;
        END;
      `);
      
      // When a workout is deleted, delete associated recurring workouts
      await db.runAsync(`
        CREATE TRIGGER IF NOT EXISTS delete_recurring_workout
        AFTER DELETE ON Workouts
        FOR EACH ROW
        BEGIN
          DELETE FROM Recurring_Workouts
          WHERE workout_id = OLD.workout_id;
        END;
      `);
      
      // When a day is deleted, delete associated recurring workouts
      await db.runAsync(`
        CREATE TRIGGER IF NOT EXISTS delete_recurring_day
        AFTER DELETE ON Days
        FOR EACH ROW
        BEGIN
          DELETE FROM Recurring_Workouts
          WHERE workout_id = OLD.workout_id AND day_name = OLD.day_name;
        END;
      `);
      
      console.log('Created database triggers for recurring workouts');
    } catch (error) {
      console.error('Error creating triggers:', error);
    }
  };