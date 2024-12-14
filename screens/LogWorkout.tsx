import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker'; // Use Expo-compatible date picker
import { useSQLiteContext } from 'expo-sqlite';
import { useNavigation } from '@react-navigation/native';

export default function LogWorkout() {
  const db = useSQLiteContext();
  const navigation = useNavigation();

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [workouts, setWorkouts] = useState<{ workout_id: number; workout_name: string }[]>([]);
  const [selectedWorkout, setSelectedWorkout] = useState<number | null>(null);
  const [days, setDays] = useState<{ day_id: number; day_name: string }[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  useEffect(() => {
    fetchWorkouts();
  }, []);

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

  const fetchDays = async (workout_id: number) => {
    try {
      const result = await db.getAllAsync<{ day_id: number; day_name: string }>(
        'SELECT * FROM Days WHERE workout_id = ?;',
        [workout_id]
      );
      setDays(result);
    } catch (error) {
      console.error('Error fetching days:', error);
    }
  };

  const logWorkout = async () => {
    if (!selectedDate) {
      Alert.alert('Error', 'Please select a date.');
      return;
    }
    if (!selectedWorkout) {
      Alert.alert('Error', 'Please select a workout.');
      return;
    }
    if (!selectedDay) {
      Alert.alert('Error', 'Please select a day.');
      return;
    }

    try {
      const workoutDate = Math.floor(selectedDate.getTime() / 1000); // Convert date to seconds

      // Fetch workout_name and day_name
      const [workoutResult] = await db.getAllAsync<{ workout_name: string }>(
        'SELECT workout_name FROM Workouts WHERE workout_id = ?;',
        [selectedWorkout]
      );
      const [dayResult] = await db.getAllAsync<{ day_name: string }>(
        'SELECT day_name FROM Days WHERE day_id = ?;',
        [selectedDay]
      );

      if (!workoutResult || !dayResult) {
        throw new Error('Failed to fetch workout or day details.');
      }

      const { workout_name } = workoutResult;
      const { day_name } = dayResult;

      // Insert into Workout_Log
      await db.runAsync(
        'INSERT INTO Workout_Log (workout_date, day_name, workout_name) VALUES (?, ?, ?);',
        [workoutDate, day_name, workout_name]
      );

      Alert.alert('Success', 'Workout logged successfully!');
      navigation.goBack(); // Navigate back to MyCalendar or previous screen
    } catch (error) {
      console.error('Error logging workout:', error);
      Alert.alert('Error', 'Failed to log workout.');
    }
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return 'Select a date';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  return (
    <View style={styles.container}>
      {/* Select Date */}
      <TouchableOpacity
        style={styles.input}
        onPress={() => setShowDatePicker(true)}
      >
        <Text style={styles.inputText}>{formatDate(selectedDate)}</Text>
      </TouchableOpacity>

      {/* Date Picker */}
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

      {/* Select Workout */}
      <Text style={styles.sectionTitle}>Select Workout</Text>
{/* Workouts FlatList */}
<FlatList
  data={workouts}
  keyExtractor={(item) => item.workout_id.toString()}
  renderItem={({ item }) => (
    <TouchableOpacity
      style={[
        styles.listItem,
        selectedWorkout === item.workout_id && styles.selectedItem, // Black card for selected workout
      ]}
      onPress={() => {
        setSelectedWorkout(item.workout_id);
        setDays([]); // Reset days when selecting a new workout
        setSelectedDay(null);
        fetchDays(item.workout_id);
      }}
    >
      <Text
        style={[
          styles.listItemText,
          selectedWorkout === item.workout_id && styles.selectedItemText, // White text for selected workout
        ]}
      >
        {item.workout_name}
      </Text>
    </TouchableOpacity>
  )}
  ListEmptyComponent={
    <Text style={styles.emptyText}>No workouts available.</Text>
  }
/>

{/* Days FlatList */}
{selectedWorkout && (
  <>
    <Text style={styles.sectionTitle}>Select Day</Text>
    <FlatList
      data={days}
      keyExtractor={(item) => item.day_id.toString()}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[
            styles.listItem,
            selectedDay === item.day_id && styles.selectedItem, // Black card for selected day
          ]}
          onPress={() => setSelectedDay(item.day_id)}
        >
          <Text
            style={[
              styles.listItemText,
              selectedDay === item.day_id && styles.selectedItemText, // White text for selected day
            ]}
          >
            {item.day_name}
          </Text>
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <Text style={styles.emptyText}>No days available for this workout.</Text>
      }
    />
  </>
)}


      {/* Log Workout Button */}
      <TouchableOpacity style={styles.saveButton} onPress={logWorkout}>
        <Text style={styles.saveButtonText}>Log Workout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      backgroundColor: '#FFFFFF',
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
  });
  