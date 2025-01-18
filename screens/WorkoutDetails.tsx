import { useFocusEffect } from '@react-navigation/native'; // Import useFocusEffect
import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSQLiteContext } from 'expo-sqlite';
import { AutoSizeText, ResizeTextMode } from 'react-native-auto-size-text';
import BannerAdComponent from '../components/BannerAd'; // Import the BannerAdComponent
import { useTheme } from '../context/ThemeContext';
import { WorkoutStackParamList } from '../App';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';






type WorkoutListNavigationProp = StackNavigationProp<WorkoutStackParamList, 'WorkoutDetails'>;


type Day = {
  day_id: number;
  day_name: string;
  exercises: { exercise_name: string; sets: number; reps: number }[];
};
export default function WorkoutDetails() {
  const db = useSQLiteContext();
  const route = useRoute();
 

  const { theme } = useTheme();
  const { t } = useTranslation(); // Initialize translations
  
  
  const { workout_id } = route.params as { workout_id: number };

  const [workoutName, setWorkoutName] = useState('');
  const [days, setDays] = useState<Day[]>([]);
  const [showDayModal, setShowDayModal] = useState(false);
  const [dayName, setDayName] = useState('');

  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [currentDayId, setCurrentDayId] = useState<number | null>(null);
  const [exerciseName, setExerciseName] = useState('');
  const [exerciseSets, setExerciseSets] = useState('');
  const [exerciseReps, setExerciseReps] = useState('');
  const navigation = useNavigation<WorkoutListNavigationProp>();


  useFocusEffect(
    React.useCallback(() => {
      fetchWorkoutDetails();
    }, [workout_id])
  );

  const fetchWorkoutDetails = async () => {
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
        const exercises = await db.getAllAsync<{ exercise_name: string; sets: number; reps: number }>(
          'SELECT exercise_name, sets, reps FROM Exercises WHERE day_id = ?',
          [day.day_id]
        );
        return { ...day, exercises };
      })
    );

     // Sort days by day_id in ascending order
     const sortedDays = daysWithExercises.sort((a, b) => a.day_id - b.day_id);

     setDays(sortedDays);

    setDays(sortedDays);
  };

  const handleDeleteDay = async (day_id: number, day_name: string, workout_id: number) => {
    Alert.alert(
      t('deleteDayTitleDetails'),
      t('deleteDayMessageDetails'),
      [
        { text: t('alertCancel'), style: 'cancel' },
        {
          text: t('alertDelete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const currentDate = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000); // Today's date as Unix timestamp
  
              // Fetch logs only for workout_date >= today
              const logs = await db.getAllAsync<{ workout_log_id: number; workout_date: number }>(
                'SELECT workout_log_id, workout_date FROM Workout_Log WHERE day_name = ? AND workout_name = (SELECT workout_name FROM Workouts WHERE workout_id = ?) AND workout_date >= ?;',
                [day_name, workout_id, currentDate]
              );
  
              for (const log of logs) {
                console.log(`Deleting log ${log.workout_log_id} with workout_date: ${log.workout_date}`);
                await db.runAsync('DELETE FROM Logged_Exercises WHERE workout_log_id = ?;', [log.workout_log_id]);
                await db.runAsync('DELETE FROM Workout_Log WHERE workout_log_id = ?;', [log.workout_log_id]);
              }
  
              // Delete the day and its exercises regardless of logs
              await db.runAsync('DELETE FROM Exercises WHERE day_id = ?;', [day_id]);
              await db.runAsync('DELETE FROM Days WHERE day_id = ?;', [day_id]);
  
              fetchWorkoutDetails();
            } catch (error) {
              console.error('Error deleting day with future logs:', error);
            }
          },
        },
      ]
    );
  };
  
  const handleDeleteExercise = async (day_id: number, exercise_name: string, workout_id: number) => {
    Alert.alert(
      t('deleteExerciseTitleDetails'),
      t('deleteExerciseMessageDetails'),
      [
        { text: t('alertCancel'), style: 'cancel' },
        {
          text: t('alertDelete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const currentDate = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000); // Today's date as Unix timestamp
  
              // Fetch logs only for workout_date >= today
              const logs = await db.getAllAsync<{ workout_log_id: number; workout_date: number }>(
                'SELECT workout_log_id, workout_date FROM Workout_Log WHERE day_name = (SELECT day_name FROM Days WHERE day_id = ?) AND workout_name = (SELECT workout_name FROM Workouts WHERE workout_id = ?) AND workout_date >= ?;',
                [day_id, workout_id, currentDate]
              );
  
              for (const log of logs) {
                console.log(`Deleting log ${log.workout_log_id} with workout_date: ${log.workout_date}`);
                await db.runAsync(
                  'DELETE FROM Logged_Exercises WHERE workout_log_id = ? AND exercise_name = ?;',
                  [log.workout_log_id, exercise_name]
                );
              }
  
              // Delete the exercise itself
              await db.runAsync('DELETE FROM Exercises WHERE day_id = ? AND exercise_name = ?;', [day_id, exercise_name]);
  
              fetchWorkoutDetails();
            } catch (error) {
              console.error('Error deleting exercise with future logs:', error);
            }
          },
        },
      ]
    );
  };
  

  const updateWorkoutLogsForAdditions = async (workout_id: number) => {
    try {
      const currentDate = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000); // Today's date as Unix timestamp
  
      // Fetch all logs for the current workout where workout_date >= today
      const logs = await db.getAllAsync<{ workout_log_id: number; day_name: string; workout_date: number }>(
        'SELECT workout_log_id, day_name, workout_date FROM Workout_Log WHERE workout_name = (SELECT workout_name FROM Workouts WHERE workout_id = ?) AND workout_date >= ?;',
        [workout_id, currentDate]
      );
  
      // Fetch updated days and exercises
      const days = await db.getAllAsync<{ day_id: number; day_name: string }>(
        'SELECT day_id, day_name FROM Days WHERE workout_id = ?;',
        [workout_id]
      );
  
      for (const log of logs) {
        const day = days.find((d) => d.day_name === log.day_name);
  
        if (day) {
          console.log(`Updating log ${log.workout_log_id} for day: ${day.day_name}`);
  
          // Fetch updated exercises for the day
          const exercises = await db.getAllAsync<{ exercise_name: string; sets: number; reps: number }>(
            'SELECT exercise_name, sets, reps FROM Exercises WHERE day_id = ?;',
            [day.day_id]
          );
  
          // Delete existing logged exercises for the log
          await db.runAsync('DELETE FROM Logged_Exercises WHERE workout_log_id = ?;', [log.workout_log_id]);
  
          // Insert updated exercises into the log
          const insertExercisePromises = exercises.map((exercise) =>
            db.runAsync(
              'INSERT INTO Logged_Exercises (workout_log_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?);',
              [log.workout_log_id, exercise.exercise_name, exercise.sets, exercise.reps]
            )
          );
  
          await Promise.all(insertExercisePromises);
  
          console.log(`Successfully updated log ${log.workout_log_id} with new exercises.`);
        } else {
          console.log(`No matching day found for log ${log.workout_log_id} and day_name: ${log.day_name}`);
        }
      }
    } catch (error) {
      console.error('Error updating workout logs for additions:', error);
    }
  };
  
  const openAddDayModal = () => {
    setDayName('');
    setShowDayModal(true);
  };

  const closeAddDayModal = () => {
    setShowDayModal(false);
    setDayName('');
  };

  const addDay = async () => {
    if (!dayName.trim()) {
      Alert.alert(t('errorTitle'), t('dayNameValidationError'));
      return;
    }

    await db.runAsync('INSERT INTO Days (workout_id, day_name) VALUES (?, ?);', [workout_id, dayName.trim()]);
    await updateWorkoutLogsForAdditions(workout_id);
    fetchWorkoutDetails();
    closeAddDayModal();
  };

  const openAddExerciseModal = (day_id: number) => {
    setCurrentDayId(day_id);
    setExerciseName('');
    setExerciseSets('');
    setExerciseReps('');
    setShowExerciseModal(true);
  };

  const closeAddExerciseModal = () => {
    setShowExerciseModal(false);
    setCurrentDayId(null);
  };

  const addExercise = async () => {
    const sets = exerciseSets.trim();
    const reps = exerciseReps.trim();

    if (!exerciseName.trim()) {
      Alert.alert(t('errorTitle'), t('exerciseNameValidationError'));
      return;
    }

    if (!sets || parseInt(sets, 10) <= 0) {
      Alert.alert(t('errorTitle'), t('setsValidationError'));
      return;
    }

    if (!reps || parseInt(reps, 10) <= 0) {
      Alert.alert(t('errorTitle'), t('repsValidationError'));
      return;
    }

    if (currentDayId) {
      await db.runAsync(
        'INSERT INTO Exercises (day_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?);',
        [currentDayId, exerciseName.trim(), parseInt(sets, 10), parseInt(reps, 10)]
      );
      await updateWorkoutLogsForAdditions(workout_id);
      fetchWorkoutDetails();
      closeAddExerciseModal();
    }
  };
  
  

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
  <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
    <Ionicons name="arrow-back" size={24} color={theme.text} />
  </TouchableOpacity>

  <View style={styles.titleContainer}>
  <Text style={[styles.title, { color: theme.text }]}>{workoutName}</Text>
  <TouchableOpacity
    style={styles.editIcon}
    onPress={() => navigation.navigate('EditWorkout', { workout_id: workout_id })}
  >
    <Ionicons name="pencil-outline" size={24} color={theme.text} />
  </TouchableOpacity>
