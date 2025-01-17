// screens/Workouts.tsx

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Workout } from '../types';
import WorkoutList from '../components/WorkoutList';
import { useSQLiteContext } from 'expo-sqlite';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import BannerAdComponent from '../components/BannerAd'; // Import the BannerAdComponent


import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';



export default function Workouts() {
  const [workouts, setWorkouts] = React.useState<Workout[]>([]);
  const db = useSQLiteContext();
    const { theme } = useTheme();
    const { t } = useTranslation(); // Initialize translations
    


   // Use useFocusEffect to fetch workouts when the screen is focused
   useFocusEffect(
    React.useCallback(() => {
      db.withTransactionAsync(getWorkouts);
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
          onPress: () => console.log('Cancel pressed'), // Do nothing
          style: 'cancel',
        },
        {
          text: t('alertDelete'),
          onPress: async () => {
            await db.withTransactionAsync(async () => {
              await db.runAsync('DELETE FROM Workouts WHERE workout_id = ?;', [
                workout_id,
              ]);
              await getWorkouts();
            });
          },
        },
      ]
    );
  }
  

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <WorkoutList workouts={workouts} deleteWorkout={deleteWorkout} />
       {/* Banner Ad Section */}
       <View style={styles.adContainer}>
        <BannerAdComponent />
      </View>
    </View>
    
  );
}

// Workouts.tsx

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    backgroundColor: 'white',
  },
  adContainer: {
    alignItems: 'center',
    marginBottom:10,
  },
});
