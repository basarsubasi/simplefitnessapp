import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TouchableWithoutFeedback,
  Keyboard,
  StatusBar,
  TextInput,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { AutoSizeText, ResizeTextMode } from 'react-native-auto-size-text';
import { ExerciseLog } from '../abstractions/IExerciseLog';
import deepCopy from '../utils/deepCopy';


export default function AllLogs() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const db = useSQLiteContext();
  const { weightFormat, dateFormat } = useSettings();
  const [days, setDays] = useState<
    { workout_name: string; day_name: string; workout_date: number; completion_time: number | null }[]
  >([]);
  const [filteredDays, setFilteredDays] = useState<
    { workout_name: string; day_name: string; workout_date: number; completion_time: number | null }[]
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
  const [editExerciseMetadata, setEditExerciseMetadata] = useState<EditExerciseMetadata>({
    exerciseName: '',
    workout_date: -1,
    logged_exercise_id: -1
  });
  const [editExerciseData, setEditExerciseData] = useState<ExerciseLog[]>([]);
  const updateExerciseWeightLog = (item: ExerciseLog,
                                  val: string, 
                                  updatedKeyName: 'weight_logged' | 'reps_logged',
                                  index: number) => {
    item[updatedKeyName] = val;  

    setEditExerciseData(prev => prev.map((value, i) => i === index ? item : value))
  }

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
    { label:t('Glutes'), value: 'glutes' },
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
        workout_name: string;
        day_name: string;
        workout_date: number;
        completion_time: number | null;
      }>(
        `SELECT DISTINCT Workout_Log.workout_name, Workout_Log.day_name, 
         Workout_Log.workout_date, 
         COALESCE(Workout_Log.completion_time, MIN(Weight_Log.completion_time)) as completion_time
         FROM Workout_Log
         INNER JOIN Weight_Log 
         ON Weight_Log.workout_log_id = Workout_Log.workout_log_id
         GROUP BY Workout_Log.workout_name, Workout_Log.day_name, Workout_Log.workout_date
         ORDER BY Workout_Log.workout_date DESC;`
      );

      setDays(result);
      setFilteredDays(result); // Initially show all days
    } catch (error) {
      console.error('Error fetching days:', error);
    }
  };

  const fetchLogsForDay = async (dayName: string, workoutDate: number) => {
    try {
      console.log(`Fetching logs for day: ${dayName}, date: ${workoutDate}`);
      
      // First, try to get the workout_log_id
      const workoutLogResult = await db.getAllAsync<{ workout_log_id: number }>(
        `SELECT workout_log_id FROM Workout_Log 
         WHERE day_name = ? AND workout_date = ?
         LIMIT 1;`,
        [dayName, workoutDate]
      );
      
      if (workoutLogResult.length === 0) {
        console.error('No workout_log_id found for the given day and date');
        return;
      }
      
      const workout_log_id = workoutLogResult[0].workout_log_id;
      console.log(`Found workout_log_id: ${workout_log_id}`);
      
      // Now fetch the weight logs
      const result = await db.getAllAsync<{
        workout_name: string;
        exercise_name: string;
        set_number: number;
        weight_logged: number;
        reps_logged: number;
        logged_exercise_id: number;
        muscle_group: string | null;
        weight_log_id: number;
        workout_date: number;
        day_name: string;
      }>(
        `SELECT Workout_Log.workout_name, Weight_Log.exercise_name, 
                Weight_Log.set_number, Weight_Log.weight_logged, 
                Weight_Log.reps_logged, Weight_Log.logged_exercise_id,
                Weight_Log.muscle_group, Weight_log.weight_log_id,
                Workout_Log.workout_date, Workout_Log.day_name
         FROM Weight_Log
         INNER JOIN Workout_Log 
         ON Weight_Log.workout_log_id = Workout_Log.workout_log_id
         WHERE Workout_Log.day_name = ? AND Workout_Log.workout_date = ? 
         ORDER BY Weight_Log.logged_exercise_id ASC, Weight_Log.set_number ASC;`,
        [dayName, workoutDate]
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
                workout_name: 'Workout', 
                weight_log_id: -1,
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

      const groupedLogs = result.reduce((acc, log) => {
        const { logged_exercise_id, exercise_name, muscle_group, ...setDetails } = log;
        const compositeKey = `${logged_exercise_id}_${exercise_name}`;
        
        if (!acc[compositeKey]) {
          acc[compositeKey] = {
            loggedExerciseId: logged_exercise_id,
            exerciseName: exercise_name,
            sets: [],
            muscle_group: muscle_group
          };
        }
        acc[compositeKey].sets.push(setDetails);
        return acc;
      }, {} as { [key: string]: { loggedExerciseId: number; exerciseName: string; sets: any[], muscle_group: string | null } });

      setLogs((prev) => ({
        ...prev,
        [`${dayName}_${workoutDate}`]: groupedLogs,
      }));
    } catch (error) {
      console.error('Error fetching logs for day:', error);
    }
  };

  const toggleDayExpansion = (dayName: string, workoutDate: number) => {
    const key = `${dayName}_${workoutDate}`;
    setExpandedDays((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));

    if (!logs[key]) {
      fetchLogsForDay(dayName, workoutDate);
    }
  };

  const openLogEditModal = (exerciseName: string, sets: ExerciseLog[], logged_exercise_id: number) => {
    setEditExerciseData(deepCopy(sets));
    setEditExerciseMetadata({
      exerciseName: exerciseName,
      workout_date: sets[0].workout_date,
      logged_exercise_id: logged_exercise_id
    });
    setShowLogEditModal(true);
  }

  const closeLogEditModal = () => {
    setShowLogEditModal(false)
    setEditExerciseData([]);
    setEditExerciseMetadata({
      exerciseName: '',
      workout_date: -1,
      logged_exercise_id: -1
    });
  }

  const saveEditedWorkoutLog = async () => {
    // Run through state with edited workout and update the weight logs
    for (const item of editExerciseData) {
      // Add validation
      const loggedReps = parseInt(item.reps_logged);
      if (Number.isNaN(loggedReps) || loggedReps === 0) {
        Alert.alert(t('savingError'), t('repsValidationError'));
        return;
      }

      const loggedWeight = parseInt(item.weight_logged);
      if (Number.isNaN(loggedWeight) || loggedWeight === 0) {
        Alert.alert(t('savingError'), t('weightsValidationError'));
        return;
      }

      if (item.weight_log_id === -1) {
        continue;
      }

      await db.runAsync(
        'UPDATE Weight_Log SET weight_logged = ?, reps_logged = ? WHERE weight_log_id = ?',
        [loggedWeight, loggedReps, item.weight_log_id]
      );
    }

    // Update UI Logs
    const firstItem = editExerciseData[0];
    const key = `${firstItem.day_name}_${firstItem.workout_date}`;
    const compositeKey = `${editExerciseMetadata.logged_exercise_id}_${editExerciseMetadata.exerciseName}`;

    setLogs((prev) => {
      prev[key][compositeKey].sets = editExerciseData;
      return prev;
    })

    setEditExerciseData([]);
    setEditExerciseMetadata({
      exerciseName: '',
      workout_date: -1,
      logged_exercise_id: -1
    });
    setShowLogEditModal(false);
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
    workout_name,
    completion_time
  }: {
    workout_name: string;
    day_name: string;
    workout_date: number;
    completion_time: number | null;
  }) => {
    const key = `${day_name}_${workout_date}`;
    const isExpanded = expandedDays[key];
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
      <View
        key={key}
        style={[
          styles.logContainer,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <TouchableOpacity
          style={styles.logHeader}
          onPress={() => toggleDayExpansion(day_name, workout_date)}
          onLongPress={confirmDeleteDay}
        >
          <View style={styles.workoutTitleContainer}>
            <View style={styles.workoutNameColumn}>
              <AutoSizeText 
                fontSize={20}
                numberOfLines={2}
                mode={ResizeTextMode.max_lines}
                style={[styles.logWorkoutName, { color: theme.text }]}>
                  {workout_name}
              </AutoSizeText>
              
              {completion_time && (
                <View style={styles.timeContainer}>
                  <Ionicons name="time-outline" size={14} color={theme.text} style={styles.timeIcon} />
                  <AutoSizeText
                    fontSize={14}
                    numberOfLines={1}
                    mode={ResizeTextMode.max_lines}
                    style={[styles.completionTime, { color: theme.text, fontSize: 14 }]}>
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
              <Text style={[styles.logDayName, { color: theme.text }]}>
                {day_name}
                </Text>
                {Object.values(logs[key])
                  .sort((a, b) => a.loggedExerciseId - b.loggedExerciseId)
                  .map(({ exerciseName, sets, loggedExerciseId, muscle_group }) => {
                    const muscleGroupInfo = muscleGroupData.find(mg => mg.value === muscle_group);
                    return(
                      <View>
                        <TouchableOpacity onPress={() => openLogEditModal(exerciseName, sets, loggedExerciseId)}>
                          <View key={`${loggedExerciseId}_${exerciseName}`} style={styles.logItem}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 5 }}>
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



      <Text style={[styles.headerTitle, { color: theme.text }]}>
        {t('allTracks')}
      </Text>
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
          <Text style={[styles.clearButtonText, { color: theme.card }]}>
            {t('Clear Selection')}
          </Text>
        </TouchableOpacity>
      )}
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

      <Text style={[styles.tipText, { color: theme.text }]}>{t('editExerciseTipText')}</Text>

      <FlatList
        data={filteredDays}
        keyExtractor={(item) => `${item.workout_name}_${item.day_name}_${item.workout_date}`}
        renderItem={({ item }) => renderDay(item)}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: theme.text }]}>
            {t('noLog')}
          </Text>
        }
      />

      <Modal visible={showLogEditModal} animationType="fade" onRequestClose={closeLogEditModal} transparent>
        {showLogEditModal && (
          <StatusBar
            backgroundColor={theme.type === 'light' ? "rgba(0, 0, 0, 0.5)" : "black"}
            barStyle={theme.type === 'light' ? 'light-content' : 'dark-content'}
          />
        )}
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={[styles.modalContainer, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
              <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                <Text style={[styles.modalTitle, { color: theme.text, margin: 10, marginTop: 20 }]}>
                  {t('editExerciseLog')}: {editExerciseMetadata.exerciseName} ({new Date(editExerciseMetadata.workout_date * 1000).toLocaleDateString()})
                </Text>
                <ScrollView style={{width: '100%'}} contentContainerStyle={{padding: 20}} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={true}>
                  <FlatList data={editExerciseData} keyExtractor={(item, index) => item.weight_log_id !== -1 ? item.weight_log_id.toString() : (index * 100).toString()} renderItem={({item, index}) => {
                    return (
                      <View>
                        <Text style={[{fontSize: 18, fontWeight: 600, color: theme.text}]}>{t('set')} {index+1}</Text>
                        <Text style={[styles.inputLabel, { color: theme.text, marginTop: 15 }]}>{t('weightKgLbs')}</Text>
                        <TextInput
                          style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
                          placeholder={t('Weight') + ' (> 0)'}
                          placeholderTextColor={theme.text}
                          keyboardType="numeric"
                          value={item['weight_logged'].toString()}
                          onChangeText={(val) => updateExerciseWeightLog(item, val, 'weight_logged', index)}
                        />
                        <Text style={[styles.inputLabel, {color: theme.text, marginTop: 15}]}>{t('repsPlaceholder')}</Text>
                        <TextInput
                          style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
                          placeholder={t('repsPlaceholder') + ' (> 0)'}
                          placeholderTextColor={theme.text}
                          keyboardType="numeric"
                          value={item['reps_logged'].toString()}
                          onChangeText={(val) => updateExerciseWeightLog(item, val, 'reps_logged', index)}
                        />
                      </View>
                    )
                  }}>
                  </FlatList>
                </ScrollView>
                  <View style={[{padding: 20, display: 'flex', flexDirection: 'column', rowGap: 3}]}>
                    <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.buttonBackground }]} onPress={saveEditedWorkoutLog}>
                      <Text style={[styles.saveButtonText, { color: theme.buttonText }]}>{t('Save')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.cancelButton, { backgroundColor: theme.card }]} onPress={closeLogEditModal}>
                      <Text style={[styles.cancelButtonText, { color: theme.text }]}>{t('Cancel')}</Text>
                    </TouchableOpacity>
                  </View>
              </View>
              </View>
          </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 40 },
  headerTitle: { fontSize: 30, fontWeight: '900', textAlign: 'center' },
  filterContainer: {
    flexDirection: 'column', // Stack buttons vertically
    alignItems: 'center',
    paddingTop: 25,
    paddingBottom: 10,
  },
  tipText: {
    margin: 12, // Space above the text
    textAlign: 'left', // Center align
    fontSize: 14, // Smaller font size
    fontStyle: 'italic', // Italic for emphasis
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
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom:20,
  },
  clearButtonText: { fontSize: 16, fontWeight: 'bold' },
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
  backButton: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 10,
    padding: 8,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  logWorkoutName: { 
    fontSize: 20, 
    fontWeight: '900',
    marginBottom: 4,
  },
  logDayName: { 
    fontSize: 20, 
    fontWeight: '900', 
    marginBottom: 10
  },
  logDate: { 
    fontSize: 18,
    fontWeight: 'bold',
    maxWidth: 120,
    textAlign: 'right',
    marginHorizontal: 10,
  },
  logList: { marginTop: 10 },
  logItem: { marginBottom: 10 },
  exerciseName: { fontSize: 16, fontWeight: 'bold' },
  logDetail: { fontSize: 14 },
  adContainer: { alignItems: 'center', marginTop: 20 },
  emptyText: { textAlign: 'center', fontSize: 16 },
  workoutTitleContainer: {
    flex: 1,
    paddingRight: 10,
  },
  workoutNameColumn: {
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
  saveButton: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 10,
    marginTop: 10,
    alignItems: 'center',
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
    alignItems: 'center',
  },
  cancelButtonText: {
    fontWeight: 'bold',
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
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    height: '80%',
    borderRadius: 15,
    width: '80%',
  },
});

