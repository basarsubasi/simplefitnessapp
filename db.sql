-- db.sql


-- Updated Schema
CREATE TABLE IF NOT EXISTS  Template_Workouts (
    workout_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    workout_name TEXT NOT NULL UNIQUE
    workout_difficulty TEXT NOT NULL
)


CREATE TABLE IF NOT EXISTS Template_Days (
    day_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    workout_id INTEGER NOT NULL,
    day_name TEXT NOT NULL,
    FOREIGN KEY (workout_id) REFERENCES Template_Workouts(workout_id) ON DELETE CASCADE,
    UNIQUE(workout_id, day_name)
);

CREATE TABLE IF NOT EXISTS Template_Exercises (
    exercise_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    day_id INTEGER NOT NULL,
    exercise_name TEXT NOT NULL,
    sets INTEGER NOT NULL,
    reps INTEGER NOT NULL,
    web_link TEXT,
    FOREIGN KEY (day_id) REFERENCES Template_Days(day_id) ON DELETE CASCADE,
    UNIQUE(day_id, exercise_name)
);




CREATE TABLE IF NOT EXISTS Workouts (
    workout_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    workout_name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS Days (
    day_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    workout_id INTEGER NOT NULL,
    day_name TEXT NOT NULL,
    FOREIGN KEY (workout_id) REFERENCES Workouts(workout_id) ON DELETE CASCADE,
    UNIQUE(workout_id, day_name)
);

CREATE TABLE IF NOT EXISTS Exercises (
    exercise_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    day_id INTEGER NOT NULL,
    exercise_name TEXT NOT NULL,
    sets INTEGER NOT NULL,
    reps INTEGER NOT NULL,
    web_link TEXT,
    muscle_group TEXT,
    FOREIGN KEY (day_id) REFERENCES Days(day_id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS Workout_Log (
    workout_log_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    workout_name TEXT NOT NULL,
    day_name TEXT NOT NULL,
    workout_date INTEGER NOT NULL,
    UNIQUE (workout_date, day_name, workout_name) -- Properly placed UNIQUE constraint
);

CREATE TABLE IF NOT EXISTS Weight_Log (
    weight_log_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, -- Primary Key
    workout_log_id INTEGER NOT NULL, -- Foreign Key to Workout_Log
    logged_exercise_id INTEGER NOT NULL, -- Foreign Key to Logged_Exercises
    exercise_name TEXT NOT NULL, -- Exercise name copied from Logged_Exercises for better redundancy
    set_number INTEGER NOT NULL, -- Which set (e.g., Set 1, Set 2)
    weight_logged REAL NOT NULL, -- Weight for that set
    reps_logged INTEGER NOT NULL, -- Reps for that set
    FOREIGN KEY (workout_log_id) REFERENCES Workout_Log(workout_log_id) ON DELETE CASCADE,
    FOREIGN KEY (logged_exercise_id) REFERENCES Logged_Exercises(logged_exercise_id),
    UNIQUE (workout_log_id, logged_exercise_id, set_number) -- Ensure no duplicate entries for the same set
);



CREATE TABLE IF NOT EXISTS Logged_Exercises (
    logged_exercise_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    workout_log_id INTEGER NOT NULL, -- Foreign Key to Workout_Log
    exercise_name TEXT NOT NULL, -- Store exercise name
    sets INTEGER NOT NULL, -- Store sets at the time of logging
    reps INTEGER NOT NULL, -- Store reps at the time of logging
    web_link TEXT,
    muscle_group TEXT,
    FOREIGN KEY (workout_log_id) REFERENCES Workout_Log(workout_log_id) ON DELETE CASCADE
);  

ALTER TABLE Workout_Log ADD COLUMN notification_id TEXT;

ALTER TABLE Workout_Log ADD COLUMN completion_time INTEGER;
ALTER TABLE Weight_Log ADD COLUMN completion_time INTEGER;
ALTER TABLE Exercises ADD COLUMN web_link  TEXT;
ALTER TABLE Logged_Exercises ADD COLUMN web_link TEXT;
ALTER TABLE Exercises ADD COLUMN muscle_group TEXT;
ALTER TABLE Logged_Exercises ADD COLUMN muscle_group INTEGER;







