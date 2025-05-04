import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { WorkoutLogStackParamList } from '../App';
import { useSQLiteContext } from 'expo-sqlite';
import { useRecurringWorkouts } from '../utils/recurringWorkoutUtils';

type NavigationProp = StackNavigationProp<
  WorkoutLogStackParamList,
  'ManageRecurringWorkouts'
>;

interface RecurringWorkout {
  recurring_workout_id: number;
  workout_name: string;
  day_name: string;
  recurring_interval: number;
  recurring_days: string | null;
}

// Helper function to format interval description
const getIntervalDescription = (
  workout: RecurringWorkout, 
  t: (key: string) => string
): string => {
  if (workout.recurring_interval === 0 && workout.recurring_days) {
    // Weekly pattern - just say 'Weekly' without listing days
    return t('weekly');
  } else if (workout.recurring_interval === 1) {
    // Daily
    return t('everyday');
  } else {
    // Every N days
    return `${t('every')} ${workout.recurring_interval} ${t('days')}`;
  }
};

export default function ManageRecurringWorkouts() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const db = useSQLiteContext();
  const { deleteRecurringWorkout } = useRecurringWorkouts();

  const [recurringWorkouts, setRecurringWorkouts] = useState<RecurringWorkout[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch recurring workouts when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchRecurringWorkouts();
    }, [])
  );

  // Function to fetch recurring workouts from database
  const fetchRecurringWorkouts = async () => {
    setIsLoading(true);
    try {
      console.log('DEBUG: Fetching recurring workouts');
      const result = await db.getAllAsync<RecurringWorkout>(
        `SELECT 
          recurring_workout_id, 
          workout_name, 
          day_name, 
          recurring_interval, 
          recurring_days 
        FROM Recurring_Workouts 
        ORDER BY workout_name, day_name`
      );
      
      console.log(`DEBUG: Found ${result.length} recurring workouts`);
      setRecurringWorkouts(result);
    } catch (error) {
      console.error('Error fetching recurring workouts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to delete a recurring workout
  const handleDeleteWorkout = (workout: RecurringWorkout) => {
    Alert.alert(
      t('deleteRecurringWorkout'),
      t('deleteRecurringWorkoutMessage', { 
        workout: workout.workout_name, 
        day: workout.day_name 
      }),
      [
        {
          text: t('cancel'),
          style: 'cancel'
        },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              console.log(`DEBUG: Deleting recurring workout ID: ${workout.recurring_workout_id}`);
              const success = await deleteRecurringWorkout(workout.recurring_workout_id);
              
              if (success) {
                console.log('DEBUG: Successfully deleted recurring workout');
                // Refresh the list after deletion
                fetchRecurringWorkouts();
              } else {
                console.log('DEBUG: Failed to delete recurring workout');
                Alert.alert(
                  t('error'),
                  t('failedToDeleteRecurringWorkout')
                );
              }
            } catch (error) {
              console.error('Error deleting recurring workout:', error);
              Alert.alert(
                t('error'),
                t('anErrorOccurred')
              );
            }
          }
        }
      ]
    );
  };

  // Render each recurring workout item
  const renderItem = ({ item }: { item: RecurringWorkout }) => (
    <TouchableOpacity 
      style={[styles.workoutItem, { backgroundColor: theme.card }]}
      onPress={() => navigation.navigate('RecurringWorkoutDetails', { 
        recurring_workout_id: item.recurring_workout_id 
      })}
      onLongPress={() => handleDeleteWorkout(item)}
      delayLongPress={500}
    >
      <Text style={[styles.workoutName, { color: theme.text }]}>
        {item.workout_name}
      </Text>
      <Text style={[styles.workoutDetails, { color: theme.text }]}>
        {item.day_name} • {getIntervalDescription(item, t)}
      </Text>
      <Ionicons name="chevron-forward" size={20} color={theme.text} style={styles.arrow} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color={theme.text} />
      </TouchableOpacity>

      <Text style={[styles.title, { color: theme.text }]}>
        {t('manageRecurringWorkouts')}
      </Text>
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.buttonBackground} />
        </View>
      ) : recurringWorkouts.length > 0 ? (
        <FlatList
          data={recurringWorkouts}
          renderItem={renderItem}
          keyExtractor={(item) => item.recurring_workout_id.toString()}
          contentContainerStyle={styles.list}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.text }]}>
            {t('noRecurringWorkoutsFound')}
          </Text>
          <Text style={[styles.emptySubtext, { color: theme.text }]}>
            {t('createRecurringWorkoutToSeeHere')}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  backButton: {
    marginTop: 10,
    marginBottom: 20,
    padding: 8,
    zIndex: 10,
    alignSelf: 'flex-start',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 20,
    textAlign: 'center',
  },
  list: {
    paddingBottom: 20,
  },
  workoutItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderColor: 'rgba(0, 0, 0, 0.1)', // More subtle border color
    borderWidth: 1,
  },
  workoutName: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  workoutDetails: {
    fontSize: 14,
    opacity: 0.7,
    marginRight: 10,
  },
  arrow: {
    marginLeft: 'auto',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});