</View>

  <FlatList
    data={days}
    keyExtractor={(item) => item.day_id.toString()}
    renderItem={({ item: day }) => (
      <TouchableOpacity
        onLongPress={() => handleDeleteDay(day.day_id, day.day_name, workout_id)} // Long press triggers day deletion
        activeOpacity={0.8}
        style={[styles.dayContainer, { backgroundColor: theme.card, borderColor: theme.border }]} // Entire day card is now pressable
      >
        {/* Day Header */}
        <View style={styles.dayHeader}>
          <Text style={[styles.dayTitle, { color: theme.text }]}>{day.day_name}</Text>
          {/* Add Exercise Button */}
          <TouchableOpacity onPress={() => openAddExerciseModal(day.day_id)}>
            <Ionicons name="add-circle" size={28} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* Exercises */}
        {day.exercises.length > 0 ? (
          day.exercises.map((exercise, index) => (
            <TouchableOpacity
              key={index}
              onLongPress={() => handleDeleteExercise(day.day_id, exercise.exercise_name, workout_id)}
              activeOpacity={0.8}
              style={[styles.exerciseContainer, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <AutoSizeText
                fontSize={18}
                numberOfLines={2}
                mode={ResizeTextMode.max_lines}
                style={[styles.exerciseName, { color: theme.text }]}
              >
                {exercise.exercise_name}
              </AutoSizeText>
              <AutoSizeText
                fontSize={16}
                numberOfLines={2}
                mode={ResizeTextMode.max_lines}
                style={[styles.exerciseDetails, { color: theme.text }]}
              >
                {exercise.sets} {t('Sets')} x {exercise.reps} {t('Reps')} 
              </AutoSizeText>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={[styles.noExercisesText, { color: theme.text }]}>{t('noExercises')} </Text>
        )}
      </TouchableOpacity>
    )}
    ListFooterComponent={
      <TouchableOpacity
        style={[styles.addDayButton, { backgroundColor: theme.buttonBackground }]}
        onPress={openAddDayModal}
      >
        <Ionicons name="add-circle" size={28} color={theme.buttonText} />
        <Text style={[styles.addDayButtonText, { color: theme.buttonText }]}>{t('addDayFromDetails')}</Text>
      </TouchableOpacity>
    }
    ListEmptyComponent={
      <Text style={[styles.emptyText, { color: theme.text }]}>
        {t('emptyWorkoutDetails')}
      </Text>
    }
  />

  <Modal visible={showDayModal} animationType="slide" transparent>
    <View style={[styles.modalContainer, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
      <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
        <Text style={[styles.modalTitle, { color: theme.text }]}>{t('addDayFromDetails')}</Text>
        <TextInput
          style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
          placeholder={t('dayNamePlaceholder')}
          placeholderTextColor={theme.text}
          value={dayName}
          onChangeText={setDayName}
        />
        <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.buttonBackground }]} onPress={addDay}>
          <Text style={[styles.saveButtonText, { color: theme.buttonText }]}>{t('Save')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.cancelButton, { backgroundColor: theme.card }]} onPress={closeAddDayModal}>
          <Text style={[styles.cancelButtonText, { color: theme.text }]}>{t('Cancel')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>

  <Modal visible={showExerciseModal} animationType="slide" transparent>
    <View style={[styles.modalContainer, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
      <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
        <Text style={[styles.modalTitle, { color: theme.text }]}>{t('addExerciseFromDetails')}</Text>
        <TextInput
          style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
          placeholder={t('exerciseNamePlaceholder')}
          placeholderTextColor={theme.text}
          value={exerciseName}
          onChangeText={setExerciseName}
        />
        <TextInput
          style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
          placeholder={t('setsPlaceholder')}
          placeholderTextColor={theme.text}
          keyboardType="numeric"
          value={exerciseSets}
          onChangeText={(text) => {
            const sanitizedText = text.replace(/[^0-9]/g, ''); // Remove non-numeric characters
            let value = parseInt(sanitizedText || '0'); // Convert to integer
            if (value > 0 && value <= 100) {
              setExerciseSets(value.toString()); // Update state if valid
            } else if (value === 0) {
              setExerciseSets(''); // Prevent 0 from being displayed
            }
          }}
        />
        <TextInput
          style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
          placeholder={t('repsPlaceholder')}
          placeholderTextColor={theme.text}
          keyboardType="numeric"
          value={exerciseReps}
          onChangeText={(text) => {
            const sanitizedText = text.replace(/[^0-9]/g, ''); // Remove non-numeric characters
            let value = parseInt(sanitizedText || '0'); // Convert to integer
            if (value > 0 && value <= 10000) {
              setExerciseReps(value.toString()); // Update state if valid
            } else if (value === 0) {
              setExerciseReps(''); // Prevent 0 from being displayed
            }
          }}
        />
        <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.buttonBackground }]} onPress={addExercise}>
          <Text style={[styles.saveButtonText, { color: theme.buttonText }]}>{t('Save')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.cancelButton, { backgroundColor: theme.card }]} onPress={closeAddExerciseModal}>
          <Text style={[styles.cancelButtonText, { color: theme.text }]}>{t('Cancel')}</Text>
        </TouchableOpacity>
      </View>
    </View>
      </Modal>
       {/* Banner Ad Section */}
       <View style={styles.adContainer}>
        <BannerAdComponent />
      </View>
    </View>
  );
}


