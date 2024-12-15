import React, { useEffect, useState } from 'react';
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

type MyCalendarNavigationProp = StackNavigationProp<
  WorkoutLogStackParamList,
  'MyCalendar'
>;

export default function MyCalendar() {
  const db = useSQLiteContext();
  const navigation = useNavigation<MyCalendarNavigationProp>();

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
    const date = new Date(timestamp * 1000);
    const today = new Date();
    const yesterday = new Date(today);
    const tomorrow = new Date(today);

    yesterday.setDate(today.getDate() - 1);
    tomorrow.setDate(today.getDate() + 1);

    if (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    ) {
      return 'Today';
    } else if (
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear()
    ) {
      return 'Yesterday';
    } else if (
      date.getDate() === tomorrow.getDate() &&
      date.getMonth() === tomorrow.getMonth() &&
      date.getFullYear() === tomorrow.getFullYear()
    ) {
      return 'Tomorrow';
    } else {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    }
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
        style={styles.logContainer}
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
            'Delete Workout',
            'Are you sure you want to delete this workout log? This action cannot be undone.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
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
        <Text style={styles.logDate}>{formatDate(workout_date)}</Text>
        <Text style={styles.logWorkoutName}>{workout_name}</Text>
        <Text style={styles.logDayName}>{day_name}</Text>
      </TouchableOpacity>
    );
  };
  

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#FFFFFF' }}
      contentContainerStyle={[styles.contentContainer, { paddingTop: 70 }]}
    >
      <Text style={styles.title}>My Calendar</Text>

      {/* Schedule a Workout Button */}
      <TouchableOpacity
        style={styles.logWorkoutButton}
        onPress={() => navigation.navigate('LogWorkout')}
      >
        <Ionicons name="calendar" size={24} color="#FFFFFF" style={styles.icon} />
        <Text style={styles.logWorkoutButtonText}>Schedule a Workout</Text>
      </TouchableOpacity>

      {/* Today's Workout Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Workout</Text>
        {todayWorkout ? (
          renderWorkoutCard(todayWorkout)
        ) : (
          <Text style={styles.emptyText}>No workout scheduled for today.</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Untracked Workouts</Text>
        {pastWorkouts.length > 0 ? (
          pastWorkouts.map((item) => (
            <View key={item.workout_log_id}>{renderWorkoutCard(item)}</View>
          ))
        ) : (
          <Text style={styles.emptyText}>No untracked workouts found.</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upcoming Workouts</Text>
        {futureWorkouts.length > 0 ? (
          futureWorkouts.map((item) => (
            <View key={item.workout_log_id}>{renderWorkoutCard(item)}</View>
          ))
        ) : (
          <Text style={styles.emptyText}>No upcoming workouts scheduled.</Text>
        )}
      </View>

      {/* Modal for Workout Details */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
            {selectedWorkout && (
              <>
                <Text style={styles.modalTitle}>
                  {selectedWorkout.workout_name}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {selectedWorkout.day_name} | {formatDate(selectedWorkout.workout_date)}
                </Text>
                {exercises.length > 0 ? (
                  exercises.map((exercise, index) => (
                    <View key={index} style={styles.modalExercise}>
                      <Text style={styles.modalExerciseName}>
                        {exercise.exercise_name}
                      </Text>
                      <Text style={styles.modalExerciseDetails}>
                        {exercise.sets} sets x {exercise.reps} reps
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>No exercises logged.</Text>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}



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
