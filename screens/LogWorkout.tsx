import React, {useCallback, useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ScrollView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '../utils/useNotifications';

export default function LogWorkout() {
  const db = useSQLiteContext();
  const navigation = useNavigation();
  const { theme } = useTheme(); 
  const { t } = useTranslation(); // Initialize translations
  const { notificationPermissionGranted, scheduleNotification } = useNotifications();
  const { dateFormat } = useSettings();
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [workouts, setWorkouts] = useState<{ workout_id: number; workout_name: string }[]>([]);
  const [selectedWorkout, setSelectedWorkout] = useState<number | null>(null);
  const [days, setDays] = useState<{ day_id: number; day_name: string }[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  
  // Notification related states
  const [notifyMe, setNotifyMe] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [notificationTime, setNotificationTime] = useState<Date>(() => {
    const defaultTime = new Date();
    defaultTime.setHours(8, 0, 0, 0); // Default to 8:00 AM
    return defaultTime;
  });

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

  // Format time for display (24h format)
  const formatTime = (date: Date): string => {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
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

      // Schedule notification if selected
      let notificationId = null;
      if (notifyMe && notificationPermissionGranted) {
        notificationId = await scheduleNotification({
          workoutName: workout_name,
          dayName: selectedDayName,
          scheduledDate: new Date(workoutDate * 1000),
          notificationTime: notificationTime
        });
      }

      // Insert the workout log into the database with notification_id if available
      const { lastInsertRowId: workoutLogId } = await db.runAsync(
        'INSERT INTO Workout_Log (workout_date, day_name, workout_name, notification_id) VALUES (?, ?, ?, ?);',
        [workoutDate, selectedDayName, workout_name, notificationId]
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
  
  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{ paddingBottom: 60 }}
    >

            {/* Back Button */}
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color={theme.text} />
      </TouchableOpacity>


      {/* Date Picker */}
      <Text style={[styles.Title, { color: theme.text }]}>{t('selectDate')}</Text>
      <TouchableOpacity style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={() => setShowDatePicker(true)}>
        <Text style={[styles.inputText, { color: theme.text }]}>
          {selectedDate ? formatDate(normalizeDate(selectedDate)) : t('selectADate')}
        </Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate || new Date()}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) {
              setSelectedDate(date);
            }
          }}
        />
      )}

      {/* Workouts List */}
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('selectWorkout')}</Text>
      <FlatList
        data={workouts}
        keyExtractor={(item) => item.workout_id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.listItem,
              { backgroundColor: theme.card, borderColor: theme.border },
              selectedWorkout === item.workout_id && { backgroundColor: theme.buttonBackground },
            ]}
            onPress={() => {
              setSelectedWorkout(item.workout_id);
              setDays([]);
              setSelectedDay(null);
              fetchDays(item.workout_id);
            }}
          >
            <Text
              style={[
                styles.listItemText,
                { color: theme.text },
                selectedWorkout === item.workout_id && { color: theme.buttonText },
              ]}
            >
              {item.workout_name}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={[styles.emptyText, { color: theme.text }]}>{t('emptyWorkoutLog')}</Text>}
        nestedScrollEnabled={true}
        style={{ maxHeight: 200 }}
      />

      {/* Days List */}
      {selectedWorkout && (
        <>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('selectDay')}</Text>
          <FlatList
            data={days}
            keyExtractor={(item) => item.day_id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.listItem,
                  { backgroundColor: theme.card, borderColor: theme.border },
                  selectedDay === item.day_id && { backgroundColor: theme.buttonBackground },
                ]}
                onPress={() => setSelectedDay(item.day_id)}
              >
                <Text
                  style={[
                    styles.listItemText,
                    { color: theme.text },
                    selectedDay === item.day_id && { color: theme.buttonText },
                  ]}
                >
                  {item.day_name}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={[styles.emptyText, { color: theme.text }]}>{t('noDaysAvailable')}</Text>}
            nestedScrollEnabled={true}
            style={{ maxHeight: 200 }}
          />
        </>
      )}

      {/* Notification Option - only show if a day is selected */}
      {selectedDay && (
        <>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Notify me on the workout date</Text>
          <FlatList
            data={[
              { id: 'yes', label: 'Yes', value: true },
              { id: 'no', label: 'No', value: false }
            ]}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.listItem,
                  { backgroundColor: theme.card, borderColor: theme.border },
                  notifyMe === item.value && { backgroundColor: theme.buttonBackground },
                ]}
                onPress={() => {
                  if (item.value && !notificationPermissionGranted) {
                    Alert.alert(
                      'Notifications Disabled',
                      'You need to enable notifications in Settings first.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { 
                          text: 'Go to Settings', 
                          onPress: () => navigation.navigate('Settings' as never)
                        }
                      ]
                    );
                  } else {
                    setNotifyMe(item.value);
                  }
                }}
              >
                <Text
                  style={[
                    styles.listItemText,
                    { color: theme.text },
                    notifyMe === item.value && { color: theme.buttonText },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
            nestedScrollEnabled={true}
            style={{ maxHeight: 200 }}
          />
        </>
      )}

      {/* Time Picker - only show if notification is enabled */}
      {selectedDay && notifyMe && notificationPermissionGranted && (
        <>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Select time for the notification</Text>
          <TouchableOpacity
            style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => setShowTimePicker(true)}
          >
            <Text style={[styles.inputText, { color: theme.text }]}>
              {formatTime(notificationTime)}
            </Text>
          </TouchableOpacity>
          {showTimePicker && (
            <DateTimePicker
              value={notificationTime}
              mode="time"
              is24Hour={true}
              display="default"
              onChange={(event, date) => {
                setShowTimePicker(false);
                if (date) {
                  setNotificationTime(date);
                }
              }}
            />
          )}
        </>
      )}

            {/* Save Button */}
            <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: theme.buttonBackground }]}
        onPress={logWorkout}
      >
        <Text style={[styles.saveButtonText, { color: theme.buttonText }]}>{t('scheduleWorkoutLog')}</Text>
      </TouchableOpacity>


    </ScrollView>

    
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    position: 'absolute',
    top:10,
    left: 10,
    zIndex: 10,
    padding: 8,
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
  