import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { WorkoutStackParamList } from '../App'; // Adjust path to where WorkoutStackParamList is defined
import { TemplateWorkouts } from '../types';
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ScrollView, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext'; // Adjust the path to your ThemeContext
import { useTranslation } from 'react-i18next';

type WorkoutListNavigationProp = StackNavigationProp<WorkoutStackParamList, 'TemplateList'>;

export default function TemplateList({
  workouts,
}: {
  workouts: TemplateWorkouts[];
}) {
  const navigation = useNavigation<WorkoutListNavigationProp>();
  const route = useRoute(); // Use route to get params
  const { workout_difficulty } = route.params as { workout_difficulty: string }; // Ensure type safety
  const { theme } = useTheme(); // Get the current theme
  const { t } = useTranslation(); // Initialize translations

  // Filter workouts based on workout_difficulty
  const filteredWorkouts = workouts.filter(
    (workout) => workout.workout_difficulty === workout_difficulty
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Title */}
      <Text style={[styles.title, { color: theme.text }]}>{t('featuredWorkouts')}</Text>

      {/* Filtered Workout List */}
      {filteredWorkouts.map((workout) => (
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
          onPress={() => navigation.navigate('TemplateDetails', { workout_id: workout.workout_id })}
        >
          <Text style={[styles.workoutText, { color: theme.text }]}>{workout.workout_name}</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.text} />
        </TouchableOpacity>
      ))}

      {/* Tip Text at the Bottom */}
      <Text style={[styles.tipText, { color: theme.text }]}>{t('templateListTip')}</Text>
    </ScrollView>
  );
}

//WorkoutList.tsx

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    marginTop: 100, // Move everything down
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
    paddingVertical: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 30, // Add space below the button
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
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
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
