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
  KeyboardAvoidingView,
  Platform,
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
  days: { dayName: string; exercises: { exerciseName: string; sets: number; reps: number; muscle_group: string | null }[] }[]
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
            'INSERT INTO Exercises (day_id, exercise_name, sets, reps, muscle_group) VALUES (?, ?, ?, ?, ?);',
            [dayId, exercise.exerciseName, exercise.sets, exercise.reps, exercise.muscle_group]
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
    { dayName: string; exercises: { exerciseName: string; sets: string; reps: string; muscle_group: string | null }[] }[]
  >([]);
  const navigation = useNavigation<WorkoutListNavigationProp>();

  const muscleGroupData = [
    { label: t('Unspecified'), value: null },
    { label: t('Chest'), value: 'chest' },
    { label: t('Back'), value: 'back' },
    { label: t('Shoulders'), value: 'shoulders' },
    { label: t('Biceps'), value: 'biceps' },
    { label: t('Triceps'), value: 'triceps' },
    { label: t('Forearms'), value: 'forearms' },
    { label: t('Abs'), value: 'abs' },
    { label: t('Legs'), value: 'legs' },
    { label: t('Glutes'), value: 'glutes' },
    { label: t('Hamstrings'), value: 'hamstrings' },
    { label: t('Calves'), value: 'calves' },
    { label: t('Quads'), value: 'quads' },
  ];

  const addDay = () => {
    setDays((prev) => [
      ...prev,
      { dayName: '', exercises: [{ exerciseName: '', sets: '', reps: '', muscle_group: null }] },
    ]);
  };

  const addExercise = (dayIndex: number) => {
    setDays((prev) => {
      const updatedDays = [...prev];
      updatedDays[dayIndex].exercises.push({ exerciseName: '', sets: '', reps: '', muscle_group: null });
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <FlatList
          data={days}
          keyExtractor={(item, index) => index.toString()}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.contentContainer}
          ListHeaderComponent={
            <>
        
              <View style={styles.header}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => navigation.goBack()}
                >
                  <Ionicons name="arrow-back" size={28} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>{t('CreateAWorkout')}</Text>
              </View>

        
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.card,
                    color: theme.text,
                    borderWidth: 1,
                    borderColor: theme.border,
                  },
                ]}
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
              activeOpacity={0.9}
              style={[
                styles.dayContainer,
                { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border },
              ]}
            >
              <TextInput
                style={[
                  styles.dayInput,
                  { color: theme.text },
                ]}
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
                <View key={exerciseIndex}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.exerciseRow}
                  >
                    <TextInput
                      style={[
                        styles.exerciseInput,
                        {
                          backgroundColor: theme.card,
                          color: theme.text,
                        },
                      ]}
                      placeholder={t('exerciseNamePlaceholder')}
                      placeholderTextColor={theme.text}
                      value={exercise.exerciseName}
                      onChangeText={(text) => {
                        const updatedDays = [...days];
        updatedDays[index].exercises[exerciseIndex].exerciseName =
                          text;
                        setDays(updatedDays);
                      }}
                    />
                    <TextInput
                      style={[
                        styles.smallInput,
                        {
                          backgroundColor: theme.card,
                          color: theme.text,
                        },
                      ]}
                      placeholder={t('setsPlaceholder') + " (> 0)"}
                      placeholderTextColor={theme.text}
                      keyboardType="numeric"
                      value={exercise.sets}
                      onChangeText={(text) => {
                        const sanitizedText = text.replace(/[^0-9]/g, ''); // Remove non-numeric characters
                        const updatedDays = [...days];
                        updatedDays[index].exercises[
                          exerciseIndex
                        ].sets = sanitizedText; // Allow empty string
                        setDays(updatedDays);
                      }}
                    />
                    <TextInput
                      style={[
                        styles.smallInput,
                        {
                          backgroundColor: theme.card,
                          color: theme.text,
                        },
                      ]}
                      placeholder={t('repsPlaceholder') + " (> 0)"}
                      placeholderTextColor={theme.text}
                      keyboardType="numeric"
                      value={exercise.reps}
                      onChangeText={(text) => {
                        const sanitizedText = text.replace(/[^0-9]/g, ''); // Remove non-numeric characters
                        const updatedDays = [...days];
                        updatedDays[index].exercises[
                          exerciseIndex
                        ].reps = sanitizedText; // Allow empty string
                        setDays(updatedDays);
                      }}
                    />
                  </TouchableOpacity>
                  <FlatList
                    data={muscleGroupData}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(item) => item.label}
                    style={{ marginVertical: 10 }}
                    renderItem={({ item: muscleGroupItem }) => {
                      const isSelected = exercise.muscle_group === muscleGroupItem.value;
                      return (
                        <TouchableOpacity
                          style={[
                            styles.muscleGroupButton,
                            { 
                              backgroundColor: isSelected ? theme.buttonBackground : theme.card,
                              borderColor: theme.border,
                            }
                          ]}
                          onPress={() => {
                            const updatedDays = [...days];
                            updatedDays[index].exercises[exerciseIndex].muscle_group = muscleGroupItem.value;
                            setDays(updatedDays);
                          }}
                        >
                          <Text style={{ color: isSelected ? theme.buttonText : theme.text }}>
                            {t(muscleGroupItem.label)}
                          </Text>
                        </TouchableOpacity>
                      );
                    }}
                  />
                </View>
              ))}

              <TouchableOpacity
                style={[
                  styles.addExerciseButton,
                ]}
                onPress={() => addExercise(index)}
              >
                <Text style={[styles.addButtonText, { color: theme.text }]}>
                  {t('addExercise')}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          ListFooterComponent={
            <View>
              <TouchableOpacity
                style={[styles.addDayButton]}
                onPress={addDay}
              >
                <Text style={[styles.addButtonText, { color: theme.text }]}>{t('addDay')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  { backgroundColor: theme.buttonBackground },
                ]}
                onPress={handleSaveWorkout}
              >
                <Text
                  style={[styles.saveButtonText, { color: theme.buttonText }]}
                >
                  {t('saveWorkout')}
                </Text>
              </TouchableOpacity>
            </View>
          }
        />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 60, // Ample space at the bottom
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 20,
  },
  backButton: {
    padding: 5, // make it easier to press
  },
  title: {
    fontSize: 34,
    fontWeight: '800', // A bit bolder for a strong title
    marginLeft: 16,
  },
  input: {
    borderRadius: 12,
    padding: 18,
    marginBottom: 24,
    fontSize: 22,
    fontWeight: 'bold',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dayContainer: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    overflow: 'hidden', // Ensures children with border radius look good
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dayInput: {
    fontSize: 20,
    fontWeight: '700',
    paddingBottom: 12,
    marginBottom: 16,
  },
  // The exercise row itself will be a touchable opacity
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseInput: {
    flex: 2,
    marginRight: 10,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
  },
  smallInput: {
    flex: 1,
    textAlign: 'center',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 12,
  },
  addButtonText: {
    // For both Add Exercise and Add Day
    fontWeight: '700',
    fontSize: 16,
    marginLeft: 10,
  },
  addDayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  saveButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderRadius: 12,
    marginTop: 24,
  },
  saveButtonText: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  muscleGroupButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    height: 40,
    elevation: 1,
    shadowOpacity: 0,
    borderWidth: 1,
    marginRight: 10,
    marginBottom: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
