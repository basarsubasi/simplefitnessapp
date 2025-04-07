// screens/Workouts.tsx

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Workout } from '../types';
import { useSQLiteContext } from 'expo-sqlite';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import DifficultyList from '../components/DifficultyList';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { WorkoutStackParamList } from '../App';
import { StackNavigationProp } from '@react-navigation/stack';
import { insertWorkouts } from '../insertWorkouts';
import { addTables } from '../addTables';







type WorkoutListNavigationProp = StackNavigationProp<WorkoutStackParamList, 'Difficulty'>;



export default function Difficulty() {
  const [workouts, setWorkouts] = React.useState<Workout[]>([]);
  const db = useSQLiteContext();
    const { theme } = useTheme();
    const { t } = useTranslation(); // Initialize translations
    const navigation = useNavigation<WorkoutListNavigationProp>();
    const route = useRoute();
    


   // Use useFocusEffect to fetch workouts when the screen is focused
   useFocusEffect(
    React.useCallback(() => {
      const fetchData = async () => {
        await addTables(db);
        await insertWorkouts(db);
        await db.withTransactionAsync(getWorkouts);
      };
        fetchData()
    }, [])
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
       <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
    <Ionicons name="arrow-back" size={24} color={theme.text} />
  </TouchableOpacity>
      <DifficultyList workouts={workouts} deleteWorkout={deleteWorkout} />
    </View>
    
  );
}

// Workouts.tsx

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  backButton: { 
    position: 'absolute', 
    top: 20, 
    left: 10, 
    padding: 8, 
    zIndex: 10 },
  adContainer: {
    alignItems: 'center',
    marginBottom:10,
  },
  
});
