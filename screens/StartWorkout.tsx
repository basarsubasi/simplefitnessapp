import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { StartWorkoutStackParamList } from '../App';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import { useSettings } from '../context/SettingsContext';

type StartWorkoutNavigationProp = StackNavigationProp<
  StartWorkoutStackParamList,
  'StartWorkout'
>;

export default function StartWorkout() {
  const navigation = useNavigation<StartWorkoutNavigationProp>();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const db = useSQLiteContext();
  const { dateFormat } = useSettings();

  // State for workouts
const [todayWorkouts, setTodayWorkouts] = useState<
  { workout_name: string; workout_date: number; day_name: string; workout_log_id: number }[]
>([]);
  const [untrackedWorkouts, setUntrackedWorkouts] = useState<
    { workout_name: string; workout_date: number; day_name: string; workout_log_id: number }[]
  >([]);
  
  const [selectedWorkout, setSelectedWorkout] = useState<
    { workout_name: string; workout_date: number; day_name: string; workout_log_id: number } | null
  >(null);

  useFocusEffect(
    React.useCallback(() => {
      async function initializeData() {
        await addColumn0 ()
        await addColumn1()
        await fetchWorkouts()
        
      }
      
      initializeData()
      console.log('StartWorkout screen focused - data refreshed')
      
      return () => {};
    }, [])
  );

  const addColumn0 = async () => {
    try {
      // Check if column exists first
      const tableInfo = await db.getAllAsync(
        "PRAGMA table_info(Weight_Log);"
      );
      const columnExists = tableInfo.some(
        (column: any) => column.name === 'completion_time'
      );
      
      if (!columnExists) {
        await db.runAsync('ALTER TABLE Weight_Log ADD COLUMN completion_time INTEGER;');
        console.log('Column added successfully');
      } else {
        console.log('Column already exists, skipping');
      }
    } catch (error) {
      console.error('Error managing column:', error);
    }
  };


  const addColumn1 = async () => {
    try {
      // Check if column exists first
      const tableInfo = await db.getAllAsync(
        "PRAGMA table_info(Workout_Log);"
      );
      const columnExists = tableInfo.some(
        (column: any) => column.name === 'completion_time'
      );
      
      if (!columnExists) {
        await db.runAsync('ALTER TABLE Workout_Log ADD COLUMN completion_time INTEGER;');
        console.log('Column added successfully');
      } else {
        console.log('Column already exists, skipping');
      }
    } catch (error) {
      console.error('Error managing column:', error);
    }
  };


  const fetchWorkouts = async () => {
    try {
      const today = new Date();
      const startOfDayTimestamp = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      ).getTime() / 1000;

      const endOfDayTimestamp = startOfDayTimestamp + 86400 - 1;

      // Fetch today's workout - modified to exclude logged workouts
      const todayResult = await db.getAllAsync<{
        workout_name: string;
        workout_date: number;
        day_name: string;
        workout_log_id: number;
      }>(
        `SELECT * FROM Workout_Log 
           WHERE workout_date BETWEEN ? AND ?
             AND workout_log_id NOT IN (SELECT DISTINCT workout_log_id FROM Weight_Log)
           ORDER BY workout_date ASC;`,
        [startOfDayTimestamp, endOfDayTimestamp]
      );
          setTodayWorkouts(todayResult);

      // Fetch past workouts not logged in Weight_Log
      const untrackedResult = await db.getAllAsync<{
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
      setUntrackedWorkouts(untrackedResult);
    } catch (error) {
      console.error('Error fetching workouts:', error);
    }
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    const today = new Date();
    const yesterday = new Date();
    const tomorrow = new Date();
    
    yesterday.setDate(today.getDate() - 1);
    tomorrow.setDate(today.getDate() + 1);
    
    // Helper to compare dates without time
    const isSameDay = (d1: Date, d2: Date) =>
      d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear();
    
    // Check if the date matches today, yesterday, or tomorrow
    if (isSameDay(date, today)) {
      return t('Today');
    } else if (isSameDay(date, yesterday)) {
      return t('Yesterday');
    } else if (isSameDay(date, tomorrow)) {
      return t('Tomorrow');
    }
    
    // Default date formatting based on user-selected format
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return dateFormat === 'mm-dd-yyyy'
      ? `${month}-${day}-${year}`
      : `${day}-${month}-${year}`;
  };

  const startWorkout = (workout: {
    workout_name: string;
    workout_date: number;
    day_name: string;
    workout_log_id: number;
  }) => {
    navigation.navigate('StartedWorkoutInterface', { workout_log_id: workout.workout_log_id });
  };

  const handleWorkoutPress = (workout: {
    workout_name: string;
    workout_date: number;
    day_name: string;
    workout_log_id: number;
  }) => {
    // If the workout is already selected, unselect it
    if (selectedWorkout && selectedWorkout.workout_log_id === workout.workout_log_id) {
      setSelectedWorkout(null);
    } else {
      // Otherwise, select it
      setSelectedWorkout(workout);
    }
  };

  const renderWorkoutCard = (workout: {
    workout_name: string;
    workout_date: number;
    day_name: string;
    workout_log_id: number;
  }) => {
    const isSelected = selectedWorkout?.workout_log_id === workout.workout_log_id;
    
    // Calculate appropriate border color based on theme type
    const selectedBorderColor = theme.type === 'dark' 
      ? 'rgba(255, 255, 255, 0.4)' // More subtle for dark mode
      : theme.text;
    
    return (
      <TouchableOpacity
        key={workout.workout_log_id}
        style={[
          styles.logContainer, 
          { 
            backgroundColor: theme.card, 
            borderColor: isSelected ? selectedBorderColor : theme.border,
            borderWidth: 1,
            // Add subtle shadow/glow effect when selected that works in both modes
            shadowColor: isSelected ? (theme.type === 'dark' ? '#fff' : '#000') : 'transparent',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: isSelected ? (theme.type === 'dark' ? 0.2 : 0.3) : 0,
            shadowRadius: isSelected ? 4 : 0,
          }
        ]}
        onPress={() => handleWorkoutPress(workout)}
      >
        <Text style={[styles.logDate, { color: theme.text }]}>{formatDate(workout.workout_date)}</Text>
        <Text style={[styles.logWorkoutName, { color: theme.text }]}>{workout.workout_name}</Text>
        <Text style={[styles.logDayName, { color: theme.text }]}>{workout.day_name}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>{t('startWorkout')}</Text>
      
      <TouchableOpacity
        style={[
          styles.startButton, 
          { 
            backgroundColor: selectedWorkout ? theme.buttonBackground : theme.inactivetint,
            opacity: selectedWorkout ? 1 : 0.7,
            marginHorizontal: 20,
            marginBottom: 20
          }
        ]}
        onPress={() => selectedWorkout && startWorkout(selectedWorkout)}
        disabled={!selectedWorkout}
      >
        <Ionicons name="stopwatch" size={24} color={theme.buttonText} style={styles.icon} />
        <Text style={[styles.buttonText, { color: theme.buttonText }]}>
          {t('startWorkout')}
        </Text>
      </TouchableOpacity>
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
    <Text style={[styles.sectionTitle, { color: theme.text }]}>
      {t('todaysWorkout')}
    </Text>
       {todayWorkouts.length > 0 ? (
     todayWorkouts.map((workout) => renderWorkoutCard(workout))
       ) : (
     <Text style={[styles.emptyText, { color: theme.text }]}>
      {t('noWorkoutToday')}
      </Text>
         )}
        </View>
        
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {t('untrackedWorkouts')}
          </Text>
          {untrackedWorkouts.length > 0 ? (
            untrackedWorkouts.map((workout) => (
              <View key={workout.workout_log_id}>
                {renderWorkoutCard(workout)}
              </View>
            ))
          ) : (
            <Text style={[styles.emptyText, { color: theme.text }]}>
              {t('noUntrackedWorkouts')}
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 20,
    textAlign: 'center',
    marginTop: 60,
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  section: {
    width: '100%',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
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
    textAlign: 'center',
  },
  logWorkoutName: { 
    fontSize: 20, 
    fontWeight: '900', 
    marginBottom: 8, 
    textAlign: 'center' 
  },
  logDayName: { 
    fontSize: 18, 
    fontWeight: '700', 
    textAlign: 'center' 
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 10,
    marginBottom: 10,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 20,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  icon: {
    marginRight: 10,
  },
}); 