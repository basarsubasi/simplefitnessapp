import { useFocusEffect } from '@react-navigation/native'; // Import useFocusEffect
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, TextInput, Animated, Linking } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSQLiteContext } from 'expo-sqlite';
import { AutoSizeText, ResizeTextMode } from 'react-native-auto-size-text';
import { useTheme } from '../context/ThemeContext';
import { WorkoutStackParamList } from '../App';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { exportWorkout } from '../utils/workoutSharingUtils';
import { addMuscleGroupColumn } from '../utils/exerciseDetailUtils';






type WorkoutListNavigationProp = StackNavigationProp<WorkoutStackParamList, 'WorkoutDetails'>;


type Day = {
  day_id: number;
  day_name: string;
  exercises: { exercise_id: number; exercise_name: string; sets: number; reps: number; web_link: string | null; muscle_group: string | null }[];
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
  const [exerciseWebLink, setExerciseWebLink] = useState('');
  const [newExerciseMuscleGroup, setNewExerciseMuscleGroup] = useState<string | null>(null);
  const [showWebLinkModal, setShowWebLinkModal] = useState(false);
  const [editingExercise, setEditingExercise] = useState<{ exercise_id: number; web_link: string | null; muscle_group: string | null } | null>(null);
  const [webLinkInput, setWebLinkInput] = useState('');
  const [editingMuscleGroup, setEditingMuscleGroup] = useState<string | null>(null);
  const navigation = useNavigation<WorkoutListNavigationProp>();
  const [isReordering, setIsReordering] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;


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
        const exercises = await db.getAllAsync<{ exercise_id: number; exercise_name: string; sets: number; reps: number; web_link: string; muscle_group: string | null }>(
          'SELECT exercise_id, exercise_name, sets, reps, web_link, muscle_group FROM Exercises WHERE day_id = ?',
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
  
              // Use a transaction to ensure all operations succeed or fail together
              await db.withTransactionAsync(async () => {
              // Fetch logs only for workout_date >= today
              const logs = await db.getAllAsync<{ workout_log_id: number; workout_date: number }>(
                'SELECT workout_log_id, workout_date FROM Workout_Log WHERE day_name = ? AND workout_name = (SELECT workout_name FROM Workouts WHERE workout_id = ?) AND workout_date >= ?;',
                [day_name, workout_id, currentDate]
              );
  
                // Delete all associated future logs
              for (const log of logs) {
                console.log(`Deleting log ${log.workout_log_id} with workout_date: ${log.workout_date}`);
                await db.runAsync('DELETE FROM Logged_Exercises WHERE workout_log_id = ?;', [log.workout_log_id]);
                await db.runAsync('DELETE FROM Workout_Log WHERE workout_log_id = ?;', [log.workout_log_id]);
              }
  
                // Delete the day and its exercises
              await db.runAsync('DELETE FROM Exercises WHERE day_id = ?;', [day_id]);
              await db.runAsync('DELETE FROM Days WHERE day_id = ?;', [day_id]);
              });
  
              fetchWorkoutDetails();
            } catch (error) {
              console.error('Error deleting day with future logs:', error);
              Alert.alert(t('errorTitle'), 'Error deleting day and associated logs.');
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
  
              // Use a transaction to ensure all operations succeed or fail together
              await db.withTransactionAsync(async () => {
                // Get day name for this day_id
                const dayResult = await db.getAllAsync<{ day_name: string }>(
                  'SELECT day_name FROM Days WHERE day_id = ?',
                  [day_id]
                );
                
                const dayName = dayResult[0]?.day_name;
                
                if (dayName) {
                  // Get workout name for this workout_id
                  const workoutResult = await db.getAllAsync<{ workout_name: string }>(
                    'SELECT workout_name FROM Workouts WHERE workout_id = ?',
                    [workout_id]
                  );
                  
                  const workoutName = workoutResult[0]?.workout_name;
                  
                  if (workoutName) {
              // Fetch logs only for workout_date >= today
              const logs = await db.getAllAsync<{ workout_log_id: number; workout_date: number }>(
                      'SELECT workout_log_id, workout_date FROM Workout_Log WHERE day_name = ? AND workout_name = ? AND workout_date >= ?;',
                      [dayName, workoutName, currentDate]
              );
  
                    // Delete the exercise from all future logs
              for (const log of logs) {
                      console.log(`Deleting exercise ${exercise_name} from log ${log.workout_log_id} with workout_date: ${log.workout_date}`);
                await db.runAsync(
                  'DELETE FROM Logged_Exercises WHERE workout_log_id = ? AND exercise_name = ?;',
                  [log.workout_log_id, exercise_name]
                );
                    }
                  }
              }
  
              // Delete the exercise itself
              await db.runAsync('DELETE FROM Exercises WHERE day_id = ? AND exercise_name = ?;', [day_id, exercise_name]);
              });
  
              fetchWorkoutDetails();
            } catch (error) {
              console.error('Error deleting exercise with future logs:', error);
              Alert.alert(t('errorTitle'), 'Error deleting exercise from future logs.');
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
          const exercises = await db.getAllAsync<{ exercise_name: string; sets: number; reps: number; web_link: string | null; muscle_group: string | null }>(
            'SELECT exercise_name, sets, reps, web_link, muscle_group FROM Exercises WHERE day_id = ?;',
            [day.day_id]
          );
  
          // Delete existing logged exercises for the log
          await db.runAsync('DELETE FROM Logged_Exercises WHERE workout_log_id = ?;', [log.workout_log_id]);
  
          // Insert updated exercises into the log
          const insertExercisePromises = exercises.map((exercise) =>
            db.runAsync(
              'INSERT INTO Logged_Exercises (workout_log_id, exercise_name, sets, reps, web_link, muscle_group) VALUES (?, ?, ?, ?, ?, ?);',
              [log.workout_log_id, exercise.exercise_name, exercise.sets, exercise.reps, exercise.web_link, exercise.muscle_group]
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
    setExerciseWebLink('');
    setNewExerciseMuscleGroup(null);
    setShowExerciseModal(true);
  };

  const closeAddExerciseModal = () => {
    setShowExerciseModal(false);
    setCurrentDayId(null);
  };

  const addExercise = async () => {
    const sets = exerciseSets.trim();
    const reps = exerciseReps.trim();
    const webLink = exerciseWebLink.trim();

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
    
    if (webLink && !webLink.startsWith('http://') && !webLink.startsWith('https://')) {
      Alert.alert(
        t('invalidLinkTitle'),
        t('invalidLinkMessage')
      );
      return;
    }

    if (currentDayId) {
      await db.runAsync(
        'INSERT INTO Exercises (day_id, exercise_name, sets, reps, web_link, muscle_group) VALUES (?, ?, ?, ?, ?, ?);',
        [currentDayId, exerciseName.trim(), parseInt(sets, 10), parseInt(reps, 10), webLink || null, newExerciseMuscleGroup || null]
      );
      await updateWorkoutLogsForAdditions(workout_id);
      fetchWorkoutDetails();
      closeAddExerciseModal();
    }
  };
  
  // Function to animate the reordering state change
  const animateReordering = (reordering: boolean) => {
    // Create animation sequence
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: reordering ? 0.7 : 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: reordering ? 0.98 : 1,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start();
  };

  // Update animation when reordering state changes
  useEffect(() => {
    animateReordering(isReordering);
  }, [isReordering]);

  // Function to move a day up (swap with the previous day)
  const moveDayUp = async (index: number) => {
    if (index <= 0 || index >= days.length || isReordering) return; // Can't move first day up
    
    try {
      setIsReordering(true);
      
      // Add a small delay for visual feedback
      setTimeout(async () => {
        try {
          const currentDay = days[index];
          const prevDay = days[index - 1];
          
          // Use a transaction to ensure everything happens together
          await db.withTransactionAsync(async () => {
            // First, temporarily change the day_id for all exercises in the current day
            await db.runAsync('UPDATE Exercises SET day_id = ? WHERE day_id = ?', 
              [-1 * currentDay.day_id, currentDay.day_id]);
            
            // Then temporarily change the day_id for all exercises in the previous day
            await db.runAsync('UPDATE Exercises SET day_id = ? WHERE day_id = ?', 
              [-1 * prevDay.day_id, prevDay.day_id]);
            
            // Swap day_ids in the Days table
            await db.runAsync('UPDATE Days SET day_id = ? WHERE day_id = ?', [-999, currentDay.day_id]); 
            await db.runAsync('UPDATE Days SET day_id = ? WHERE day_id = ?', [currentDay.day_id, prevDay.day_id]);
            await db.runAsync('UPDATE Days SET day_id = ? WHERE day_id = ?', [prevDay.day_id, -999]);
            
            // Now update exercises to their new day_ids
            await db.runAsync('UPDATE Exercises SET day_id = ? WHERE day_id = ?', 
              [prevDay.day_id, -1 * currentDay.day_id]);
            await db.runAsync('UPDATE Exercises SET day_id = ? WHERE day_id = ?', 
              [currentDay.day_id, -1 * prevDay.day_id]);
          });
          
          // Update workout logs for future dates
          await updateWorkoutLogsForReordering(workout_id);
          
          // Refresh the list
          await fetchWorkoutDetails();
        } catch (error) {
          console.error('Database operation failed:', error);
          Alert.alert(t('errorTitle'), 'Failed to reorder days.');
        } finally {
          setIsReordering(false);
        }
      }, 300); // 300ms delay for visual effect
      
    } catch (error) {
      console.error('Error moving day up:', error);
      Alert.alert(t('errorTitle'), 'Failed to reorder days.');
      setIsReordering(false);
    }
  };

  // Function to move a day down (swap with the next day)
  const moveDayDown = async (index: number) => {
    if (index < 0 || index >= days.length - 1 || isReordering) return; // Can't move last day down
    
    try {
      setIsReordering(true);
      
      // Add a small delay for visual feedback
      setTimeout(async () => {
        try {
          const currentDay = days[index];
          const nextDay = days[index + 1];
          
          // Use a transaction to ensure everything happens together
          await db.withTransactionAsync(async () => {
            // First, temporarily change the day_id for all exercises in the current day
            await db.runAsync('UPDATE Exercises SET day_id = ? WHERE day_id = ?', 
              [-1 * currentDay.day_id, currentDay.day_id]);
            
            // Then temporarily change the day_id for all exercises in the next day
            await db.runAsync('UPDATE Exercises SET day_id = ? WHERE day_id = ?', 
              [-1 * nextDay.day_id, nextDay.day_id]);
            
            // Swap day_ids in the Days table
            await db.runAsync('UPDATE Days SET day_id = ? WHERE day_id = ?', [-999, currentDay.day_id]);
            await db.runAsync('UPDATE Days SET day_id = ? WHERE day_id = ?', [currentDay.day_id, nextDay.day_id]);
            await db.runAsync('UPDATE Days SET day_id = ? WHERE day_id = ?', [nextDay.day_id, -999]);
            
            // Now update exercises to their new day_ids
            await db.runAsync('UPDATE Exercises SET day_id = ? WHERE day_id = ?', 
              [nextDay.day_id, -1 * currentDay.day_id]);
            await db.runAsync('UPDATE Exercises SET day_id = ? WHERE day_id = ?', 
              [currentDay.day_id, -1 * nextDay.day_id]);
          });
          
          // Update workout logs for future dates
          await updateWorkoutLogsForReordering(workout_id);
          
          // Refresh the list
          await fetchWorkoutDetails();
        } catch (error) {
          console.error('Database operation failed:', error);
          Alert.alert(t('errorTitle'), 'Failed to reorder days.');
        } finally {
          setIsReordering(false);
        }
      }, 300); // 300ms delay for visual effect
      
    } catch (error) {
      console.error('Error moving day down:', error);
      Alert.alert(t('errorTitle'), 'Failed to reorder days.');
      setIsReordering(false);
    }
  };

  // Update workout logs when days are reordered
  const updateWorkoutLogsForReordering = async (workout_id: number) => {
    try {
      const currentDate = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000); // Today's date as Unix timestamp
  
      // Get the current workout name
      const workoutResult = await db.getAllAsync<{ workout_name: string }>(
        'SELECT workout_name FROM Workouts WHERE workout_id = ?',
        [workout_id]
      );
      
      const workoutName = workoutResult[0]?.workout_name;
      
      // Fetch all logs for the current workout where workout_date >= today
      const logs = await db.getAllAsync<{ workout_log_id: number; day_name: string; workout_date: number }>(
        'SELECT workout_log_id, day_name, workout_date FROM Workout_Log WHERE workout_name = ? AND workout_date >= ?;',
        [workoutName, currentDate]
      );
  
      // Fetch updated days and exercises
      const days = await db.getAllAsync<{ day_id: number; day_name: string }>(
        'SELECT day_id, day_name FROM Days WHERE workout_id = ? ORDER BY day_id;',
        [workout_id]
      );
  
      for (const log of logs) {
        const day = days.find((d) => d.day_name === log.day_name);
  
        if (day) {
          console.log(`Updating log ${log.workout_log_id} for day: ${day.day_name}`);
  
          // Fetch updated exercises for the day
          const exercises = await db.getAllAsync<{ exercise_name: string; sets: number; reps: number; web_link: string | null; muscle_group: string | null }>(
            'SELECT exercise_name, sets, reps, web_link, muscle_group FROM Exercises WHERE day_id = ?;',
            [day.day_id]
          );
  
          // Delete existing logged exercises for the log
          await db.runAsync('DELETE FROM Logged_Exercises WHERE workout_log_id = ?;', [log.workout_log_id]);
  
          // Insert updated exercises into the log
          const insertExercisePromises = exercises.map((exercise) =>
            db.runAsync(
              'INSERT INTO Logged_Exercises (workout_log_id, exercise_name, sets, reps, web_link, muscle_group) VALUES (?, ?, ?, ?, ?, ?);',
              [log.workout_log_id, exercise.exercise_name, exercise.sets, exercise.reps, exercise.web_link, exercise.muscle_group]
            )
          );
  
          await Promise.all(insertExercisePromises);
          
          console.log(`Successfully updated log ${log.workout_log_id} with reordered days.`);
        }
      }
    } catch (error) {
      console.error('Error updating workout logs after reordering days:', error);
    }
  };

  const openWebLinkModal = (exercise: { exercise_id: number; web_link: string | null; muscle_group: string | null }) => {
    setEditingExercise(exercise);
    setWebLinkInput(exercise.web_link || '');
    setEditingMuscleGroup(exercise.muscle_group);
    setShowWebLinkModal(true);
  };

  const closeWebLinkModal = () => {
    setShowWebLinkModal(false);
    setEditingExercise(null);
    setWebLinkInput('');
    setEditingMuscleGroup(null);
  };

  const handleSaveWebLink = async () => {
    if (!editingExercise) return;

    const trimmedLink = webLinkInput.trim();

    // Validation
    if (trimmedLink && !trimmedLink.startsWith('http://') && !trimmedLink.startsWith('https://')) {
      Alert.alert(
        t('invalidLinkTitle'),
        t('invalidLinkMessage')
      );
      return;
    }

    try {
      await db.runAsync(
        'UPDATE Exercises SET web_link = ?, muscle_group = ? WHERE exercise_id = ?',
        [trimmedLink || null, editingMuscleGroup, editingExercise.exercise_id]
      );
      
      // Update logs as well
      await updateWorkoutLogsForAdditions(workout_id);
      
      fetchWorkoutDetails();
      closeWebLinkModal();
    } catch (error) {
      console.error('Error updating web link:', error);
      Alert.alert(t('errorTitle'), 'Failed to update web link.');
    }
  };

  const handleLinkPress = async (url: string | null) => {
    if (!url) {
      Alert.alert(t('noLinkAvailable'));
      return;
    }
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(`${t('cannotOpenURL')}: ${url}`);
      }
    } catch (error) {
      console.error('Error opening URL:', error);
      Alert.alert(t('errorOpeningURL'));
    }
  };

  const handleExportWorkout = (workoutId: number) => {
    exportWorkout(db, workoutId);
  };

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

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
  <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
    <Ionicons name="arrow-back" size={24} color={theme.text} />
  </TouchableOpacity>


    {/* Icon on the right */}
    <TouchableOpacity
    style={styles.editIcon}
    onPress={() => navigation.navigate('EditWorkout', { workout_id: workout_id })}
  >
    <Ionicons name="pencil-outline" size={24} color={theme.text} />
  </TouchableOpacity>

  <View style={styles.titleContainer}>
  {/* This View will stretch and center the text */}
  <View style={{ flex: 1, alignItems: 'center' }}>
    <Text style={[styles.title, { color: theme.text }]}>{workoutName}</Text>
  </View>
  

