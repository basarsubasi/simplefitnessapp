import React, { useEffect,useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { StackNavigationProp } from '@react-navigation/stack';
import { WorkoutLogStackParamList } from '../App';
import { useSettings } from '../context/SettingsContext';

import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';




type MyCalendarNavigationProp = StackNavigationProp<
  WorkoutLogStackParamList,
  'MyCalendar'
>;

export default function MyCalendar() {
  const db = useSQLiteContext();
  const navigation = useNavigation<MyCalendarNavigationProp>();

    const { theme } = useTheme(); 
    const { t } = useTranslation(); // Initialize translations
    

  const [todayWorkout, setTodayWorkout] = useState<
    { workout_name: string; workout_date: number; day_name: string; workout_log_id: number } | null
  >(null);
  const [pastWorkouts, setPastWorkouts] = useState<
    { workout_name: string; workout_date: number; day_name: string; workout_log_id: number }[]
  >([]);
  const [futureWorkouts, setFutureWorkouts] = useState<
    { workout_name: string; workout_date: number; day_name: string; workout_log_id: number }[]
  >([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<
    { workout_name: string; workout_date: number; day_name: string; workout_log_id: number } | null
  >(null);
  const [exercises, setExercises] = useState<
    { exercise_name: string; sets: number; reps: number }[]
  >([]);

  const today = new Date();
  const todayTimestamp = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  ).getTime() / 1000; // Start of today in seconds

  useFocusEffect(
    React.useCallback(() => {
      fetchWorkouts();
    }, [db])
  );

  const fetchWorkouts = async () => {
    try {
      const startOfDayTimestamp = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      ).getTime() / 1000;

      const endOfDayTimestamp = startOfDayTimestamp + 86400 - 1;

      // Fetch today's workout
      const todayResult = await db.getAllAsync<{
        workout_name: string;
        workout_date: number;
        day_name: string;
        workout_log_id: number;
      }>(
        `SELECT * FROM Workout_Log 
         WHERE workout_date BETWEEN ? AND ?;`,
        [startOfDayTimestamp, endOfDayTimestamp]
      );
      setTodayWorkout(todayResult[0] || null);

      // Fetch past workouts not logged in Weight_Log
      const pastResult = await db.getAllAsync<{
        workout_name: string;
        workout_date: number;
        day_name: string;
        workout_log_id: number }>(
        `SELECT * FROM Workout_Log 
         WHERE workout_date < ? 
           AND workout_log_id NOT IN (SELECT DISTINCT workout_log_id FROM Weight_Log)
         ORDER BY workout_date DESC;`,
        [startOfDayTimestamp]
      );
      setPastWorkouts(pastResult);

      // Fetch future workouts
      const futureResult = await db.getAllAsync<{
        workout_name: string;
        workout_date: number;
        day_name: string;
        workout_log_id: number }>(
        `SELECT * FROM Workout_Log 
         WHERE workout_date > ? 
         ORDER BY workout_date ASC;`,
        [endOfDayTimestamp]
      );
      setFutureWorkouts(futureResult);
    } catch (error) {
      console.error('Error fetching workouts:', error);
    }
  };
  const { dateFormat } = useSettings();

  const fetchWorkoutDetails = async (workout_log_id: number) => {
    try {
      const result = await db.getAllAsync<{
        exercise_name: string;
        sets: number;
        reps: number;
      }>(
        `SELECT exercise_name, sets, reps FROM Logged_Exercises 
         WHERE workout_log_id = ?;`,
        [workout_log_id]
      );
      setExercises(result);
    } catch (error) {
      console.error('Error fetching workout details:', error);
    }
  };

  const handleWorkoutPress = (workout: {
    workout_name: string;
    workout_date: number;
    day_name: string;
    workout_log_id: number;
  }) => {
    setSelectedWorkout(workout);
    fetchWorkoutDetails(workout.workout_log_id);
    setModalVisible(true);
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

  const renderWorkoutCard = ({
    workout_name,
    workout_date,
    day_name,
    workout_log_id,
  }: {
    workout_name: string;
    workout_date: number;
    day_name: string;
    workout_log_id: number;
  }) => {
    return (
<TouchableOpacity
  style={[styles.logContainer, { backgroundColor: theme.card, borderColor: theme.border }]}
  onPress={() =>
    handleWorkoutPress({
      workout_name,
      workout_date,
      day_name,
      workout_log_id,
    })
  }
  onLongPress={() =>
    Alert.alert(
      t('deleteDayTitle'),
      t('deleteDayMessage'),
      [
        { text: t('alertCancel'), style: 'cancel' },
        {
          text: t('alertDelete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await db.runAsync(
                `DELETE FROM Workout_Log WHERE workout_log_id = ?;`,
                [workout_log_id]
              );
              await db.runAsync(
                `DELETE FROM Weight_Log WHERE workout_log_id = ?;`,
                [workout_log_id]
              );
              await db.runAsync(
                `DELETE FROM Logged_Exercises WHERE workout_log_id = ?;`,
                [workout_log_id]
              );
              fetchWorkouts(); // Refresh the list
            } catch (error) {
              console.error('Error deleting workout log:', error);
              Alert.alert('Error', 'Failed to delete workout log.');
            }
          },
        },
      ]
    )
  }
>
  <Text style={[styles.logDate, { color: theme.text }]}>{formatDate(workout_date)}</Text>
  <Text style={[styles.logWorkoutName, { color: theme.text }]}>{workout_name}</Text>
  <Text style={[styles.logDayName, { color: theme.text }]}>{day_name}</Text>
</TouchableOpacity>

    );
  };
  

  return (
    <ScrollView
    style={{ flex: 1, backgroundColor: theme.background }}
    contentContainerStyle={[styles.contentContainer, { paddingTop: 70 }]}
  >
    <Text style={[styles.title, { color: theme.text }]}>{t('myCalendar')}</Text>
  
    {/* Schedule a Workout Button */}
    <TouchableOpacity
      style={[styles.logWorkoutButton, { backgroundColor: theme.buttonBackground }]}
      onPress={() => navigation.navigate('LogWorkout')}
    >
      <Ionicons
        name="calendar"
        size={24}
        color={theme.buttonText}
        style={styles.icon}
      />
      <Text style={[styles.logWorkoutButtonText, { color: theme.buttonText }]}>
      {t('scheduleWorkout')}
      </Text>
    </TouchableOpacity>
  
    {/* Today's Workout Section */}
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>
      {t('todaysWorkout')}
      </Text>
      {todayWorkout ? (
        renderWorkoutCard(todayWorkout)
      ) : (
        <Text style={[styles.emptyText, { color: theme.text }]}>
          {t('noWorkoutToday')}
        </Text>
      )}
    </View>
  
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>
      {t('untrackedWorkouts')}
      </Text>
      {pastWorkouts.length > 0 ? (
        pastWorkouts.map((item) => (
          <View key={item.workout_log_id}>{renderWorkoutCard(item)}</View>
        ))
      ) : (
        <Text style={[styles.emptyText, { color: theme.text }]}>
          {t('noUntrackedWorkouts')}
        </Text>
      )}
    </View>
  
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>
      {t('upcomingWorkouts')}
      </Text>
      {futureWorkouts.length > 0 ? (
        futureWorkouts.map((item) => (
          <View key={item.workout_log_id}>{renderWorkoutCard(item)}</View>
        ))
      ) : (
        <Text style={[styles.emptyText, { color: theme.text }]}>
          {t('noUpcomingWorkouts')}
        </Text>
      )}
          <Text style={[styles.tipText, { color: theme.text }]}>
          {t('scheduleTip')}
          </Text>
    </View>
  
    {/* Modal for Workout Details */}
    <Modal
      visible={modalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={[styles.modalContainer, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
        <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setModalVisible(false)}
          >
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
          {selectedWorkout && (
            <>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {selectedWorkout.workout_name}
              </Text>
              <Text style={[styles.modalSubtitle, { color: theme.text }]}>
                {selectedWorkout.day_name} | {formatDate(selectedWorkout.workout_date)}
              </Text>
              {exercises.length > 0 ? (
                exercises.map((exercise, index) => (
                  <View key={index} style={styles.modalExercise}>
                    <Text style={[styles.modalExerciseName, { color: theme.text }]}>
                      {exercise.exercise_name}
                    </Text>
                    <Text style={[styles.modalExerciseDetails, { color: theme.text }]}>
                      {exercise.sets} {t('Sets')} x {exercise.reps} {t('Reps')}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={[styles.emptyText, { color: theme.text }]}>
                  {t('noExerciseLogged')}
                </Text>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>

  </ScrollView>
  
  );
}


// MyCalendar.tsx

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  contentContainer: { alignItems: 'center', paddingHorizontal: 20 },
  title: {
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 20,
    textAlign: 'center',
    color: '#000000',
  },
  section: { width: '100%', maxWidth: 400, marginBottom: 20 },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 10,
    color: '#000000',
    textAlign: 'center',
  },
  logWorkoutButton: {
    backgroundColor: '#000000',
    borderRadius: 20,
    paddingVertical: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  adContainer: {
    alignItems: 'center',
    position: 'absolute',
    marginBottom:10,
  },
  tipText: {
    marginTop: 20, // Space above the text
    textAlign: 'center', // Center align
    fontSize: 14, // Smaller font size
    fontStyle: 'italic', // Italic for emphasis
  },
  icon: {
    marginRight: 10,
  },
  logWorkoutButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 18,
  },
  logContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  logDate: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#000000',
    textAlign: 'center',
  },
  logWorkoutName: { fontSize: 20, fontWeight: '900', marginBottom: 8, textAlign: 'center' },
  logDayName: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptyText: { fontSize: 16, textAlign: 'center', color: 'rgba(0, 0, 0, 0.5)' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalCloseButton: { position: 'absolute', top: 10, right: 10 },
  modalTitle: { fontSize: 24, fontWeight: '900', marginBottom: 10, textAlign: 'center' },
  modalSubtitle: { fontSize: 18, fontWeight: '700', marginBottom: 20, textAlign: 'center' },
  modalExercise: { marginBottom: 15 },
  modalExerciseName: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  modalExerciseDetails: { fontSize: 16, textAlign: 'center', color: '#666' },
});
