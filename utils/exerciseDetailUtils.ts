import { type SQLiteDatabase } from 'expo-sqlite';

export const addWebLinkColumn = async (db: SQLiteDatabase) => {
    const tables = ['Exercises', 'Logged_Exercises'];
    try {
        for (const table of tables) {
            const columns = await db.getAllAsync<any>(`PRAGMA table_info(${table});`);
            const columnExists = columns.some((col: any) => col.name === 'web_link');
            console.log("column check", columnExists);

            if (!columnExists) {
                await db.runAsync(`ALTER TABLE ${table} ADD COLUMN web_link TEXT;`);
                console.log(`'web_link' column added to '${table}' table.`);
            }
        }
    } catch (error) {
        console.error('Error adding web_link column:', error);
    }
};

export const addMuscleGroupColumn = async (db: SQLiteDatabase) => {
    const tables = ['Exercises', 'Logged_Exercises'];
    try {
        for (const table of tables) {
            const columns = await db.getAllAsync<any>(`PRAGMA table_info(${table});`);
            const columnExists = columns.some((col: any) => col.name === 'muscle_group');

            if (!columnExists) {
                await db.runAsync(`ALTER TABLE ${table} ADD COLUMN muscle_group TEXT;`);
                console.log(`'muscle_group' column added to '${table}' table.`);
            }
        }
    } catch (error) {
        console.error('Error adding muscle_group column:', error);
    }
};

export const addMuscleGroupToWeightLog = async (db: SQLiteDatabase) => {
    const table = 'Weight_Log';
    try {
        const columns = await db.getAllAsync<any>(`PRAGMA table_info(${table});`);
        const columnExists = columns.some((col: any) => col.name === 'muscle_group');

        if (!columnExists) {
            await db.runAsync(`ALTER TABLE ${table} ADD COLUMN muscle_group TEXT;`);
            console.log(`'muscle_group' column added to '${table}' table.`);
        }
    } catch (error) {
        console.error('Error adding muscle_group column to Weight_Log:', error);
    }
};