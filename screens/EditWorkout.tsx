import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSQLiteContext } from 'expo-sqlite';
import { useTheme } from '../context/ThemeContext';

type Exercise = { exercise_id: number; exercise_name: string; sets: number; reps: number };
type Day = { day_id: number; day_name: string; exercises: Exercise[] };

export default function EditWorkout() {
  const db = useSQLiteContext();
  const route = useRoute();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { workout_id } = route.params as { workout_id: number };

  const [workoutName, setWorkoutName] = useState('');
  const [days, setDays] = useState<Day[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchWorkoutDetails();
  }, [workout_id]);

  const fetchWorkoutDetails = async () => {
    try {
      const workoutResult = await db.getAllAsync<{ workout_name: string }>(
        'SELECT workout_name FROM Workouts WHERE workout_id = ?',
        [workout_id]
      );
      setWorkoutName(workoutResult[0]?.workout_name || '');

      const daysResult = await db.getAllAsync<{ day_id: number; day_name: string }>(
        'SELECT day_id, day_name FROM Days WHERE workout_id = ?',
        [workout_id]
      );

      const daysWithExercises = await Promise.all(
        daysResult.map(async (day) => {
          const exercises = await db.getAllAsync<Exercise>(
            'SELECT exercise_id, exercise_name, sets, reps FROM Exercises WHERE day_id = ?',
            [day.day_id]
          );
          return { ...day, exercises };
        })
      );

         // Sort days by day_id in ascending order
    const sortedDays = daysWithExercises.sort((a, b) => a.day_id - b.day_id);

    setDays(sortedDays);

    } catch (error) {
      Alert.alert('Error', 'Failed to fetch workout details.');
      console.error(error);
    }
  };

  const saveWorkoutDetails = async () => {
    try {
      // Validation: Ensure workout name is not empty
      if (!workoutName.trim()) {
        Alert.alert('Error', 'Workout name cannot be empty.');
        return;
      }
  
      // Validation: Check all exercises for empty or invalid fields
      for (const day of days) {
        if (!day.day_name.trim()) {
          Alert.alert('Error', `Day name cannot be empty for Day ID: ${day.day_id}`);
          return;
        }
  
        for (const exercise of day.exercises) {
          if (
            !exercise.exercise_name.trim() ||
            !exercise.sets ||
            !exercise.reps ||
            parseInt(exercise.sets.toString(), 10) === 0 ||
            parseInt(exercise.reps.toString(), 10) === 0
          ) {
            Alert.alert(
              'Error',
              `Invalid input in Day "${day.day_name}". Ensure all exercises have valid name, sets, and reps.`
            );
            return;
          }
        }
      }


      setIsSaving(true);

      // Update workout name
      await db.runAsync('UPDATE Workouts SET workout_name = ? WHERE workout_id = ?;', [
        workoutName.trim(),
        workout_id,
      ]);

      // Update days and exercises
      for (const day of days) {
        await db.runAsync('UPDATE Days SET day_name = ? WHERE day_id = ?;', [day.day_name.trim(), day.day_id]);

        for (const exercise of day.exercises) {
          await db.runAsync(
            'UPDATE Exercises SET exercise_name = ?, sets = ?, reps = ? WHERE exercise_id = ?;',
            [exercise.exercise_name.trim(), exercise.sets, exercise.reps, exercise.exercise_id]
          );
        }
      }

      Alert.alert('Success', 'Workout details updated successfully!');
      navigation.goBack(); // Navigate back to WorkoutDetails
    } catch (error) {
      Alert.alert('Error', 'Failed to update workout details.');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDayNameChange = (dayId: number, newName: string) => {
    setDays((prevDays) =>
      prevDays.map((day) =>
        day.day_id === dayId ? { ...day, day_name: newName } : day
      )
    );
  };

  const handleExerciseChange = (
    dayId: number,
    exerciseIndex: number,
    field: 'exercise_name' | 'sets' | 'reps',
    value: string | number
  ) => {
    setDays((prevDays) =>
      prevDays.map((day) =>
        day.day_id === dayId
          ? {
              ...day,
              exercises: day.exercises.map((exercise, index) =>
                index === exerciseIndex
                  ? { ...exercise, [field]: field === 'exercise_name' ? value :value}
                  : exercise
              ),
            }
          : day
      )
    );
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          {/* Back Button */}
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>

          {/* Title */}
          <Text style={[styles.title, { color: theme.text }]}>Edit Workout</Text>

          {/* Workout Name */}
          <TextInput
            style={[styles.input, { color: theme.text, backgroundColor: theme.card }]}
            value={workoutName}
            onChangeText={setWorkoutName}
            placeholder="Workout Name"
            placeholderTextColor={theme.text}
          />

          {/* Days and Exercises */}
          <Text style={[styles.subtitle, { color: theme.text }]}>Days and Exercises:</Text>
          {days.map((day) => (
            <View key={day.day_id} style={[styles.dayContainer, { backgroundColor: theme.card }]}>
              {/* Day Name */}
              <TextInput
                style={[styles.dayInput, { color: theme.text },{ borderBottomColor: theme.border }]}
                value={day.day_name}
                onChangeText={(text) => handleDayNameChange(day.day_id, text)}
                placeholder="Day Name"
                placeholderTextColor={theme.text}
              />

              {/* Exercises */}
              {day.exercises.map((exercise, index) => (
                <View key={exercise.exercise_id}  style={[
                    styles.exerciseContainer,
                    { borderBottomColor: theme.border } // Use theme colors for the underline
                  ]}>
                  {/* Exercise Name */}
                  <TextInput
                    style={[styles.exerciseInput, { color: theme.text },{ borderBottomColor: theme.border } ]}
                    value={exercise.exercise_name}
                    onChangeText={(text) =>
                      handleExerciseChange(day.day_id, index, 'exercise_name', text)
                    }
                    placeholder="Exercise Name"
                    placeholderTextColor={theme.text}
                  />
                  {/* Sets */}
                  <TextInput
                    style={[styles.exerciseInput, { color: theme.text },{ borderBottomColor: theme.border }]}
                    value={exercise.sets.toString()}
                    onChangeText={(text) =>
                      handleExerciseChange(day.day_id, index, 'sets', text)
                    }
                    keyboardType="numeric"
                    placeholder="Sets"
                    placeholderTextColor={theme.text}
                  />
                  {/* Reps */}
                  <TextInput
                    style={[styles.exerciseInput, { color: theme.text }, { borderBottomColor: theme.border }]}
                    value={exercise.reps.toString()}
                    onChangeText={(text) =>
                      handleExerciseChange(day.day_id, index, 'reps', text)
                    }
                    keyboardType="numeric"
                    placeholder="Reps"
                    placeholderTextColor={theme.text}
                  />
                </View>
              ))}
            </View>
          ))}

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: theme.buttonBackground }]}
            onPress={saveWorkoutDetails}
            disabled={isSaving}
          >
            <Text style={[styles.saveButtonText, { color: theme.buttonText }]}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
    container: { 
      flex: 1, 
      padding: 20 
    },
    backButton: { 
      position: 'absolute', 
      top: 20, 
      left: 10, 
      padding: 8, 
      zIndex: 10 
    },
    title: { 
      fontSize: 30, 
      fontWeight: 'bold', 
      textAlign: 'center', 
      marginBottom: 40 
    },
    input: { 
      borderWidth: 1, 
      borderRadius: 15, 
      padding: 14, 
      fontSize: 18, 
      marginBottom: 30, 
      borderColor: 'transparent', // Theme-based border
      backgroundColor: 'transparent', // Theme-based background
    },
    subtitle: { 
      fontSize: 24, 
      fontWeight: 'bold', 
      marginBottom: 20 
    },
    dayContainer: { 
      padding: 20, 
      borderRadius: 15, 
      marginBottom: 25, 
      borderWidth: 1, 
      backgroundColor: 'transparent', // Theme-based background
      borderColor: 'transparent', // Theme-based border
    },
    dayInput: { 
      fontSize: 20, 
      borderBottomWidth: 1, 
      marginBottom: 20, 
      paddingBottom: 8, 
      borderBottomColor: 'transparent' // Theme-based underline
    },
    exerciseContainer: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      marginBottom: 20, 
      borderBottomWidth: 2, // Add this line to create the underline
      padding: 15, 
      borderRadius: 12, 
      borderWidth: 1, 
      backgroundColor: 'transparent', // Theme-based background
      borderColor: 'transparent' // Theme-based border
    },
    exerciseInput: { 
      flex: 1, 
      borderBottomWidth: 1, 
      marginHorizontal: 10, 
      paddingVertical: 10, 
      fontSize: 16, 
      textAlign: 'center', 
      borderBottomColor: 'transparent' // Theme-based underline
    },
    saveButton: { 
      paddingVertical: 18, 
      borderRadius: 15, 
      alignItems: 'center', 
      marginTop: 40, 
      backgroundColor: 'transparent' // Theme-based background
    },
    saveButtonText: { 
      fontSize: 20, 
      fontWeight: 'bold', 
      color: 'transparent' // Theme-based text
    }
  });
  
  
  
