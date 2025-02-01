import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { WorkoutStackParamList } from '../App'; // Adjust path to where WorkoutStackParamList is defined
import { Workout } from '../types';
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ScrollView, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext'; // Adjust the path to your ThemeContext
import { useTranslation } from 'react-i18next';


type WorkoutListNavigationProp = StackNavigationProp<WorkoutStackParamList, 'WorkoutsList'>;

export default function WorkoutList({
  workouts,
  deleteWorkout,
}: {
  workouts: Workout[];
  deleteWorkout: (workout_id: number, workout_name: string) => Promise<void>;
}) {
  const navigation = useNavigation<WorkoutListNavigationProp>();
  const { theme } = useTheme(); // Get the current theme
  const { t } = useTranslation(); // Initialize translations
  const sortedWorkouts = [...workouts].sort((a, b) => b.workout_id - a.workout_id);
  

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Title */}
      <Text style={[styles.title, { color: theme.text }]}>{t('MyWorkouts')}</Text>

      {/* Create New Workout Button */}
      <TouchableOpacity
        style={[styles.createButton, { backgroundColor: theme.buttonBackground}]}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('CreateWorkout')}
      >
        <Text style={[styles.createButtonText, { color: theme.buttonText }]}>{t('CreateAWorkoutButton')}</Text>
        <Text style={[styles.plus, { color: theme.buttonText }]}>+</Text>
      </TouchableOpacity>

      <TouchableOpacity
          style={[
            styles.workoutCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Difficulty')}
        >
          <Text style={[styles.workoutText, { color: theme.text }]}>{t('navigateToDifficulty')}</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.text} />
        </TouchableOpacity>

      {/* Workout List */}
      {sortedWorkouts.map((workout) => (
        <TouchableOpacity
          key={workout.workout_id}
          style={[
            styles.workoutCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
          activeOpacity={0.7}
          onLongPress={() => deleteWorkout(workout.workout_id, workout.workout_name)}
          onPress={() => navigation.navigate('WorkoutDetails', { workout_id: workout.workout_id })}
        >
          <Text style={[styles.workoutText, { color: theme.text }]}>{workout.workout_name}</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.text} />
        </TouchableOpacity>
        
      ))}
         {/* Tip Text at the Bottom */}
    <Text style={[styles.tipText, { color: theme.text }]}>
    {t('WorkoutListTip')}
    </Text>
    </ScrollView>
  );
}

//WorkoutList.tsx

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    marginTop: 50, // Move everything down
  },
  title: {
    fontSize: 35, // Larger font size
    fontWeight: '900', // Extra bold
    marginBottom: 24,
    textAlign: 'center', // Centered text
  },
  tipText: {
    marginTop: 20, // Space above the text
    textAlign: 'center', // Center align
    fontSize: 14, // Smaller font size
    fontStyle: 'italic', // Italic for emphasis
  },
  createButton: {
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 15 ,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 20, // Add space below the button
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  plus: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  workoutCard: {
    backgroundColor: '#F7F7F7',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  workoutText: {
    fontSize: 20, // Slightly larger
    fontWeight: '700', // More bold
  },
});
