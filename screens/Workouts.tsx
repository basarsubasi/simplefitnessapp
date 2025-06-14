// screens/Workouts.tsx

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Workout } from '../utils/types';
import WorkoutList from '../components/WorkoutList';
import { useSQLiteContext } from 'expo-sqlite';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { addWebLinkColumn } from '../utils/linkUtils';



export default function Workouts() {
  const [workouts, setWorkouts] = React.useState<Workout[]>([]);
  const db = useSQLiteContext();
    const { theme } = useTheme();
    const { t } = useTranslation(); // Initialize translations
    


   // Use useFocusEffect to fetch workouts when the screen is focused
   useFocusEffect(
    React.useCallback(() => {
      const addWebLinkColumntoworkouts = async () => {
        await addWebLinkColumn(db);
        db.withTransactionAsync(getWorkouts);
      };
      addWebLinkColumntoworkouts();
    }, [db])
  );

  async function getWorkouts() {
    const result = await db.getAllAsync<Workout>('SELECT * FROM Workouts;');
    setWorkouts(result);
  }

  async function deleteWorkout(workout_id: number, workout_name: string) {
    Alert.alert(
      t('deleteWorkoutTitle', { workoutName: workout_name }),
      t('deleteWorkoutMessage', { workoutName: workout_name }),
      [
        {
          text: t('alertCancel'),
          onPress: () => console.log('Cancel pressed'),
          style: 'cancel',
        },
        {
          text: t('alertDelete'),
          onPress: async () => {
            try {
              const currentDate = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000); // Today's date as Unix timestamp
              
              await db.withTransactionAsync(async () => {
                // Step 1: Delete all future workout logs and their exercises
                
                // Find all future workout logs for this workout
                const logs = await db.getAllAsync<{ workout_log_id: number }>(
                  'SELECT workout_log_id FROM Workout_Log WHERE workout_name = ? AND workout_date >= ?;',
                  [workout_name, currentDate]
                );
                
                // Delete logged exercises for all future logs
                for (const log of logs) {
                  await db.runAsync('DELETE FROM Logged_Exercises WHERE workout_log_id = ?;', [log.workout_log_id]);
                }
                
                // Delete all future workout logs
                await db.runAsync(
                  'DELETE FROM Workout_Log WHERE workout_name = ? AND workout_date >= ?;',
                  [workout_name, currentDate]
                );
                
                // Step 2: Delete all exercises associated with this workout
                await db.runAsync(
                  'DELETE FROM Exercises WHERE day_id IN (SELECT day_id FROM Days WHERE workout_id = ?);',
                  [workout_id]
                );
                
                // Step 3: Delete all days associated with this workout
                await db.runAsync('DELETE FROM Days WHERE workout_id = ?;', [workout_id]);
                
                // Step 4: Delete the workout itself
                await db.runAsync('DELETE FROM Workouts WHERE workout_id = ?;', [workout_id]);
                
                // Refresh the workout list
                await getWorkouts();
              });
            } catch (error) {
              console.error('Error deleting workout with future logs:', error);
              Alert.alert(
                t('errorTitle'),
                t('errorDeletingWorkout') || 'Failed to delete workout and scheduled sessions.'
              );
            }
          },
        },
      ]
    );
  }
  

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <WorkoutList workouts={workouts} deleteWorkout={deleteWorkout} />
    </View>
    
  );
}

// Workouts.tsx

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  adContainer: {
    alignItems: 'center',
    marginBottom:10,
  },
});
