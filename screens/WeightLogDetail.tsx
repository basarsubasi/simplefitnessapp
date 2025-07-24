import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  StatusBar,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../context/ThemeContext'; 
import { useTranslation } from 'react-i18next';
import { AutoSizeText, ResizeTextMode } from 'react-native-auto-size-text';

interface WeightLog {
  dayName: string;
  workoutDate: number;
  exercise: string;
  weight_logged: number;
  reps_logged: number;
  set_number: number;
  completion_time: number | null;
}

export default function WeightLogDetail() {
  const route = useRoute();
  
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { t } = useTranslation(); // Initialize translations

  const db = useSQLiteContext();
  const { workoutName } = route.params as { workoutName: string };
  const { weightFormat, dateFormat } = useSettings();
  const [days, setDays] = useState<
    { day_name: string; workout_date: number; completion_time: number | null }[]
  >([]);
  const [filteredDays, setFilteredDays] = useState<
    { day_name: string; workout_date: number; completion_time: number | null }[]
  >([]);
  const [expandedDays, setExpandedDays] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [logs, setLogs] = useState<{
    [key: string]: { [compositeKey: string]: { exerciseName: string; sets: any[]; loggedExerciseId: number; muscle_group: string | null; } };
  }>({});

  const [datePickerVisible, setDatePickerVisible] = useState<{
    start: boolean;
    end: boolean;
  }>({ start: false, end: false });
  const [dateRange, setDateRange] = useState<{
    start: Date | null;
    end: Date | null;
  }>({ start: null, end: null });

  const [showLogEditModal, setShowLogEditModal] = useState<boolean>(false);

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

  useEffect(() => {
    fetchDays();
  }, []);

  useEffect(() => {
    if (dateRange.start && dateRange.end) {
      filterDaysByDateRange(dateRange.start, dateRange.end);
    } else {
      setFilteredDays(days); // Reset filter when no range is selected
    }
  }, [dateRange, days]);

  const fetchDays = async () => {
    try {
      const result = await db.getAllAsync<{
        day_name: string;
        workout_date: number;
        completion_time: number | null;
      }>(
        `SELECT DISTINCT Workout_Log.day_name, Workout_Log.workout_date, 
         COALESCE(Workout_Log.completion_time, MIN(Weight_Log.completion_time)) as completion_time
         FROM Workout_Log
         INNER JOIN Weight_Log 
         ON Weight_Log.workout_log_id = Workout_Log.workout_log_id
         WHERE Workout_Log.workout_name = ?
         GROUP BY Workout_Log.day_name, Workout_Log.workout_date
         ORDER BY Workout_Log.workout_date DESC;`,
        [workoutName]
      );
      
      setDays(result);
      setFilteredDays(result); // Initially show all days
    } catch (error) {
      console.error('Error fetching days:', error);
    }
  };

  const fetchWeights = async (dayName: string, workoutDate: number) => {
    try {
      console.log(`Fetching weights for day: ${dayName}, date: ${workoutDate}, workout: ${workoutName}`);
      
      // First, try to get the workout_log_id
      const workoutLogResult = await db.getAllAsync<{ workout_log_id: number }>(
        `SELECT workout_log_id FROM Workout_Log 
         WHERE day_name = ? AND workout_date = ? AND workout_name = ?
         LIMIT 1;`,
        [dayName, workoutDate, workoutName]
      );
      
      if (workoutLogResult.length === 0) {
        console.error('No workout_log_id found for the given day, date and workout name');
        return;
      }
      
      const workout_log_id = workoutLogResult[0].workout_log_id;
      console.log(`Found workout_log_id: ${workout_log_id}`);
      
      // Now fetch the weight logs
      const result = await db.getAllAsync<{
        exercise_name: string;
        weight_logged: number;
        reps_logged: number;
        set_number: number;
        workout_date: number;
        day_name: string;
        logged_exercise_id: number;
        muscle_group: string | null;
      }>(
        `SELECT Weight_Log.exercise_name, Weight_Log.weight_logged, Weight_Log.reps_logged, 
        Weight_Log.set_number, Workout_Log.workout_date, Workout_Log.day_name, 
        Weight_Log.logged_exercise_id, Weight_Log.muscle_group
        FROM Weight_Log
        INNER JOIN Workout_Log ON Weight_Log.workout_log_id = Workout_Log.workout_log_id
        WHERE Workout_Log.day_name = ? AND Workout_Log.workout_date = ? AND Workout_Log.workout_name = ?
        ORDER BY Weight_Log.exercise_name, Weight_Log.set_number;`,
        [dayName, workoutDate, workoutName]
      );
      
      console.log(`Found ${result.length} weight logs`);
      
      if (result.length === 0) {
        // If no weight logs are found, check if there are logged exercises without weights
        const exercisesResult = await db.getAllAsync<{
          exercise_name: string;
          logged_exercise_id: number;
          sets: number;
          reps: number;
          muscle_group: string | null;
        }>(
          `SELECT exercise_name, logged_exercise_id, sets, reps, muscle_group
           FROM Logged_Exercises
           WHERE workout_log_id = ?
           ORDER BY logged_exercise_id ASC;`,
          [workout_log_id]
        );
        
        console.log(`Found ${exercisesResult.length} logged exercises without weights`);
        
        if (exercisesResult.length > 0) {
          // Create placeholder logs for these exercises
          const placeholderLogs: { [key: string]: { loggedExerciseId: number; exerciseName: string; sets: any[]; muscle_group: string | null; } } = {};
          
          exercisesResult.forEach(exercise => {
            const compositeKey = `${exercise.logged_exercise_id}_${exercise.exercise_name}`;
            placeholderLogs[compositeKey] = {
              loggedExerciseId: exercise.logged_exercise_id,
              exerciseName: exercise.exercise_name,
              muscle_group: exercise.muscle_group,
              sets: [{ 
                set_number: 1, 
                weight_logged: 0, 
                reps_logged: exercise.reps,
                note: 'No weight data recorded' 
              }]
            };
          });
          
          setLogs((prev) => ({
            ...prev,
            [`${dayName}_${workoutDate}`]: placeholderLogs,
          }));
          return;
        }
      }

      if (result.length > 0) {
        // Group sets by exercise_name
        const groupedLogs = result.reduce((acc, log) => {
          const { logged_exercise_id, exercise_name, muscle_group, ...setDetails } = log;
          const compositeKey = `${logged_exercise_id}_${exercise_name}`;
          
          if (!acc[compositeKey]) {
            acc[compositeKey] = {
              loggedExerciseId: logged_exercise_id,
              exerciseName: exercise_name,
              sets: [],
              muscle_group: muscle_group,
            };
          }
          acc[compositeKey].sets.push(setDetails);
          return acc;
        }, {} as { [key: string]: { loggedExerciseId: number; exerciseName: string; sets: any[], muscle_group: string | null; } });

        setLogs((prev) => ({
          ...prev,
          [`${dayName}_${workoutDate}`]: groupedLogs,
        }));
      }
    } catch (error) {
      console.error('Error fetching weights:', error);
    }
  };

  const toggleDayExpansion = (dayName: string, workoutDate: number) => {
    const key = `${dayName}_${workoutDate}`;
    setExpandedDays((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));

    // Fetch logs if the day is being expanded and hasn't been fetched yet
    if (!logs[key]) {
      fetchWeights(dayName, workoutDate);
    }
  };

  const filterDaysByDateRange = (start: Date, end: Date) => {
    const startTimestamp = start.getTime();
    const endTimestamp = end.getTime();

    const filtered = days.filter(
      (day) =>
        day.workout_date * 1000 >= startTimestamp &&
        day.workout_date * 1000 <= endTimestamp
    );

    setFilteredDays(filtered);
  };

  const clearDateSelection = () => {
    setDateRange({ start: null, end: null });
    setFilteredDays(days); // Reset the filter
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp * 1000); // Convert timestamp to Date object
    const today = new Date();
    const yesterday = new Date();
    const tomorrow = new Date();
  
    yesterday.setDate(today.getDate() - 1); // Yesterday's date
    tomorrow.setDate(today.getDate() + 1); // Tomorrow's date
  
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

  const formatTime = (timestamp: number | null): string => {
    if (timestamp === null) {
      return '';
    }
    
    // Format seconds into HH:MM:SS format
    const hrs = Math.floor(timestamp / 3600);
    const mins = Math.floor((timestamp % 3600) / 60);
    const secs = timestamp % 60;
    
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const renderDay = ({
    day_name,
    workout_date,
    completion_time
  }: {
    day_name: string;
    workout_date: number;
    completion_time: number | null;
  }) => {
    const key = `${day_name}_${workout_date}`;
    const isExpanded = expandedDays[key] as boolean;
    const formattedDate = formatDate(workout_date);
    const formattedTime = formatTime(completion_time);
  
    const confirmDeleteDay = () => {
      Alert.alert(
        t('deleteDayTitle'),
        t('deleteWeightLog'),
        [
          { text: t('alertCancel'), style: 'cancel' },
          {
            text: t('alertDelete'),
            style: 'destructive',
            onPress: async () => {
              await deleteDayLogs(day_name, workout_date);
            },
          },
        ]
      );
    };
  
    const deleteDayLogs = async (dayName: string, workoutDate: number) => {
      try {
        await db.runAsync(
          `DELETE FROM Weight_Log
           WHERE workout_log_id IN (
             SELECT workout_log_id 
             FROM Workout_Log 
             WHERE day_name = ? AND workout_date = ?
           );`,
          [dayName, workoutDate]
        );
  
        // Refresh days after deletion
        fetchDays();
      } catch (error) {
        console.error('Error deleting logs for day:', error);
      }
    };
  
    return (
      <View key={key} style={[styles.logContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <TouchableOpacity
          style={styles.logHeader}
          onPress={() => toggleDayExpansion(day_name, workout_date)}
          onLongPress={confirmDeleteDay}
        >
          <View style={styles.titleContainer}>
            <View style={styles.dayNameColumn}>
              <AutoSizeText 
                fontSize={20}
                numberOfLines={2}
                mode={ResizeTextMode.max_lines}
                style={[styles.logDayName, { color: theme.text }]}>
                {day_name}
              </AutoSizeText>
              
              {completion_time && (
                <View style={styles.timeContainer}>
                  <Ionicons name="time-outline" size={14} color={theme.text} style={styles.timeIcon} />
                  <AutoSizeText
                    fontSize={14}
                    numberOfLines={1}
                    mode={ResizeTextMode.max_lines}
                    style={[styles.completionTime, { color: theme.text, fontSize: 14, opacity: 0.8 }]}>
                    {formattedTime}
                  </AutoSizeText>
                </View>
              )}
            </View>
          </View>

          <AutoSizeText 
            fontSize={18}
            numberOfLines={2}
            mode={ResizeTextMode.max_lines}
            style={[styles.logDate, { color: theme.text }]}>
            {formattedDate}
          </AutoSizeText>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={theme.text}
          />
        </TouchableOpacity>
        {isExpanded && logs[key] && (
          <View style={styles.logList}>
            {Object.values(logs[key])
              .sort((a, b) => a.loggedExerciseId - b.loggedExerciseId)
              .map(({ exerciseName, sets, loggedExerciseId, muscle_group }) => {
                const muscleGroupInfo = muscleGroupData.find(mg => mg.value === muscle_group);
                return (
                  <View>
                    <TouchableOpacity style={{borderWidth: 1, borderColor: 'black', borderRadius: 8}} onPress={() => setShowLogEditModal(true)}>
                      <View key={`${loggedExerciseId}_${exerciseName}`} style={styles.logItem}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 5}}>
                        <Text style={[styles.exerciseName, { color: theme.text }]}>
                          {exerciseName}
                        </Text>
                        {muscleGroupInfo && muscleGroupInfo.value && (
                          <View style={[styles.muscleGroupBadge, { backgroundColor: theme.card, borderColor: theme.border, marginLeft: 8 }]}>
                            <Text style={[styles.muscleGroupBadgeText, { color: theme.text }]}>
                              {muscleGroupInfo.label}
                            </Text>
                          </View>
                        )}
                        </View>
                        {sets.map((set, index) => (
                          <Text
                            key={index}
                            style={[styles.logDetail, { color: theme.text }]}
                          >
                            {t('Set')} {set.set_number}: {set.weight_logged} {weightFormat} × {set.reps_logged} {t('Reps')}
                          </Text>
                        ))}
                      </View>
                    </TouchableOpacity>

                      <Modal visible={showLogEditModal} animationType="fade" transparent onRequestClose={() => setShowLogEditModal(false)}>
                        {showLogEditModal && (
                          <StatusBar
                            backgroundColor={theme.type === 'light' ? "rgba(0, 0, 0, 0.5)" : "black"}
                            barStyle={theme.type === 'light' ? 'light-content' : 'dark-content'}
                          />
                        )}
                      <Text>
                        Moin
                      </Text>
                    </Modal>
                  </View>
              )})}
          </View>
        )}
      </View>
    );
  };
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
    {/* Back Button */}
    <TouchableOpacity
      style={styles.backButton}
      onPress={() => navigation.goBack()}
    >
      <Ionicons name="arrow-back" size={24} color={theme.text} />
    </TouchableOpacity>
  
    <Text 
    style={[styles.headerTitle, { color: theme.text }]}>{workoutName} {t('weightLog')}
    </Text>

     
  
    {/* Filter Buttons */}
    <View style={styles.filterContainer}>
      <TouchableOpacity
        style={[styles.filterButton, { backgroundColor: theme.buttonBackground }]}
        onPress={() => setDatePickerVisible({ start: true, end: false })}
      >
        <Ionicons name="calendar-outline" size={20} color={theme.buttonText} />
        <Text style={[styles.filterButtonText, { color: theme.buttonText }]}>
          {dateRange.start
            ? `${t('dateFrom')} ${formatDate(dateRange.start.getTime() / 1000)}`
            : t('pickStartDate')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.filterButton, { backgroundColor: theme.buttonBackground }]}
        onPress={() => setDatePickerVisible({ start: false, end: true })}
      >
        <Ionicons name="calendar-outline" size={20} color={theme.buttonText} />
        <Text style={[styles.filterButtonText, { color: theme.buttonText }]}>
          {dateRange.end
            ? `${t('dateTo')} ${formatDate(dateRange.end.getTime() / 1000)}`
            : t('pickEndDate')}
        </Text>
      </TouchableOpacity>
    </View>
  
    {dateRange.start && dateRange.end && (
      <TouchableOpacity
        style={[styles.clearButton, { backgroundColor: theme.text }]}
        onPress={clearDateSelection}
      >
        <Text style={[styles.clearButtonText, { color: theme.card }]}>{t('clearSelection')}</Text>
      </TouchableOpacity>
    )}
  
    {/* Date Pickers */}
    {datePickerVisible.start && (
      <DateTimePicker
        value={dateRange.start || new Date()}
        mode="date"
        display="default"
        onChange={(event, date) => {
          setDatePickerVisible({ start: false, end: false });
          if (date) setDateRange((prev) => ({ ...prev, start: date }));
        }}
      />
      )}
      {datePickerVisible.end && (
      <DateTimePicker
        value={dateRange.end || new Date()}
        mode="date"
        display="default"
        onChange={(event, date) => {
          setDatePickerVisible({ start: false, end: false });
          if (date) setDateRange((prev) => ({ ...prev, end: date }));
        }}
        />
      )}
  
      {/* Logs */}
       <FlatList
         data={filteredDays}
         keyExtractor={(item) => `${item.day_name}_${item.workout_date}`}
         renderItem={({ item }) => renderDay(item)}
         ListEmptyComponent={
           <Text style={[styles.emptyText, { color: theme.text }]}>
             {t('noLog')}
           </Text>
         }
       />

    </View>
  );
}


// WeightLogDetail.tsx

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  adContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    marginVertical: 20, // Adds spacing above and below the title
  },
  
  filterContainer: {
    flexDirection: 'column', // Stack buttons vertically
    alignItems: 'center',
    marginBottom: 10,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 10,
    alignSelf: 'center',
  },
  filterButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  clearButton: {
    marginBottom: 20,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: 0,
  },
  clearButtonText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  backButton: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 10,
    padding: 8,
  },
  logContainer: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  logDayName: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 4,
  },
  logDate: {
    fontSize: 18,
    fontWeight: 'bold',
    maxWidth: 120,
    textAlign: 'right',
    marginHorizontal: 10,
  },
  logList: {
    marginTop: 10,
    paddingLeft: 10,
  },
  logItem: {
    marginBottom: 10,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  logDetail: {
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
  },
  titleContainer: {
    flex: 1,
    paddingRight: 10,
  },
  dayNameColumn: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  timeIcon: {
    marginRight: 3,
  },
  completionTime: {
    fontSize: 14,
    opacity: 0.8,
  },
  muscleGroupBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 15,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginLeft: 8,
  },
  muscleGroupBadgeText: {
      fontSize: 12,
      fontWeight: '600',
  },
});
