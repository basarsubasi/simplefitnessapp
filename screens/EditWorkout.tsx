import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSQLiteContext } from 'expo-sqlite';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';

type Exercise = { exercise_id: number; exercise_name: string; sets: number; reps: number };
type Day = { day_id: number; day_name: string; exercises: Exercise[] };

export default function EditWorkout() {
  const db = useSQLiteContext();
  const route = useRoute();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { t } = useTranslation();
  
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
            'SELECT exercise_id, exercise_name, sets, reps FROM Exercises WHERE day_id = ? ORDER BY exercise_id',
            [day.day_id]
          );
          return { ...day, exercises };
        })
      );

      // Sort days by day_id in ascending order
      const sortedDays = daysWithExercises.sort((a, b) => a.day_id - b.day_id);
      setDays(sortedDays);

    } catch (error) {
      Alert.alert(t('errorTitle'), t('fetchWorkoutDetailsError'));
      console.error(error);
    }
  };
  
  const fetchOriginalWorkoutLogData = async (workout_id: number) => {
    try {
      const currentDate = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000); // Today's date as Unix timestamp
  
      // Fetch the original workout name
      const originalWorkout = await db.getAllAsync<{ workout_name: string }>(
        'SELECT workout_name FROM Workouts WHERE workout_id = ?;',
        [workout_id]
      );
  
      if (!originalWorkout.length) {
        console.error('Workout not found:', workout_id);
        return [];
      }
  
      const originalWorkoutName = originalWorkout[0].workout_name;
  
      // Fetch all days for the workout
      const originalDays = await db.getAllAsync<{ day_id: number; day_name: string }>(
        'SELECT day_id, day_name FROM Days WHERE workout_id = ?;',
        [workout_id]
      );
  
      // Fetch all workout logs referencing the original workout and day names
      const logsWithDayNames = await Promise.all(
        originalDays.map(async (day) => {
          const logs = await db.getAllAsync<{ workout_log_id: number; day_name: string; workout_name: string; workout_date: number }>(
            'SELECT workout_log_id, day_name, workout_name, workout_date FROM Workout_Log WHERE day_name = ? AND workout_name = ? AND workout_date >= ?;',
            [day.day_name, originalWorkoutName, currentDate] // Only fetch logs with workout_date >= today
          );
  
          return logs.map((log) => ({
            log_id: log.workout_log_id,
            original_day_name: log.day_name,
            original_workout_name: log.workout_name,
            workout_date: log.workout_date,
            day_id: day.day_id,
          }));
        })
      );
  
      return logsWithDayNames.flat();
    } catch (error) {
      console.error('Error fetching original workout log data:', error);
      return [];
    }
  };
  
  const updateWorkoutLogs = async (originalLogs: any[], updatedWorkoutName: string) => {
    try {
      const currentDate = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000); // Today's date as Unix timestamp
  
      for (const originalLog of originalLogs) {
        const { log_id, original_day_name, day_id, workout_date } = originalLog;
  
        // Skip logs with workout_date in the past
        if (workout_date < currentDate) {
          console.log(`Skipping log ${log_id} as workout_date is in the past.`);
          continue;
        }
  
        console.log('Updating log:', log_id, 'Original day:', original_day_name, 'Updated workout:', updatedWorkoutName);
  
        // Fetch the updated day name
        const updatedDay = await db.getAllAsync<{ day_name: string }>(
          'SELECT day_name FROM Days WHERE day_id = ?;',
          [day_id]
        );
  
        if (!updatedDay.length) {
          console.error('Updated day not found for day_id:', day_id);
          continue;
        }
  
        const updatedDayName = updatedDay[0].day_name;
  
        // Update the log and its exercises
        // 1. Delete old exercises
        await db.runAsync('DELETE FROM Logged_Exercises WHERE workout_log_id = ?;', [log_id]);
  
        // 2. Fetch updated exercises for the day
        const updatedExercises = await db.getAllAsync<{ exercise_name: string; sets: number; reps: number }>(
          'SELECT exercise_name, sets, reps FROM Exercises WHERE day_id = ?;',
          [day_id]
        );
  
        // 3. Insert updated exercises
        const insertExercisePromises = updatedExercises.map((exercise) =>
          db.runAsync(
            'INSERT INTO Logged_Exercises (workout_log_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?);',
            [log_id, exercise.exercise_name, exercise.sets, exercise.reps]
          )
        );
  
        await Promise.all(insertExercisePromises);
  
        // 4. Update the Workout_Log with the new workout name and day name
        await db.runAsync(
          'UPDATE Workout_Log SET workout_name = ?, day_name = ? WHERE workout_log_id = ?;',
          [updatedWorkoutName, updatedDayName, log_id]
        );
  
        console.log(`Successfully updated log ${log_id}`);
      }
    } catch (error) {
      console.error('Error updating workout logs:', error);
    }
  };

  const saveWorkoutDetails = async () => {
    try {
      const originalLogs = await fetchOriginalWorkoutLogData(workout_id);

      // Validation: Ensure workout name is not empty
      if (!workoutName.trim()) {
        Alert.alert(t('errorTitle'), t('workoutNameErrorMessage'));
        return;
      }
  
      // Validation: Check all exercises for empty or invalid fields
      for (const day of days) {
        if (!day.day_name.trim()) {
          Alert.alert(t('errorTitle'), t('provideDayNamesErrorMessage'));
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
              t('errorTitle'),
              t('fillExercisesErrorMessage'),
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

      // Fetch the updated workout name
      const updatedWorkout = await db.getAllAsync<{ workout_name: string }>(
        'SELECT workout_name FROM Workouts WHERE workout_id = ?;',
        [workout_id]
      );

      const updatedWorkoutName = updatedWorkout[0].workout_name;

      // Update days and exercises
      for (const day of days) {
        // Update day name
        await db.runAsync('UPDATE Days SET day_name = ? WHERE day_id = ?;', 
          [day.day_name.trim(), day.day_id]
        );
        
        // Delete all exercises for this day to maintain order
        await db.runAsync('DELETE FROM Exercises WHERE day_id = ?;', [day.day_id]);
        
        // Re-insert exercises in the new order
        for (const exercise of day.exercises) {
          await db.runAsync(
            'INSERT INTO Exercises (day_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?);',
            [day.day_id, exercise.exercise_name.trim(), exercise.sets, exercise.reps]
          );
        }
      }

      // Update logs after saving the workout
      await updateWorkoutLogs(originalLogs, updatedWorkoutName);

      navigation.goBack(); // Navigate back to WorkoutDetails
    } catch (error) {
      Alert.alert(t('errorTitle'), 'Failed to update workout details.');
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
                  ? { ...exercise, [field]: field === 'exercise_name' ? value : value}
                  : exercise
              ),
            }
          : day
      )
    );
  };

  // Handle exercise reordering
  const handleExerciseReorder = (dayId: number, newExercises: Exercise[]) => {
    setDays((prevDays) =>
      prevDays.map((day) =>
        day.day_id === dayId ? { ...day, exercises: newExercises } : day
      )
    );
  };

  // Render exercise item with drag handle
  const renderExerciseItem = ({ item, drag, isActive }: RenderItemParams<Exercise>, day: Day) => {
    const index = day.exercises.findIndex(e => e.exercise_id === item.exercise_id);
    
    return (
      <TouchableOpacity
        onLongPress={drag}
        disabled={isActive}
        style={[
          styles.exerciseContainer
        ]}
      >
        {/* Drag handle */}
        <TouchableOpacity onPressIn={drag} style={styles.dragHandle}>
          <Ionicons name="reorder-three" size={30} color={theme.text} />
        </TouchableOpacity>
        
        {/* Exercise Name */}
        <TextInput
          style={[styles.exerciseInput, { color: theme.text }]}
          value={item.exercise_name}
          onChangeText={(text) =>
            handleExerciseChange(day.day_id, index, 'exercise_name', text)
          }
          placeholder={t('exerciseNamePlaceholder')}
          placeholderTextColor={theme.text}
        />
        
        {/* Sets */}
        <TextInput
          style={[styles.numberInput, { color: theme.text }]}
          value={item.sets.toString()}
          onChangeText={(text) =>
            handleExerciseChange(day.day_id, index, 'sets', text)
          }
          keyboardType="numeric"
          placeholder={t('setsPlaceholder')}
          placeholderTextColor={theme.text}
        />
        
        {/* Reps */}
        <TextInput
          style={[styles.numberInput, { color: theme.text }]}
          value={item.reps.toString()}
          onChangeText={(text) =>
            handleExerciseChange(day.day_id, index, 'reps', text)
          }
          keyboardType="numeric"
          placeholder={t('repsPlaceholder')}
          placeholderTextColor={theme.text}
        />
      </TouchableOpacity>
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
          <Text style={[styles.title, { color: theme.text }]}>{t('editWorkout')}</Text>

          {/* Workout Name */}
          <TextInput
            style={[styles.inputWorkoutName, { color: theme.text, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }]}
            value={workoutName}
            onChangeText={setWorkoutName}
            placeholder={t('workoutNamePlaceholder')}
            placeholderTextColor={theme.text}
          />

          {/* Days and Exercises */}
          <Text style={[styles.subtitle, { color: theme.text }]}>{t('daysAndExercises')}</Text>
          {days.map((day) => (
            <View key={day.day_id} style={[styles.dayContainer, { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }]}>
              {/* Day Name */}
              <TextInput
                style={[styles.dayInput, { color: theme.text }]}
                value={day.day_name}
                onChangeText={(text) => handleDayNameChange(day.day_id, text)}
                placeholder={t('dayNamePlaceholder')}
                placeholderTextColor={theme.text}
              />

              {/* Exercises as DraggableFlatList */}
              <View style={styles.exercisesContainer}>
                <DraggableFlatList
                  scrollEnabled={false}
                  data={day.exercises}
                  renderItem={(props) => renderExerciseItem(props, day)}
                  keyExtractor={(item) => item.exercise_id.toString()}
                  onDragEnd={({ data }) => handleExerciseReorder(day.day_id, data)}
                  activationDistance={3}
                  containerStyle={styles.draggableListContainer}
                />
              </View>
            </View>
          ))}

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: theme.buttonBackground }]}
            onPress={saveWorkoutDetails}
            disabled={isSaving}
          >
            <Text style={[styles.saveButtonText, { color: theme.buttonText }]}>
              {isSaving ? t('isSaving') : t('saveChanges')}
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

  inputWorkoutName: { 
    borderRadius: 15, 
    padding: 14, 
    fontSize: 30, 
    marginBottom: 30, 
    backgroundColor: 'transparent',
    fontWeight: 'bold',
    textAlign: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  input: { 
    borderRadius: 15, 
    padding: 14, 
    fontSize: 18, 
    marginBottom: 30, 
    backgroundColor: 'transparent',
    fontWeight: 'bold',
  },
  subtitle: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: 30,
    marginTop: 60,
  },
  dayContainer: { 
    padding: 20, 
    borderRadius: 15,
    marginTop: 30,
    marginBottom: 99, 
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  dayInput: { 
    fontSize: 24, 
    marginBottom: 20, 
    paddingBottom: 8,
    fontWeight: 'bold',
  },
  exercisesContainer: {
    flex: 1,
  },
  draggableListContainer: {
    flex: 1,
  },
  exerciseContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 15, 
    padding: 10, 
    borderRadius: 10, 
    backgroundColor: 'transparent',
  },
  dragHandle: {
    marginRight: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseInput: { 
    flex: 3, 
    marginHorizontal: 5, 
    paddingVertical: 6, 
    fontSize: 16, 
  },
  numberInput: {
    flex: 1,
    marginHorizontal: 5,
    paddingVertical: 6,
    fontSize: 16,
    textAlign: 'center',
  },
  saveButton: { 
    paddingVertical: 18, 
    borderRadius: 15, 
    alignItems: 'center', 
    marginTop: 40, 
    backgroundColor: 'transparent'
  },
  saveButtonText: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: 'transparent'
  }
});