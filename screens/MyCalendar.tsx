import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { StackNavigationProp } from '@react-navigation/stack';
import { WorkoutLogStackParamList } from '../App';

type MyCalendarNavigationProp = StackNavigationProp<WorkoutLogStackParamList, 'MyCalendar'>;

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
      ).getTime() / 1000; // Start of today in seconds

      const endOfDayTimestamp = startOfDayTimestamp + 86400 - 1; // End of today in seconds

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
        workout_log_id: number;
      }>(
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
        workout_log_id: number;
      }>(
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

  const deleteWorkoutLog = async (workout_log_id: number) => {
    try {
      // Delete the workout log and any associated data
      await db.runAsync(`DELETE FROM Workout_Log WHERE workout_log_id = ?;`, [workout_log_id]);
      await db.runAsync(`DELETE FROM Weight_Log WHERE workout_log_id = ?;`, [workout_log_id]);
      await db.runAsync(`DELETE FROM Logged_Exercises WHERE workout_log_id = ?;`, [workout_log_id]);

      Alert.alert('Success', 'Workout log deleted successfully!');
      fetchWorkouts(); // Refresh the list
    } catch (error) {
      console.error('Error deleting workout log:', error);
      Alert.alert('Error', 'Failed to delete workout log.');
    }
  };

  const confirmDelete = (workout_log_id: number) => {
    Alert.alert(
      'Delete Workout',
      'Are you sure you want to delete this workout log? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteWorkoutLog(workout_log_id) },
      ]
    );
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    const today = new Date();
    const yesterday = new Date();
    const tomorrow = new Date();

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
        onLongPress={() => confirmDelete(workout_log_id)}
      >
        <Text style={styles.logDate}>{formatDate(workout_date)}</Text>
        <Text style={styles.logWorkoutName}>{workout_name}</Text>
        <Text style={styles.logDayName}>{day_name}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
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
      <Text style={styles.sectionTitle}>Today's Workout</Text>
      {todayWorkout ? (
        <TouchableOpacity
          style={styles.logContainer}
          onLongPress={() => confirmDelete(todayWorkout.workout_log_id)}
        >
          <Text style={styles.logDate}>{formatDate(todayWorkout.workout_date)}</Text>
          <Text style={styles.logWorkoutName}>{todayWorkout.workout_name}</Text>
          <Text style={styles.logDayName}>{todayWorkout.day_name}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.logContainer}>
          <Text style={styles.logWorkoutName}>No workout scheduled for today.</Text>
        </View>
      )}

      {/* Unlogged Past Workouts Section */}
      <Text style={styles.sectionTitle}>Unlogged Past Workouts</Text>
      <FlatList
        data={pastWorkouts}
        keyExtractor={(item) => `${item.workout_log_id}`}
        renderItem={({ item }) => renderWorkoutCard(item)}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No unlogged past workouts available.</Text>
        }
      />

      {/* Future Workouts Section */}
      <Text style={styles.sectionTitle}>Future Scheduled Workouts</Text>
      <FlatList
        data={futureWorkouts}
        keyExtractor={(item) => `${item.workout_log_id}`}
        renderItem={({ item }) => renderWorkoutCard(item)}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No future workouts scheduled.</Text>
        }
      />
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 20,
    textAlign: 'center',
    color: '#000000',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  icon: {
    marginRight: 10,
  },
  logWorkoutButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 18,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 10,
    color: '#000000',
  },
  logContainer: {
    backgroundColor: '#F7F7F7',
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  logDate: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#000000',
  },
  logWorkoutName: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 8,
    color: '#000000',
  },
  logDayName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(0, 0, 0, 0.5)',
    textAlign: 'center',
    marginVertical: 10,
  },
});
