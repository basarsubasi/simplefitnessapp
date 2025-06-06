// screens/RecurringWorkoutOptions.tsx

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { WorkoutLogStackParamList } from '../App';
import { addRecurringTable, createUpdateTriggers } from '../utils/addRecurringTable';

type RecurringWorkoutNavigationProp = StackNavigationProp<
  WorkoutLogStackParamList,
  'RecurringWorkoutOptions'
>;

export default function RecurringWorkoutOptions() {
  const db = useSQLiteContext();
  const navigation = useNavigation<RecurringWorkoutNavigationProp>();
  const { theme } = useTheme();
  const { t } = useTranslation();

  // Initialize database tables and triggers when screen loads
  useEffect(() => {
    const setupDatabase = async () => {
      try {
        await addRecurringTable(db);
        await createUpdateTriggers(db);
        console.log('Recurring workouts database setup complete');
      } catch (error) {
        console.error('Error setting up recurring workouts database:', error);
      }
    };

    setupDatabase();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color={theme.text} />
      </TouchableOpacity>

      {/* Title */}
      <Text style={[styles.title, { color: theme.text }]}>
        {t('recurringWorkouts')}
      </Text>

      {/* Create Button */}
      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.buttonBackground }]}
        onPress={() => navigation.navigate('CreateRecurringWorkout')}
      >
        <Ionicons
          name="add-circle"
          size={24}
          color={theme.buttonText}
          style={styles.icon}
        />
        <Text style={[styles.buttonText, { color: theme.buttonText }]}>
          {t('createRecurringWorkout')}
        </Text>
      </TouchableOpacity>

      {/* Manage Button */}
      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.buttonBackground }]}
        onPress={() => navigation.navigate('ManageRecurringWorkouts')}
      >
        <Ionicons
          name="settings"
          size={24}
          color={theme.buttonText}
          style={styles.icon}
        />
        <Text style={[styles.buttonText, { color: theme.buttonText }]}>
          {t('manageRecurringWorkouts')}
        </Text>
      </TouchableOpacity>

      {/* Explanation Text */}
      <Text style={[styles.explanation, { color: theme.text }]}>
        {t('recurringWorkoutsExplanation', 
          'Set up workouts that automatically schedule themselves on your calendar at regular intervals.')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 10,
    padding: 8,
    zIndex: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 40,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#000000',
    borderRadius: 15,
    paddingVertical: 20,
    paddingHorizontal: 25,
    width: '90%',
    maxWidth: 400,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 18,
  },
  icon: {
    marginRight: 10,
  },
  explanation: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 30,
    paddingHorizontal: 20,
    opacity: 0.7,
  },
});
