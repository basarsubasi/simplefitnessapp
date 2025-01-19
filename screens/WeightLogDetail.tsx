import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../context/ThemeContext'; 
import BannerAdComponent from '../components/BannerAd';
import { useTranslation } from 'react-i18next';


export default function WeightLogDetail() {
  const route = useRoute();
  
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { t } = useTranslation(); // Initialize translations

  const db = useSQLiteContext();
  const { workoutName } = route.params as { workoutName: string };
  const { weightFormat, dateFormat } = useSettings();
  const [days, setDays] = useState<
    { day_name: string; workout_date: number }[]
  >([]);
  const [filteredDays, setFilteredDays] = useState<
    { day_name: string; workout_date: number }[]
  >([]);
  const [expandedDays, setExpandedDays] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [logs, setLogs] = useState<{ [key: string]: { [key: string]: any[] } }>(
    {}
  );

  const [datePickerVisible, setDatePickerVisible] = useState<{
    start: boolean;
    end: boolean;
  }>({ start: false, end: false });
  const [dateRange, setDateRange] = useState<{
    start: Date | null;
    end: Date | null;
  }>({ start: null, end: null });

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
      }>(
        `SELECT DISTINCT Workout_Log.day_name, Workout_Log.workout_date
         FROM Weight_Log
         INNER JOIN Workout_Log 
         ON Weight_Log.workout_log_id = Workout_Log.workout_log_id
         WHERE Workout_Log.workout_name = ?;`,
        [workoutName]
      );

      
      const sortedDays = result.sort((a, b) => b.workout_date - a.workout_date);

      setDays(sortedDays);
      setFilteredDays(sortedDays); // Initially show all days
    } catch (error) {
      console.error('Error fetching days:', error);
    }
  };

  const fetchLogsForDay = async (dayName: string, workoutDate: number) => {
    try {
      const result = await db.getAllAsync<{
        exercise_name: string;
        set_number: number;
        weight_logged: number;
        reps_logged: number;
      }>(
        `SELECT Weight_Log.exercise_name, Weight_Log.set_number, 
                Weight_Log.weight_logged, Weight_Log.reps_logged
         FROM Weight_Log
         INNER JOIN Workout_Log 
         ON Weight_Log.workout_log_id = Workout_Log.workout_log_id
         WHERE Workout_Log.day_name = ? AND Workout_Log.workout_date = ? 
         ORDER BY Weight_Log.exercise_name, Weight_Log.set_number;`,
        [dayName, workoutDate]
      );

      // Group sets by exercise_name
      const groupedLogs = result.reduce((acc, log) => {
        const { exercise_name, ...setDetails } = log;
        if (!acc[exercise_name]) {
          acc[exercise_name] = [];
        }
        acc[exercise_name].push(setDetails);
        return acc;
      }, {} as { [exercise_name: string]: any[] });

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

    // Fetch logs if the day is being expanded and hasn't been fetched yet
    if (!logs[key]) {
      fetchLogsForDay(dayName, workoutDate);
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

  const renderDay = ({
    day_name,
    workout_date,
  }: {
    day_name: string;
    workout_date: number;
  }) => {
    const key = `${day_name}_${workout_date}`;
    const isExpanded = expandedDays[key];
    const formattedDate = formatDate(workout_date);
  
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
    onLongPress={confirmDeleteDay} // Add this line for long press functionality
  >
    <Text style={[styles.logDayName, { color: theme.text }]}>{day_name}</Text>
    <Text style={[styles.logDate, { color: theme.text }]}>{formattedDate}</Text>
    <Ionicons
      name={isExpanded ? 'chevron-up' : 'chevron-down'}
      size={20}
      color={theme.text}
    />
  </TouchableOpacity>
  {isExpanded && logs[key] && (
    <View style={styles.logList}>
      {Object.entries(logs[key]).map(([exercise_name, sets]) => (
        <View key={exercise_name} style={styles.logItem}>
          <Text style={[styles.exerciseName, { color: theme.text }]}>{exercise_name}</Text>
          {sets.map((set, index) => (
            <Text key={index} style={[styles.logDetail, { color: theme.text }]}>
              {t('Set')} {set.set_number}: {set.weight_logged} {weightFormat}, {set.reps_logged} {t('Reps')}
            </Text>
          ))}
        </View>
      ))}
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
  
    <Text style={[styles.headerTitle, { color: theme.text }]}>{workoutName} {t('weightLog')}</Text>
  
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
                   {/* Banner Ad Section */}
                   <View style={styles.adContainer}>
        <BannerAdComponent />
      </View>
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
  },
  logDate: {
    fontSize: 18,
    fontWeight: 'bold',
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
});