// WorkoutDetails.tsx

const styles = StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 60,
      backgroundColor: '#FFFFFF',
    },
    adContainer: {
      alignItems: 'center',
    },
    backButton: {
      position: 'absolute',
      top: 20,
      left: 10,
      zIndex: 10,
      padding: 8,
    },
    titleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 30, // Spacing between the title and the content below
    },
    
    editIcon: {
      paddingLeft:30, // Adds space between the text and the icon
      paddingTop: 5,
      paddingBottom:30,     // Increases touchable area around the icon
    },
    title: {
      fontSize: 36,
      fontWeight: '900',
      textAlign: 'center',
      marginBottom: 30,
      color: '#000000',
    },
    dayContainer: {
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
    dayHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    dayTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: '#000000',
    },
    exerciseContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: '#F7F7F7',
      borderRadius: 15,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: 'rgba(0, 0, 0, 0.1)',
      maxWidth: '100%',  // Prevent overflow
    },
    exerciseName: {
      flex: 1,  // Allow text to use remaining space
      fontWeight: '700',
      color: '#000000',
    },
    exerciseDetails: {
      fontSize: 16,
      color: '#000000',
      textAlign: 'right',
    },
    
    noExercisesText: {
      textAlign: 'center',
      fontSize: 16,
      fontStyle: 'italic',
      color: 'rgba(0, 0, 0, 0.5)',
      marginTop: 10,
    },
    addDayButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#000000',
      borderRadius: 20,
      padding: 12,
      marginTop: 1,
      justifyContent: 'center',
    },
    addDayButtonText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '800',
      marginLeft: 8,
    },
    emptyText: {
      textAlign: 'center',
      fontSize: 16,
      color: 'rgba(0, 0, 0, 0.5)',
      marginTop: 20,
    },
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
      backgroundColor: '#FFFFFF',
      borderRadius: 15,
      padding: 20,
      width: '80%',
      alignItems: 'center',
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 15,
    },
    input: {
      width: '100%',
      borderWidth: 1,
      borderColor: 'rgba(0, 0, 0, 0.2)',
      borderRadius: 8,
      padding: 10,
      marginBottom: 10,
    },
    saveButton: {
      backgroundColor: '#000000',
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 20,
      marginBottom: 10,
    },
    saveButtonText: {
      color: '#FFFFFF',
      fontWeight: 'bold',
    },
    cancelButton: {
      borderWidth: 1,
      borderColor: '#000000',
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 20,
    },
    cancelButtonText: {
      color: '#000000',
      fontWeight: 'bold',
    },
  });
  