</View>

<TouchableOpacity
  style={styles.exportButton}
  onPress={() => handleExportWorkout(workout_id)}
>
  <Ionicons name="share-outline" size={28} color={theme.text} />
</TouchableOpacity>


  <FlatList
    data={days}
    showsVerticalScrollIndicator={false}
    showsHorizontalScrollIndicator={false}
    keyExtractor={(item) => item.day_id.toString()}
    renderItem={({ item: day, index }) => (
      <Animated.View
        style={[
          styles.animatedDayContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
            backgroundColor: theme.card,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 20,
          }
        ]}
      >
      <TouchableOpacity
          onLongPress={() => handleDeleteDay(day.day_id, day.day_name, workout_id)}
        activeOpacity={0.8}
          style={[
            styles.dayContainer, 
            { 
              padding: 20, 
            }
          ]}
      >
        {/* Day Header */}
        <View style={styles.dayHeader}>
          <Text style={[styles.dayTitle, { color: theme.text }]}>{day.day_name}</Text>
            
            <View style={styles.dayHeaderRightControls}>
              {/* Day reordering arrows */}
              <View style={styles.reorderButtonsContainer}>
                {index > 0 && (
                  <TouchableOpacity
                    onPress={() => !isReordering && moveDayUp(index)}
                    disabled={isReordering}
                    style={styles.reorderButton}
                  >
                    <Ionicons name="arrow-up" size={24} color={isReordering ? theme.border : theme.text} />
                  </TouchableOpacity>
                )}
                {index < days.length - 1 && (
                  <TouchableOpacity
                    onPress={() => !isReordering && moveDayDown(index)}
                    disabled={isReordering}
                    style={styles.reorderButton}
                  >
                    <Ionicons name="arrow-down" size={24} color={isReordering ? theme.border : theme.text} />
                  </TouchableOpacity>
                )}
              </View>
              
          {/* Add Exercise Button */}
            <TouchableOpacity 
              onPress={() => openAddExerciseModal(day.day_id)}
              disabled={isReordering}
            >
              <Ionicons 
                name="add" 
                size={28} 
                color={isReordering ? theme.border : theme.text} 
              />
          </TouchableOpacity>
            </View>
        </View>

        {/* Exercises */}
        {day.exercises.length > 0 ? (
          day.exercises.map((exercise, index) => {
            const muscleGroupInfo = muscleGroupData.find(mg => mg.value === exercise.muscle_group);
            return (
              <TouchableOpacity
                key={index}
                onPress={() => openWebLinkModal(exercise)}
                onLongPress={() => handleDeleteExercise(day.day_id, exercise.exercise_name, workout_id)}
                  activeOpacity={0.6}
                  delayLongPress={500}
                  style={[
                    styles.exerciseContainer, 
                    { 
                      backgroundColor: theme.card, 
                      borderColor: theme.border 
                    }
                  ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                  {exercise.web_link && (
                    <TouchableOpacity onPress={() => handleLinkPress(exercise.web_link)} style={{ alignSelf: 'flex-start', marginRight: 10, marginTop: 2 }}>
                      <Ionicons name="link-outline" size={22} color={theme.text} />
                    </TouchableOpacity>
                  )}
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                    <AutoSizeText
                      fontSize={18}
                      numberOfLines={3}
                      mode={ResizeTextMode.max_lines}
                      style={[styles.exerciseName, { color: theme.text, marginRight: 8 }]}
                    >
                      {exercise.exercise_name}
                    </AutoSizeText>
                    {muscleGroupInfo && muscleGroupInfo.value && (
                      <View style={[styles.muscleGroupBadge, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <Text style={[styles.muscleGroupBadgeText, { color: theme.text }]}>
                          {muscleGroupInfo.label}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.exerciseDetails}>
                  <Text style={{ color: theme.text, fontSize: 16, textAlign: 'right' }}>
                    {exercise.sets} <Text style={{ color: theme.text }}>{t('Sets')}</Text>
                    {'  '}
                    {exercise.reps} <Text style={{ color: theme.text }}>{t('Reps')}</Text>
                  </Text>
                </View>
              </TouchableOpacity>
            )
          })
        ) : (
          <Text style={[styles.noExercisesText, { color: theme.text }]}>{t('noExercises')} </Text>
        )}
      </TouchableOpacity>
      </Animated.View>
    )}
    ListFooterComponent={
      <>
        <TouchableOpacity
          style={[styles.addDayButton, { backgroundColor: theme.buttonBackground }]}
          onPress={openAddDayModal}
        >
          <Ionicons name="add" size={28} color={theme.buttonText} />
          <Text style={[styles.addDayButtonText, { color: theme.buttonText }]}>{t('addDayFromDetails')}</Text>
        </TouchableOpacity>
        <Text style={[styles.tipText, { color: theme.text }]}>
          {t('workoutDetailsTip')}
        </Text>
      </>
    }
    ListEmptyComponent={
      <Text style={[styles.emptyText, { color: theme.text }]}>
        {t('emptyWorkoutDetails')}
      </Text>
    }
  />

  <Modal visible={showDayModal} animationType="fade" transparent>
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

  <Modal visible={showExerciseModal} animationType="fade" transparent>
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
        <Text style={[styles.inputLabel, { color: theme.text, marginTop: 10 }]}>{t('webLink')}</Text>
        <TextInput
          style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
          placeholder={t('webLinkPlaceholder')}
          placeholderTextColor={theme.text}
          value={exerciseWebLink}
          onChangeText={setExerciseWebLink}
          autoCapitalize="none"
          keyboardType="url"
        />
        <Text style={[styles.inputLabel, { color: theme.text, marginTop: 10 }]}>{t('muscleGroup')}</Text>
        <FlatList
          data={muscleGroupData}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.label}
          renderItem={({ item }) => {
            const isSelected = newExerciseMuscleGroup === item.value;
            
            return (
              <TouchableOpacity
                style={[
                  styles.muscleGroupButton,
                  { 
                    backgroundColor: isSelected ? theme.buttonBackground : theme.card,
                    borderColor: theme.border,
                  }
                ]}
                onPress={() => setNewExerciseMuscleGroup(item.value)}
              >
                <Text style={{ color: isSelected ? theme.buttonText : theme.text }}>{t(item.label)}</Text>
              </TouchableOpacity>
            );
          }}
          style={{ marginBottom: 15 }}
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

  <Modal visible={showWebLinkModal} animationType="fade" transparent>
    <View style={[styles.modalContainer, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
        <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{t('exerciseDetails')}</Text>
            <Text style={[styles.inputLabel, { color: theme.text }]}>{t('webLink')}</Text>
            <TextInput
                style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
                placeholder={t('webLinkPlaceholder')}
                placeholderTextColor={theme.text}
                value={webLinkInput}
                onChangeText={setWebLinkInput}
                autoCapitalize="none"
                keyboardType="url"
            />
            <Text style={[styles.inputLabel, { color: theme.text, marginTop: 15 }]}>{t('muscleGroup')}</Text>
            <FlatList
              data={muscleGroupData}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.label}
              renderItem={({ item }) => {
                const isSelected = editingMuscleGroup === item.value;
                
                return (
                  <TouchableOpacity
                    style={[
                      styles.muscleGroupButton,
                      { 
                        backgroundColor: isSelected ? theme.buttonBackground : theme.card,
                        borderColor: theme.border,
                      }
                    ]}
                    onPress={() => setEditingMuscleGroup(item.value)}
                  >
                    <Text style={{ color: isSelected ? theme.buttonText : theme.text }}>{t(item.label)}</Text>
                  </TouchableOpacity>
                );
              }}
              style={{ marginBottom: 15 }}
            />
            <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.buttonBackground }]} onPress={handleSaveWebLink}>
                <Text style={[styles.saveButtonText, { color: theme.buttonText }]}>{t('Save')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.cancelButton, { backgroundColor: theme.card }]} onPress={closeWebLinkModal}>
                <Text style={[styles.cancelButtonText, { color: theme.text }]}>{t('Cancel')}</Text>
            </TouchableOpacity>
        </View>
    </View>
  </Modal>
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
    },
    
    editIcon: {
      position: 'absolute',
      top: 20,
      right: 10,
      zIndex: 10,
      padding: 8,
      marginTop:3,
    },
    title: {
      fontSize: 36,
      fontWeight: '900',
      textAlign: 'center',
      marginBottom: 10,
    },
    dayContainer: {
      padding: 20,
    },
    dayHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    dayHeaderRightControls: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    reorderButtonsContainer: {
      flexDirection: 'row',
      marginRight: 8,
    },
    reorderButton: {
      marginHorizontal: 2,
      padding: 4,
    },
    dayTitle: {
      fontSize: 24,
      fontWeight: '800',
    },
    exerciseContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: '#F7F7F7',
      paddingVertical: 12,
      paddingHorizontal: 3,
      marginBottom: 5,
      borderWidth: 0,
      borderColor: 'rgba(0, 0, 0, 0.1)',
      maxWidth: '100%',  // Prevent overflow
    },
    exerciseName: {
      fontWeight: '700',
      color: '#000000',
    },
    exerciseDetails: {
      minWidth: 70,
      alignItems: 'flex-end',
    },
    muscleGroupBadge: {
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 15,
      borderWidth: 1,
      alignSelf: 'flex-start',
    },
    muscleGroupBadgeText: {
        fontSize: 12,
        fontWeight: '600',
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
      borderRadius: 20,
      padding: 12,
      marginTop: 1,
      justifyContent: 'center',
    },
    addDayButtonText: {
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
    },
    modalContent: {
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
    inputLabel: {
      alignSelf: 'stretch',
      textAlign: 'left',
      fontSize: 16,
      marginBottom: 5,
      fontWeight: '600',
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
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 20,
      marginBottom: 10,
    },
    saveButtonText: {
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
      fontWeight: 'bold',
    },
    animatedDayContainer: {
      marginBottom: 20,
      borderRadius: 20,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    tipText: {
      textAlign: 'center',
      fontSize: 14,
      fontStyle: 'italic',
      marginTop: 20,
      marginBottom: 20,
      paddingHorizontal: 10,
    },
    exportButton: {
      alignItems: 'center',
      marginBottom: 15,
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
  