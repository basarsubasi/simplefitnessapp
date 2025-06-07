import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { WorkoutLogStackParamList } from '../App';
import { useSQLiteContext } from 'expo-sqlite';
import { useRecurringWorkouts } from '../utils/recurringWorkoutUtils';
import { useSettings } from '../context/SettingsContext';

type NavigationProp = StackNavigationProp<
  WorkoutLogStackParamList,
  'RecurringWorkoutDetails'
>;

type RouteProps = RouteProp<
  WorkoutLogStackParamList,
  'RecurringWorkoutDetails'
>;

// Day of week names for reference
const DAYS_OF_WEEK = [
  { id: 0, name: 'Sunday' },
  { id: 1, name: 'Monday' },
  { id: 2, name: 'Tuesday' },
  { id: 3, name: 'Wednesday' },
  { id: 4, name: 'Thursday' },
  { id: 5, name: 'Friday' },
  { id: 6, name: 'Saturday' }
];

interface RecurringWorkout {
  recurring_workout_id: number;
  workout_id: number;
  workout_name: string;
  day_name: string;
  recurring_interval: number;
  recurring_days: string | null;
  notification_enabled: number;
  notification_time: string | null;
}

export default function RecurringWorkoutDetails() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const db = useSQLiteContext();
  const { deleteRecurringWorkout } = useRecurringWorkouts();
  const { timeFormat } = useSettings();

  const [workout, setWorkout] = useState<RecurringWorkout | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { recurring_workout_id } = route.params;

  // Fetch recurring workout data
  const fetchWorkout = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await db.getAllAsync<RecurringWorkout>(
        `SELECT 
          recurring_workout_id, 
          workout_id,
          workout_name, 
          day_name, 
          recurring_interval, 
          recurring_days,
          notification_enabled,
          notification_time
        FROM Recurring_Workouts 
        WHERE recurring_workout_id = ?`,
        [recurring_workout_id]
      );
      
      if (result.length > 0) {
        setWorkout(result[0]);
      } else {
        Alert.alert(
          t('error'),
          t('recurringWorkoutNotFound'),
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      console.error('Error fetching recurring workout:', error);
      Alert.alert(
        t('error'),
        t('errorLoadingWorkout'),
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } finally {
      setIsLoading(false);
    }
  }, [db, recurring_workout_id, navigation, t]);

  // Load workout data when component mounts
  useEffect(() => {
    fetchWorkout();
  }, [fetchWorkout]);

  // Format recurring interval for display
  const getIntervalDescription = (): string => {
    if (!workout) return '';

    if (workout.recurring_interval === 1) {
      return t('everyday');
    } else if (workout.recurring_interval > 1) {
      return t('dayInterval', { count: workout.recurring_interval });
    } else if (workout.recurring_interval === 0 && workout.recurring_days) {
      // Weekly schedule with specific days
      return t('weekly');
    }
    return '';
  };

  // Format notification time from "HH:mm" string based on user setting
  const formatNotificationTime = (timeString: string | null): string => {
    if (!timeString) return '';
    
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours, 10), parseInt(minutes, 10));
    
    if (timeFormat === 'AM/PM') {
      return date.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
    }
    
    return timeString;
  };

  // Format weekdays for display
  const getWeekdaysDisplay = (): string => {
    if (!workout || !workout.recurring_days || workout.recurring_interval !== 0) return '';
    
    return workout.recurring_days
      .split(',')
      .map(day => {
        const dayId = parseInt(day, 10);
        const dayObj = DAYS_OF_WEEK.find(d => d.id === dayId);
        return dayObj ? t(dayObj.name) : '';
      })
      .filter(Boolean)
      .join(', ');
  };

  // Handle deletion of recurring workout
  const handleDelete = () => {
    Alert.alert(
      t('confirmDelete'),
      t('confirmDeleteRecurringWorkout'),
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
              const success = await deleteRecurringWorkout(recurring_workout_id);
              if (success) {
                navigation.goBack();
              } else {
                Alert.alert(t('error'), t('failedToDeleteRecurringWorkout'));
              }
            } catch (error) {
              console.error('Error deleting recurring workout:', error);
              Alert.alert(t('error'), t('anErrorOccurred'));
            }
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.buttonBackground} />
      </View>
    );
  }

  if (!workout) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[styles.errorText, { color: theme.text }]}>{t('workoutNotFound')}</Text>
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: theme.buttonBackground }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.buttonText, { color: theme.buttonText }]}>{t('goBack')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color={theme.text} />
      </TouchableOpacity>

      <Text style={[styles.title, { color: theme.text }]}>
        {t('recurringWorkoutDetails')}
      </Text>
      
      <View style={[styles.infoCard, { backgroundColor: theme.card }]}>
        <Text style={[styles.infoLabel, { color: theme.text }]}>{t('workout')}:</Text>
        <Text style={[styles.infoValue, { color: theme.text }]}>{workout.workout_name}</Text>
        
        <Text style={[styles.infoLabel, { color: theme.text }]}>{t('day')}:</Text>
        <Text style={[styles.infoValue, { color: theme.text }]}>{workout.day_name}</Text>
        
        <Text style={[styles.infoLabel, { color: theme.text }]}>{t('recurringInterval')}:</Text>
        <Text style={[styles.infoValue, { color: theme.text }]}>{getIntervalDescription()}</Text>
        
        {workout.recurring_interval === 0 && workout.recurring_days && (
          <>
            <Text style={[styles.infoLabel, { color: theme.text }]}>{t('selectedDays')}:</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>{getWeekdaysDisplay()}</Text>
          </>
        )}
        
        <Text style={[styles.infoLabel, { color: theme.text }]}>{t('notifications')}:</Text>
        <Text style={[styles.infoValue, { color: theme.text }]}>
          {workout.notification_enabled === 1 
            ? `${t('Notifications enabled')} (${formatNotificationTime(workout.notification_time)})` 
            : t('Notificationsdisabled')}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: theme.buttonBackground }]}
          onPress={() => navigation.navigate('EditRecurringWorkout', { recurring_workout_id: recurring_workout_id })}
        >
          <Ionicons name="pencil" size={20} color={theme.buttonText} style={styles.buttonIcon} />
          <Text style={[styles.buttonText, { color: theme.buttonText }]}>{t('edit')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: theme.card }]}
          onPress={handleDelete}
        >
          <Ionicons name="trash" size={20} color={theme.text} style={styles.buttonIcon} />
          <Text style={[styles.buttonText, { color: theme.text }]}>{t('delete')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  infoCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 18,
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 12,
    marginHorizontal: 5,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
});
