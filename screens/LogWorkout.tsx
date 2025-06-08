import React, {useCallback, useState, useMemo } from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { WorkoutLogStackParamList } from '../App';

export default function LogWorkout() {
  const route = useRoute<RouteProp<WorkoutLogStackParamList, 'LogWorkout'>>();
  const db = useSQLiteContext();
  const navigation = useNavigation();
  const { theme } = useTheme(); 
  const { t } = useTranslation(); // Initialize translations
  const { dateFormat } = useSettings();
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    return route.params?.selectedDate ? new Date(route.params.selectedDate) : null;
  });
  const [workouts, setWorkouts] = useState<{ workout_id: number; workout_name: string }[]>([]);
  const [selectedWorkout, setSelectedWorkout] = useState<number | null>(null);
  const [days, setDays] = useState<{ day_id: number; day_name: string }[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  

  const listData = useMemo(() => {
    const data: any[] = [];

    // Title and Date Picker
    data.push({ key: 'title', type: 'TITLE', title: t('selectDate') });
    data.push({ key: 'date-picker', type: 'DATE_PICKER' });

    // Workout Selection Section
    if (workouts.length > 0) {
      data.push({ key: 'workout-title', type: 'SECTION_TITLE', title: t('selectWorkout') });
      workouts.forEach((item) => data.push({ type: 'WORKOUT_ITEM', item, key: `workout-${item.workout_id}` }));
    } else {
      // If no workouts, display a message.
      data.push({ key: 'empty-workouts', type: 'EMPTY', text: t('emptyWorkoutLog') });
    }

    // Days Section
    if (selectedWorkout) {
      data.push({ key: 'day-title', type: 'SECTION_TITLE', title: t('selectDay') });
      if (days.length > 0) {
        days.forEach((item) => data.push({ type: 'DAY_ITEM', item, key: `day-${item.day_id}` }));
      } else {
        data.push({ key: 'empty-days', type: 'EMPTY', text: t('noDaysAvailable') });
      }
    }

    // Save Button
    data.push({ key: 'save-button', type: 'SAVE_BUTTON' });

    return data;
  }, [workouts, selectedWorkout, days, selectedDay,selectedDate, theme.text, t]);

  useFocusEffect(
    useCallback(() => {
      const setup = async () => {
        await fetchWorkouts();
      };
      
      setup();
      
      return () => {
        // Cleanup function if needed
      };
    }, [])
  );

  // Fetch the list of available workouts
  const fetchWorkouts = async () => {
    try {
      const result = await db.getAllAsync<{ workout_id: number; workout_name: string }>(
        'SELECT * FROM Workouts;'
      );
      setWorkouts(result);

      if (result.length === 0) {
        setSelectedWorkout(null);
        setSelectedDay(null);
        setDays([]);
      }
    } catch (error) {
      console.error('Error fetching workouts:', error);
    }
  };

  // Fetch the days associated with the selected workout
  const fetchDays = async (workout_id: number) => {
    try {
      const result = await db.getAllAsync<{ day_id: number; day_name: string }>(
        'SELECT * FROM Days WHERE workout_id = ? ORDER BY day_id ASC;',
        [workout_id]
      );
      setDays(result);
    } catch (error) {
      console.error('Error fetching days:', error);
    }
  };

  // Normalize the date to midnight
  const normalizeDate = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 1000; // Midnight timestamp
  };

  const handleWorkoutSelection = (workoutId: number) => {
    setSelectedWorkout(workoutId);
    setSelectedDay(null); // Reset day selection when workout changes.
    fetchDays(workoutId);
  };


  // Log the workout and prevent duplication
  const logWorkout = async () => {
    if (!selectedDate) {
      Alert.alert(t('errorTitle'), t('noDatePicked'));
      return;
    }
    if (!selectedWorkout) {
      Alert.alert(t('errorTitle'), t('selectAWorkout'));
      return;
    }
    if (!selectedDay) {
      Alert.alert(t('errorTitle'), t('selectADay'));
      return;
    }

    try {
      // Normalize the selected date to midnight
      const workoutDate = normalizeDate(selectedDate);

      // Find the day name of the selected day
      const selectedDayName = days.find((day) => day.day_id === selectedDay)?.day_name;

      if (!selectedDayName) {
        Alert.alert(t('errorTitle'), 'Failed to find the selected day.');
        return;
      }

      // Check for existing duplicate entries
      const existingLog = await db.getAllAsync<{ workout_log_id: number }>(
        `SELECT workout_log_id 
         FROM Workout_Log 
         WHERE workout_date = ? 
           AND day_name = ? 
           AND workout_name = (
             SELECT workout_name FROM Workouts WHERE workout_id = ?
           );`,
        [workoutDate, selectedDayName, selectedWorkout]
      );

      if (existingLog.length > 0) {
        Alert.alert(
          t('duplicateLogTitle'),
          t('duplicateLogMessage'),
        );
        return;
      }

      // Fetch the workout name from the database
      const [workoutResult] = await db.getAllAsync<{ workout_name: string }>(
        'SELECT workout_name FROM Workouts WHERE workout_id = ?;',
        [selectedWorkout]
      );

      if (!workoutResult) {
        throw new Error('Failed to fetch workout details.');
      }

      const { workout_name } = workoutResult;

      // Insert the workout log into the database
      const { lastInsertRowId: workoutLogId } = await db.runAsync(
        'INSERT INTO Workout_Log (workout_date, day_name, workout_name) VALUES (?, ?, ?);',
        [workoutDate, selectedDayName, workout_name]
      );

      // Fetch all exercises associated with the selected day
      const exercises = await db.getAllAsync<{ exercise_name: string; sets: number; reps: number }>(
        'SELECT exercise_name, sets, reps FROM Exercises WHERE day_id = ?;',
        [selectedDay]
      );

      // Insert exercises into the Logged_Exercises table
      const insertExercisePromises = exercises.map((exercise) =>
        db.runAsync(
          'INSERT INTO Logged_Exercises (workout_log_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?);',
          [workoutLogId, exercise.exercise_name, exercise.sets, exercise.reps]
        )
      );

      await Promise.all(insertExercisePromises);
      navigation.goBack(); // Navigate back to the previous screen
    } catch (error) {
      console.error('Error logging workout:', error);
      Alert.alert(t('errorTitle'), 'Failed to log workout.');
    }
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp * 1000); // Convert timestamp to Date object
    const today = new Date();
    const yesterday = new Date();
    const tomorrow = new Date();
  
    yesterday.setDate(today.getDate() - 1); // Yesterday's date
    tomorrow.setDate(today.getDate() + 1); // Tomorrow's date
  
    // Helper to compare dates without time
    const isSameDay = (d1: Date, d2: Date) =>
      d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear();
  
    // Check if the date matches today, yesterday, or tomorrow
    if (isSameDay(date, today)) {
      return t('Today');
    } else if (isSameDay(date, yesterday)) {
      return t('Yesterday');
    } else if (isSameDay(date, tomorrow)) {
      return t('Tomorrow');
    }
  
    // Default date formatting based on user-selected format
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
  
    return dateFormat === 'mm-dd-yyyy'
      ? `${month}-${day}-${year}`
      : `${day}-${month}-${year}`;
  };
  
  const renderItem = ({ item }: { item: any }) => {
    switch (item.type) {
      case 'TITLE':
        return <Text style={[styles.Title, { color: theme.text }]}>{item.title}</Text>;
      case 'DATE_PICKER':
        return (
          <TouchableOpacity style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={() => setShowDatePicker(true)}>
            <Text style={[styles.inputText, { color: theme.text }]}>
              {selectedDate ? formatDate(normalizeDate(selectedDate)) : t('selectADate')}
            </Text>
          </TouchableOpacity>
        );
      case 'SECTION_TITLE':
        return <Text style={[styles.sectionTitle, { color: theme.text }]}>{item.title}</Text>;
      case 'WORKOUT_ITEM':
        return (
          <TouchableOpacity
            style={[
              styles.listItem,
              { backgroundColor: theme.card, borderColor: theme.border },
              selectedWorkout === item.item.workout_id && { backgroundColor: theme.buttonBackground },
            ]}
            onPress={() => handleWorkoutSelection(item.item.workout_id)}
          >
            <Text
              style={[
                styles.listItemText,
                { color: theme.text },
                selectedWorkout === item.item.workout_id && { color: theme.buttonText },
              ]}
            >
              {item.item.workout_name}
            </Text>
          </TouchableOpacity>
        );
      case 'DAY_ITEM':
        return (
          <TouchableOpacity
            style={[
              styles.listItem,
              { backgroundColor: theme.card, borderColor: theme.border },
              selectedDay === item.item.day_id && { backgroundColor: theme.buttonBackground },
            ]}
            onPress={() => setSelectedDay(item.item.day_id)}
          >
            <Text
              style={[
                styles.listItemText,
                { color: theme.text },
                selectedDay === item.item.day_id && { color: theme.buttonText },
              ]}
            >
              {item.item.day_name}
            </Text>
          </TouchableOpacity>
        );

      case 'EMPTY':
        return <Text style={[styles.emptyText, { color: theme.text }]}>{item.text}</Text>;
      case 'SAVE_BUTTON':
        return (
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: theme.buttonBackground }]}
            onPress={logWorkout}
          >
            <Text style={[styles.saveButtonText, { color: theme.buttonText }]}>{t('scheduleWorkoutLog')}</Text>
          </TouchableOpacity>
        );
      default:
        return null;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <FlatList
        data={listData}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}

          ListHeaderComponent={
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
        }
      />
      
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  backButton: {
    padding: 8,
    marginTop: 40,
    alignSelf: 'flex-start',
    // No background color to make it unobtrusive
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 10,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#F7F7F7',
    elevation: 2,
  },
  inputText: {
    fontSize: 18,
    color: '#000000',
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginVertical: 15,
    color: '#000000',
    textAlign: 'left',
  },
  Title: {
    fontSize: 22,
    fontWeight: '800',
    marginVertical: 15,
    color: '#000000',
    textAlign: 'center',
  },
  listItem: {
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  listItemText: {
    fontSize: 18,
    color: '#000000',
    fontWeight: '700',
  },
  selectedItem: {
    backgroundColor: '#000000', // Black background for selected item
    borderColor: '#000000',
  },
  selectedItemText: {
    color: '#FFFFFF', // White text for selected item
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(0, 0, 0, 0.5)',
    textAlign: 'center',
    marginTop: 10,
  },
  saveButton: {
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
    marginTop: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  saveButtonText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
});
  