import { useFocusEffect } from '@react-navigation/native'; // Import useFocusEffect
import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSQLiteContext } from 'expo-sqlite';
import { AutoSizeText, ResizeTextMode } from 'react-native-auto-size-text';
import { useTheme } from '../context/ThemeContext';
import { WorkoutStackParamList } from '../App';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';






type WorkoutListNavigationProp = StackNavigationProp<WorkoutStackParamList, 'TemplateDetails'>;


type Day = {
  day_id: number;
  day_name: string;
  exercises: { exercise_name: string; sets: number; reps: number }[];
};
export default function TemplateDetails() {
  const db = useSQLiteContext();
  const route = useRoute();
 

  const { theme } = useTheme();
  const { t } = useTranslation(); // Initialize translations
  
  
  const { workout_id } = route.params as { workout_id: number };

  const [workoutName, setWorkoutName] = useState('');
  const [days, setDays] = useState<Day[]>([]);
  const navigation = useNavigation<WorkoutListNavigationProp>();


  useFocusEffect(
    React.useCallback(() => {
      fetchWorkoutDetails();
    }, [workout_id])
  );

  const fetchWorkoutDetails = async () => {
    const workoutResult = await db.getAllAsync<{ workout_name: string }>(
      'SELECT workout_name FROM Template_Workouts WHERE workout_id = ?',
      [workout_id]
    );
    setWorkoutName(workoutResult[0]?.workout_name || '');
  
    const daysResult = await db.getAllAsync<{ day_id: number; day_name: string }>(
      'SELECT day_id, day_name FROM Template_Days WHERE workout_id = ?',
      [workout_id]
    );
  
    const daysWithExercises = await Promise.all(
      daysResult.map(async (day) => {
        const exercises = await db.getAllAsync<{
          exercise_id: number;
          exercise_name: string;
          sets: number;
          reps: number;
        }>(
          'SELECT exercise_id, exercise_name, sets, reps FROM Template_Exercises WHERE day_id = ? ORDER BY exercise_id',
          [day.day_id]
        );
        return { ...day, exercises };
      })
    );
  
    // Sort days by day_id in ascending order
    const sortedDays = daysWithExercises.sort((a, b) => a.day_id - b.day_id);
  
    setDays(sortedDays);
  };

  

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
  <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
    <Ionicons name="arrow-back" size={24} color={theme.text} />
  </TouchableOpacity>


  <View style={styles.titleContainer}>
  {/* This View will stretch and center the text */}
  <View style={{ flex: 1, alignItems: 'center' }}>
    <Text style={[styles.title, { color: theme.text }]}>{workoutName}</Text>
  </View>
  

</View>


  <FlatList
    data={days}
    keyExtractor={(item) => item.day_id.toString()}
    renderItem={({ item: day }) => (
      <View
        style={[styles.dayContainer, { backgroundColor: theme.card, borderColor: theme.border }]} // Entire day card is now pressable
      >
        {/* Day Header */}
        <View style={styles.dayHeader}>
          <Text style={[styles.dayTitle, { color: theme.text }]}>{day.day_name}</Text>
          {/* Add Exercise Button */}
       
        </View>

        {/* Exercises */}
        {day.exercises.length > 0 ? (
          day.exercises.map((exercise, index) => (
            <TouchableOpacity
              key={index}
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
                numberOfLines={3}
                mode={ResizeTextMode.max_lines}
                style={[styles.exerciseDetails, { color: theme.text }]}
              >
                {exercise.sets} {t('Sets')} {'\n'} {exercise.reps} {t('Reps')} 
              </AutoSizeText>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={[styles.noExercisesText, { color: theme.text }]}>{t('noExercises')} </Text>
        )}
      </View>
    )}
    ListFooterComponent={
      <TouchableOpacity
        style={[styles.addDayButton, { backgroundColor: theme.buttonBackground }]}
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
      marginBottom: 30, 
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
  