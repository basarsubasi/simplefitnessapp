import { useNavigation } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  KeyboardAvoidingView
} from 'react-native';
import { WorkoutStackParamList } from '../App'; // Adjust path to where WorkoutStackParamList is defined
import { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext'; // Import theme context
import { useTranslation } from 'react-i18next';


type WorkoutListNavigationProp = StackNavigationProp<WorkoutStackParamList, 'WorkoutsList'>;

async function createWorkout(
  db: any, // Pass the database context
  workoutName: string,
  days: { dayName: string; exercises: { exerciseName: string; sets: number; reps: number }[] }[]
) {
  await db.withTransactionAsync(async () => {
    console.log('Starting transaction...');

    try {
      console.log('Inserting workout...');
      await db.runAsync('INSERT INTO Workouts (workout_name) VALUES (?);', [workoutName]);
      console.log(`Workout inserted: ${workoutName}`);

      const workoutIdResult = (await db.getAllAsync('SELECT last_insert_rowid() as workout_id;')) as {
        workout_id: number;
      }[];

      if (!workoutIdResult.length) throw new Error('Failed to retrieve workout ID.');

      const workoutId = workoutIdResult[0].workout_id;
      console.log(`Workout ID retrieved: ${workoutId}`);

      for (const day of days) {
        console.log(`Inserting day: ${day.dayName}`);
        await db.runAsync('INSERT INTO Days (workout_id, day_name) VALUES (?, ?);', [
          workoutId,
          day.dayName,
        ]);
        const dayIdResult = (await db.getAllAsync('SELECT last_insert_rowid() as day_id;')) as {
          day_id: number;
        }[];

        if (!dayIdResult.length) throw new Error('Failed to retrieve day ID.');

        const dayId = dayIdResult[0].day_id;
        console.log(`Day ID retrieved: ${dayId}`);

        for (const exercise of day.exercises) {
          console.log(`Inserting exercise: ${exercise.exerciseName}`);
          await db.runAsync(
            'INSERT INTO Exercises (day_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?);',
            [dayId, exercise.exerciseName, exercise.sets, exercise.reps]
          );
        }
      }
    } catch (error) {
      console.error('Error during transaction:', error);
      throw error; // Re-throw the error to abort the transaction
    }
  });
}

export default function CreateWorkout() {
  const db = useSQLiteContext();
  const { theme } = useTheme(); // Get the current theme
  const { t } = useTranslation(); // Initialize translations
  const [workoutName, setWorkoutName] = useState('');
  const [days, setDays] = useState<
    { dayName: string; exercises: { exerciseName: string; sets: string; reps: string }[] }[]
  >([]);
  const navigation = useNavigation<WorkoutListNavigationProp>();

  const addDay = () => {
    setDays((prev) => [
      ...prev,
      { dayName: '', exercises: [{ exerciseName: '', sets: '', reps: '' }] },
    ]);
  };

  const addExercise = (dayIndex: number) => {
    setDays((prev) => {
      const updatedDays = [...prev];
      updatedDays[dayIndex].exercises.push({ exerciseName: '', sets: '', reps: '' });
      return updatedDays;
    });
  };

  const deleteDay = (index: number) => {
    Alert.alert(
      t('deleteDayTitle'),
      t('deleteDayMessage'),
      [
        { text: t('alertCancel'), style: 'cancel' },
        {
          text: t('alertDelete'),
          style: 'destructive',
          onPress: () => {
            setDays((prev) => prev.filter((_, dayIndex) => dayIndex !== index));
          },
        },
      ]
    );
  };

  const deleteExercise = (dayIndex: number, exerciseIndex: number) => {
    Alert.alert(
      t('deleteExerciseTitle'),
      t('deleteExerciseMessage'),
      [
        { text: t('alertCancel'), style: 'cancel' },
        {
          text: t('alertDelete'),
          style: 'destructive',
          onPress: () => {
            setDays((prev) => {
              const updatedDays = [...prev];
              updatedDays[dayIndex].exercises = updatedDays[dayIndex].exercises.filter(
                (_, exIndex) => exIndex !== exerciseIndex
              );
              return updatedDays;
            });
          },
        },
      ]
    );
  };

  const handleSaveWorkout = async () => {
    if (!workoutName.trim()) {
      Alert.alert(t('errorTitle'),
      t('workoutNameErrorMessage'));
      return;
    }

    if (days.some((day) => !day.dayName.trim())) {
      Alert.alert(t('errorTitle'),
      t('provideDayNamesErrorMessage'));
      return;
    }

    if (
      days.some((day) =>
        day.exercises.some(
          (exercise) =>
          !exercise.exerciseName.trim() || // Exercise name must not be empty
          !exercise.sets || // Sets field must not be empty
          !exercise.reps || // Reps field must not be empty
          parseInt(exercise.sets, 10) === 0 || // Sets must not be zero
          parseInt(exercise.reps, 10) === 0 // Reps must not be zero
        )
      )
    ) {
      Alert.alert(t('errorTitle'), t('fillExercisesErrorMessage'));
      return;
    }

    const formattedDays = days.map((day) => ({
      ...day,
      exercises: day.exercises.map((exercise) => ({
        ...exercise,
        sets: parseInt(exercise.sets),
        reps: parseInt(exercise.reps),
      })),
    }));

    try {
      await createWorkout(db, workoutName, formattedDays);
      navigation.goBack();
      setWorkoutName('');
      setDays([]);
    } catch (error) {
      Alert.alert(t('errorTitle'), t('failedToCreateWorkoutErrorMessage'));
      console.error(error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
       <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior="padding" // IOS
      >

      <FlatList
        data={days}
        keyExtractor={(item, index) => index.toString()}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListHeaderComponent={
          <>
            {/* Back Button */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={30} color={theme.text} />
            </TouchableOpacity>

            {/* Title */}
            <Text style={[styles.title, { color: theme.text }]}>{t('CreateAWorkout')}</Text>

            {/* Workout Name Input */}
            <TextInput
              style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
              placeholder={t('workoutNamePlaceholder')}
              placeholderTextColor={theme.text}
              value={workoutName}
              onChangeText={setWorkoutName}
            />
          </>
        }
        renderItem={({ item, index }) => (
          <TouchableOpacity
            onLongPress={() => deleteDay(index)}
            activeOpacity={0.8}
            style={[
              styles.dayContainer,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <TextInput
              style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
              placeholder={t('dayNamePlaceholder')}
              placeholderTextColor={theme.text}
              value={item.dayName}
              onChangeText={(text) => {
                const updatedDays = [...days];
                updatedDays[index].dayName = text;
                setDays(updatedDays);
              }}
            />

            {item.exercises.map((exercise, exerciseIndex) => (
              <TouchableOpacity
                key={exerciseIndex}
                onLongPress={() => deleteExercise(index, exerciseIndex)}
                activeOpacity={0.8}
                style={[
                  styles.exerciseContainer,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <TextInput
                  style={[styles.exerciseInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                  placeholder={t('exerciseNamePlaceholder')}
                  placeholderTextColor={theme.text}
                  value={exercise.exerciseName}
                  onChangeText={(text) => {
                    const updatedDays = [...days];
                    updatedDays[index].exercises[exerciseIndex].exerciseName = text;
                    setDays(updatedDays);
                  }}
                />
                <TextInput
                  style={[styles.smallInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                  placeholder={t('setsPlaceholder')}
                  placeholderTextColor={theme.text}
                  keyboardType="numeric"
                  value={exercise.sets}
                  onChangeText={(text) => {
                    const sanitizedText = text.replace(/[^0-9]/g, ''); // Remove non-numeric characters
                    const updatedDays = [...days];
                    updatedDays[index].exercises[exerciseIndex].sets = sanitizedText; // Allow empty string
                    setDays(updatedDays);
                  }}
                />
                <TextInput
                  style={[styles.smallInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                  placeholder={t('repsPlaceholder')}
                  placeholderTextColor={theme.text}
                  keyboardType="numeric"
                  value={exercise.reps}
                  onChangeText={(text) => {
                    const sanitizedText = text.replace(/[^0-9]/g, ''); // Remove non-numeric characters
                    const updatedDays = [...days];
                    updatedDays[index].exercises[exerciseIndex].reps = sanitizedText; // Allow empty string
                    setDays(updatedDays);
                  }}
                />
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: theme.buttonBackground }]}
              onPress={() => addExercise(index)}
            >
              <Text style={[styles.addButtonText, { color: theme.buttonText }]}>{t('addExercise')}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListFooterComponent={
          <View>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: theme.buttonBackground }]}
              onPress={addDay}
            >
              <Text style={[styles.addButtonText, { color: theme.buttonText }]}>{t('addDay')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: theme.buttonBackground }]}
              onPress={handleSaveWorkout}
            >
              <Text style={[styles.saveButtonText, { color: theme.buttonText }]}>{t('saveWorkout')}</Text>
            </TouchableOpacity>
          </View>
        }
      />
      </KeyboardAvoidingView>
    </View>
  );
}

// CreateWorkout.tsx

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  title: {
    fontSize: 44,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
  },
  dayContainer: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
  },
  exerciseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderRadius: 15,
    padding: 12,
    borderWidth: 1,
  },
  exerciseInput: {
    flex: 2,
    marginRight: 10,
    borderRadius: 15,
    padding: 12,
    borderWidth: 1,
    fontSize: 14,
  },
  smallInput: {
    flex: 1,
    textAlign: 'center',
    borderRadius: 15,
    marginRight: 10,
    padding: 12,
    borderWidth: 1,
    fontSize: 14,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 15,
    marginTop: 10,
  },
  addButtonText: {
    fontWeight: '800',
    fontSize: 16,
    marginLeft: 8,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 20,
    marginTop: 30,
  },
  saveButtonText: {
    fontWeight: '800',
    fontSize: 18,
    marginLeft: 8,
  },
  backButton: {
    position: 'absolute',
    top: 1,
    left: 1,
    zIndex: 1,
    padding: 8,
  },
});
