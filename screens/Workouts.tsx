// screens/Workouts.tsx

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Workout } from '../types';
import WorkoutList from '../components/WorkoutList';
import { useSQLiteContext } from 'expo-sqlite';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

export default function Workouts() {
  const [workouts, setWorkouts] = React.useState<Workout[]>([]);
  const db = useSQLiteContext();

  React.useEffect(() => {
    db.withTransactionAsync(async () => {
      await getWorkouts();
    });
  }, [db]);

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
      `Deleting ${workout_name}`,
      `Are you sure you want to delete "${workout_name}"? This action won't effect existing logs`,
      [
        {
          text: 'No',
          onPress: () => console.log('Cancel pressed'), // Do nothing
          style: 'cancel',
        },
        {
          text: 'Yes',
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
    <View style={styles.container}>
      <WorkoutList workouts={workouts} deleteWorkout={deleteWorkout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
});
