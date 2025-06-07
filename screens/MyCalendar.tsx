import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  ViewStyle,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { StackNavigationProp } from '@react-navigation/stack';
import { WorkoutLogStackParamList } from '../App';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '../utils/useNotifications';
import { useRecurringWorkouts } from '../utils/recurringWorkoutUtils';

type MyCalendarNavigationProp = StackNavigationProp<
  WorkoutLogStackParamList,
  'MyCalendar'
>;

// Define the structure for a workout entry in our map
interface WorkoutEntry {
  workout: {
    workout_name: string;
    workout_date: number;
    day_name: string;
    workout_log_id: number;
    notification_id?: string | null;
  };
  isLogged: boolean;
}

interface ExerciseDetails {
  exercise_name: string;
  sets?: number;
  reps?: number;
  logs: {
    set_number: number;
    weight_logged: number;
    reps_logged: number;
  }[];
}

export default function MyCalendar() {
  const db = useSQLiteContext();
  const navigation = useNavigation<MyCalendarNavigationProp>();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { dateFormat, weightFormat } = useSettings();
  const { cancelNotification } = useNotifications();
  const { checkRecurringWorkouts } = useRecurringWorkouts();

  // State for the calendar
  const [currentDate, setCurrentDate] = useState(new Date());
  const [workouts, setWorkouts] = useState<Map<string, WorkoutEntry[]>>(
    new Map()
  );

  // State for the modal
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDateWorkouts, setSelectedDateWorkouts] = useState<WorkoutEntry[]>([]);
  const [detailedWorkout, setDetailedWorkout] = useState<WorkoutEntry | null>(null);
  const [exercises, setExercises] = useState<ExerciseDetails[]>([]);
  const [completionTime, setCompletionTime] = useState<number | null>(null);
  const [untrackedChoiceModalVisible, setUntrackedChoiceModalVisible] =
    useState(false);
  const [
    selectedUntrackedWorkout,
    setSelectedUntrackedWorkout,
  ] = useState<WorkoutEntry | null>(null);
  const [
    untrackedWorkoutDetails,
    setUntrackedWorkoutDetails,
  ] = useState<ExerciseDetails[]>([]);
  
  // Run this check only ONCE when the component mounts
  useEffect(() => {
    console.log('MyCalendar: Component mounted, checking recurring workouts.');
    addColumn0();
    addColumn1();
    addColumn2();
    checkRecurringWorkouts();
  }, []); // Empty dependency array ensures this runs only once

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

  const addColumn2 = async () => {
    try {
      // Check if column exists first
      const tableInfo = await db.getAllAsync(
        "PRAGMA table_info(Workout_Log);"
      );
      const columnExists = tableInfo.some(
        (column: any) => column.name === 'notification_id'
      );
      
      if (!columnExists) {
        await db.runAsync('ALTER TABLE Workout_Log ADD COLUMN notification_id TEXT;');
        console.log('Column added successfully');
      } else {
        console.log('Column already exists, skipping');
      }
    } catch (error) {
      console.error('Error managing column:', error);
    }
  };

  const fetchWorkoutsForGrid = useCallback(
    async (date: Date) => {
      try {
        // Calculate the start and end of the visible grid
        const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        const dayOfWeek = firstDayOfMonth.getDay(); // 0=Sun, 1=Mon...
        // To make Monday the first day of the week
        const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

        const gridStartDate = new Date(firstDayOfMonth);
        gridStartDate.setDate(gridStartDate.getDate() - daysToSubtract);

        const gridEndDate = new Date(gridStartDate);
        gridEndDate.setDate(gridEndDate.getDate() + 41); // 6 weeks * 7 days - 1

        const startTimestamp = Math.floor(gridStartDate.getTime() / 1000);
        const endTimestamp = Math.floor(gridEndDate.getTime() / 1000) + 86399;

        const allWorkoutsInRange = await db.getAllAsync<
          WorkoutEntry['workout']
        >(`SELECT * FROM Workout_Log WHERE workout_date BETWEEN ? AND ?;`, [
          startTimestamp,
          endTimestamp,
        ]);

        const loggedWorkoutIdsResult = await db.getAllAsync<{
          workout_log_id: number;
        }>(
          `SELECT DISTINCT workout_log_id FROM Weight_Log 
           WHERE workout_log_id IN (SELECT workout_log_id FROM Workout_Log WHERE workout_date BETWEEN ? AND ?);`,
          [startTimestamp, endTimestamp]
        );
        const loggedWorkoutIds = new Set(
          loggedWorkoutIdsResult.map((item) => item.workout_log_id)
        );

        const workoutsMap = new Map<string, WorkoutEntry[]>();
        allWorkoutsInRange.forEach((workout) => {
          const workoutDate = new Date(workout.workout_date * 1000);
          const dateKey = `${workoutDate.getFullYear()}-${String(
            workoutDate.getMonth() + 1
          ).padStart(2, '0')}-${String(workoutDate.getDate()).padStart(
            2,
            '0'
          )}`;
          
          const entry: WorkoutEntry = {
            workout,
            isLogged: loggedWorkoutIds.has(workout.workout_log_id),
          };

          const existingEntries = workoutsMap.get(dateKey);
          if (existingEntries) {
            existingEntries.push(entry);
          } else {
            workoutsMap.set(dateKey, [entry]);
          }
        });

        setWorkouts(workoutsMap);
      } catch (error) {
        console.error('Error fetching workouts for grid:', error);
      }
    },
    [db]
  );

  // Refresh the calendar data every time the screen is focused
  useFocusEffect(
    useCallback(() => {
      console.log('MyCalendar: Screen focused, fetching workouts for grid.');
      fetchWorkoutsForGrid(currentDate);
    }, [currentDate, fetchWorkoutsForGrid])
  );

  const fetchWorkoutDetails = async (
    workout_log_id: number,
    isLogged: boolean
  ) => {
    try {
      setExercises([]);
      setCompletionTime(null);

      if (isLogged) {
        const workoutLogData = await db.getFirstAsync<{
          completion_time: number | null;
        }>(`SELECT completion_time FROM Workout_Log WHERE workout_log_id = ?;`, [
          workout_log_id,
        ]);

        if (workoutLogData?.completion_time) {
          setCompletionTime(workoutLogData.completion_time);
        }

        const loggedData = await db.getAllAsync<{
          exercise_name: string;
          set_number: number;
          weight_logged: number;
          reps_logged: number;
        }>(
          `
          SELECT le.exercise_name, wl.set_number, wl.weight_logged, wl.reps_logged
          FROM Weight_Log wl
          JOIN Logged_Exercises le ON wl.logged_exercise_id = le.logged_exercise_id
          WHERE wl.workout_log_id = ?
          ORDER BY le.exercise_name, wl.set_number;
        `,
          [workout_log_id]
        );

        if (loggedData.length > 0) {
          const grouped = loggedData.reduce(
            (acc, item) => {
              if (!acc[item.exercise_name]) {
                acc[item.exercise_name] = {
                  exercise_name: item.exercise_name,
                  logs: [],
                };
              }

              const exerciseGroup = acc[item.exercise_name];
              if (!exerciseGroup || !exerciseGroup.logs) {
                // This path should be logically impossible.
                throw new Error(
                  `Failed to find or create group for exercise: ${item.exercise_name}`
                );
              }

              exerciseGroup.logs.push({
                set_number: item.set_number,
                weight_logged: item.weight_logged,
                reps_logged: item.reps_logged,
              });
              return acc;
            },
            {} as Record<string, ExerciseDetails>
          );

          setExercises(Object.values(grouped));
        } else {
          // Fallback to planned if no logs
          const planned = await db.getAllAsync<
            { exercise_name: string; sets: number; reps: number }
          >(
            `SELECT exercise_name, sets, reps FROM Logged_Exercises WHERE workout_log_id = ?;`,
            [workout_log_id]
          );
          setExercises(
            planned.map((p) => ({ ...p, logs: [] }))
          );
        }
      } else {
        // For upcoming workouts
        const planned = await db.getAllAsync<
          { exercise_name: string; sets: number; reps: number }
        >(
          `SELECT exercise_name, sets, reps FROM Logged_Exercises WHERE workout_log_id = ?;`,
          [workout_log_id]
        );
        setExercises(
          planned.map((p) => ({ ...p, logs: [] }))
        );
      }
    } catch (error) {
      console.error('Error fetching workout details:', error);
    }
  };

  const fetchUntrackedWorkoutDetails = async (workout_log_id: number) => {
    try {
      const planned = await db.getAllAsync<
        { exercise_name: string; sets: number; reps: number }
      >(
        `SELECT exercise_name, sets, reps FROM Logged_Exercises WHERE workout_log_id = ?;`,
        [workout_log_id]
      );
      setUntrackedWorkoutDetails(planned.map((p) => ({ ...p, logs: [] })));
    } catch (error) {
      console.error('Error fetching untracked workout details:', error);
    }
  };

  const closeUntrackedModal = () => {
    setUntrackedChoiceModalVisible(false);
    setUntrackedWorkoutDetails([]);
  };

  const handleUntrackedWorkoutPress = (entry: WorkoutEntry) => {
    setSelectedUntrackedWorkout(entry);
    fetchUntrackedWorkoutDetails(entry.workout.workout_log_id);
    setUntrackedChoiceModalVisible(true);
  };

  const handleDayPress = (workoutEntries: WorkoutEntry[]) => {
    setSelectedDateWorkouts(workoutEntries);
    setDetailedWorkout(null); // Reset detailed view
    setExercises([]); // Reset exercises
    setModalVisible(true);
  };

  const handleEmptyDayPress = (date: Date) => {
    navigation.navigate('LogWorkout', {
      selectedDate: date.toISOString(),
    });
  };

  const handleLongPress = (workoutEntry: WorkoutEntry) => {
    Alert.alert(
      t('deleteDayTitle'),
      t('deleteDayMessage'),
      [
        { text: t('alertCancel'), style: 'cancel' },
        {
          text: t('alertDelete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const { workout_log_id, notification_id } = workoutEntry.workout;
              if (notification_id) {
                await cancelNotification(notification_id);
              }
              await db.runAsync(
                `DELETE FROM Workout_Log WHERE workout_log_id = ?;`,
                [workout_log_id]
              );
              await db.runAsync(
                `DELETE FROM Weight_Log WHERE workout_log_id = ?;`,
                [workout_log_id]
              );
              await db.runAsync(
                `DELETE FROM Logged_Exercises WHERE workout_log_id = ?;`,
                [workout_log_id]
              );
              fetchWorkoutsForGrid(currentDate); // Refresh the calendar

              // Refresh the modal content
              const updatedWorkouts = selectedDateWorkouts.filter(
                (w) => w.workout.workout_log_id !== workout_log_id
              );

              // If no workouts are left for this date, close the modal
              if (updatedWorkouts.length === 0) {
                setModalVisible(false);
              } else {
                setSelectedDateWorkouts(updatedWorkouts);
              }
            } catch (error) {
              console.error('Error deleting workout log:', error);
              Alert.alert(t('errorTitle'), t('failedToDeleteWorkoutLog'));
            }
          },
        },
      ]
    );
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const isSameDay = (d1: Date, d2: Date) =>
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();

    if (isSameDay(date, today)) return t('Today');
    if (isSameDay(date, yesterday)) return t('Yesterday');
    if (isSameDay(date, tomorrow)) return t('Tomorrow');

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return dateFormat === 'mm-dd-yyyy'
      ? `${month}-${day}-${year}`
      : `${day}-${month}-${year}`;
  };

  const formatCompletionTime = (totalSeconds: number): string => {
    if (!totalSeconds || totalSeconds < 0) {
      return '';
    }
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    const paddedMinutes = String(minutes).padStart(2, '0');
    const paddedSeconds = String(seconds).padStart(2, '0');

    if (hours > 0) {
      return `${String(hours).padStart(
        2,
        '0'
      )}:${paddedMinutes}:${paddedSeconds}`;
    }
    return `${paddedMinutes}:${paddedSeconds}`;
  };

  const handlePrevMonth = () => {
    setCurrentDate(
      (prevDate) => new Date(prevDate.getFullYear(), prevDate.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentDate(
      (prevDate) => new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 1)
    );
  };

  const getMonthName = (date: Date) => {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December'
    ];
    return t(months[date.getMonth()]);
  };

  const renderCalendarDays = () => {
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    const today = new Date();

    const firstDayOfMonth = new Date(year, month, 1);
    const dayOfWeek = firstDayOfMonth.getDay(); // 0=Sun, 1=Mon...
    // To make Monday the first day of the week
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const gridStartDate = new Date(firstDayOfMonth);
    gridStartDate.setDate(gridStartDate.getDate() - daysToSubtract);

    const days = [];
    for (let i = 0; i < 42; i++) {
      const cellDate = new Date(gridStartDate);
      cellDate.setDate(gridStartDate.getDate() + i);

      const day = cellDate.getDate();
      const cellMonth = cellDate.getMonth();
      const cellYear = cellDate.getFullYear();

      const dateKey = `${cellYear}-${String(cellMonth + 1).padStart(
        2,
        '0'
      )}-${String(day).padStart(2, '0')}`;
      const workoutEntries = workouts.get(dateKey);

      const isCurrentMonth = cellMonth === month;
      const isToday =
        today.getFullYear() === cellYear &&
        today.getMonth() === cellMonth &&
        today.getDate() === day;
      const isPast = cellDate.setHours(0, 0, 0, 0) < today.setHours(0, 0, 0, 0);
      const isFuture = cellDate.setHours(0, 0, 0, 0) > today.setHours(0, 0, 0, 0);

      const cellStyle: ViewStyle[] = [styles.dayCell];
      const textStyle: any[] = [
        styles.dayText,
        isCurrentMonth
          ? { color: theme.text }
          : { color: theme.text, opacity: 0.3 },
      ];

      let isAnyLogged = false;
      if (workoutEntries && workoutEntries.length > 0) {
        isAnyLogged = workoutEntries.some((entry) => entry.isLogged);
        if (isAnyLogged) {
          cellStyle.push({ backgroundColor: theme.buttonBackground });
          textStyle.splice(1, 1, { color: theme.buttonText });
        } else if (isPast || isToday) {
          cellStyle.push(styles.untrackedDay, { borderColor: theme.text });
        } else if (isFuture) {
          cellStyle.push(styles.upcomingDay);
        }
      }

      days.push(
        <TouchableOpacity
          key={dateKey}
          style={cellStyle}
          onPress={() => {
            if (workoutEntries && workoutEntries.length > 0) {
              handleDayPress(workoutEntries);
            } else {
              handleEmptyDayPress(cellDate);
            }
          }}
        >
          <Text style={textStyle}>{day}</Text>
          {isToday && (
            <View
              style={[
                styles.todayIndicator,
                {
                  backgroundColor: isAnyLogged
                    ? theme.buttonText
                    : theme.text,
                },
              ]}
            />
          )}
          {workoutEntries && workoutEntries.length > 1 && (
             <View style={[
                styles.multipleWorkoutIndicator, 
                { backgroundColor: isAnyLogged ? theme.buttonText : theme.text }
            ]} />
          )}
        </TouchableOpacity>
      );
    }
    return days;
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={[styles.contentContainer, { paddingTop: 70 }]}
    >
      <View style={styles.titleContainer}>
        <Ionicons name="calendar" size={30} color={theme.text} style={styles.titleIcon} />
        <Text style={[styles.title, { color: theme.text }]}>
          {t('myCalendar')}
        </Text>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: theme.buttonBackground },
          ]}
          onPress={() => navigation.navigate('LogWorkout', { selectedDate: undefined })}
        >
          <Ionicons
            name="calendar"
            size={22}
            color={theme.buttonText}
            style={styles.icon}
          />
          <Text style={[styles.actionButtonText, { color: theme.buttonText }]}>
            {t('scheduleWorkout')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: theme.buttonBackground },
          ]}
          onPress={() => navigation.navigate('RecurringWorkoutOptions')}
        >
          <Ionicons
            name="time"
            size={22}
            color={theme.buttonText}
            style={styles.icon}
          />
          <Text style={[styles.actionButtonText, { color: theme.buttonText }]}>
            {t('recurringWorkouts')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Calendar */}
      <View
        style={[
          styles.calendarContainer,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={handlePrevMonth}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.calendarMonthText, { color: theme.text }]}>
            {`${getMonthName(currentDate)} ${currentDate.getFullYear()}`}
          </Text>
          <TouchableOpacity onPress={handleNextMonth}>
            <Ionicons name="chevron-forward" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.weekDaysContainer}>
          {[
            t('Mon'),
            t('Tue'),
            t('Wed'),
            t('Thu'),
            t('Fri'),
            t('Sat'),
            t('Sun')
          ].map((day, index) => (
            <Text
              key={index}
              style={[styles.weekDayText, { color: theme.text }]}
            >
              {day}
            </Text>
          ))}
        </View>
        <View style={styles.daysGrid}>{renderCalendarDays()}</View>
      </View>

      {/* Legend Section */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={styles.legendIcon}>
            <Text style={[styles.legendIconText, { color: theme.text }]}>
              1
            </Text>
            <View
              style={[
                styles.todayIndicator,
                { backgroundColor: theme.text, bottom: -6 },
              ]}
            />
          </View>
          <Text style={[styles.legendText, { color: theme.text }]}>
            {t('Today')}
          </Text>
        </View>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendIcon,
                { backgroundColor: theme.buttonBackground },
              ]}
            >
              <Text
                style={[styles.legendIconText, { color: theme.buttonText }]}
              >
                2
              </Text>
            </View>
            <Text style={[styles.legendText, { color: theme.text }]}>
              {t('Logged')}
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendIcon,
                styles.untrackedDay,
                { borderColor: theme.text },
              ]}
            >
              <Text style={[styles.legendIconText, { color: theme.text }]}>
                3
              </Text>
            </View>
            <Text style={[styles.legendText, { color: theme.text }]}>
              {t('Untracked')}
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendIcon, styles.upcomingDay]}>
              <Text style={[styles.legendIconText, { color: theme.text }]}>
                4
              </Text>
            </View>
            <Text style={[styles.legendText, { color: theme.text }]}>
              {t('Upcoming')}
            </Text>
          </View>
        </View>
      </View>

      <Text style={[styles.tipText, { color: theme.text }]}>
        {t('scheduleTip')}
      </Text>

      {/* Modal for Workout Details */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setModalVisible(false);
          setDetailedWorkout(null);
        }}
      >
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: 'rgba(0, 0, 0, 0.5)' },
          ]}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <TouchableOpacity
              style={[
                styles.modalCloseButton,
                detailedWorkout ? { left: 10 } : { right: 10 },
              ]}
              onPress={() => {
                if (detailedWorkout) {
                  setDetailedWorkout(null);
                  setExercises([]);
                  setCompletionTime(null);
                } else {
                  setModalVisible(false);
                }
              }}
            >
              <Ionicons
                name={detailedWorkout ? 'arrow-back' : 'close'}
                size={24}
                color={theme.text}
              />
            </TouchableOpacity>

            {detailedWorkout ? (
              <>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  {detailedWorkout.workout.workout_name}
                </Text>
                <Text style={[styles.modalSubtitle, { color: theme.text }]}>
                  {detailedWorkout.workout.day_name} |{' '}
                  {formatDate(detailedWorkout.workout.workout_date)}
                </Text>
                {completionTime && (
                  <View style={styles.completionTimeContainer}>
                    <Ionicons name="time-outline" size={16} color={theme.text} />
                    <Text
                      style={[styles.completionTimeText, { color: theme.text }]}
                    >
                      {' '}
                      {formatCompletionTime(completionTime)}
                    </Text>
                  </View>
                )}
                <ScrollView style={{ width: '100%', maxHeight: 400 }}>
                  {exercises.length > 0 ? (
                    exercises.map((exercise, index) => (
                      <View key={index} style={styles.modalExercise}>
                        <Text
                          style={[
                            styles.modalExerciseName,
                            { color: theme.text },
                          ]}
                        >
                          {exercise.exercise_name}
                        </Text>
                        {exercise.logs.length > 0 ? (
                          exercise.logs.map((log, logIndex) => (
                            <Text
                              key={logIndex}
                              style={[
                                styles.modalExerciseDetails,
                                { color: theme.text },
                              ]}
                            >
                              {t('Set')} {log.set_number}: {log.weight_logged}{' '}
                              {weightFormat} x {log.reps_logged} {t('Reps')}
                            </Text>
                          ))
                        ) : (
                          <Text
                            style={[
                              styles.modalExerciseDetails,
                              { color: theme.text },
                            ]}
                          >
                            {exercise.sets} {t('Sets')} x {exercise.reps}{' '}
                            {t('Reps')}
                          </Text>
                        )}
                      </View>
                    ))
                  ) : (
                    <Text style={[styles.emptyText, { color: theme.text }]}>
                      {t('noExerciseLogged')}
                    </Text>
                  )}
                </ScrollView>
              </>
            ) : (
               <>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  {selectedDateWorkouts.length > 0
                    ? formatDate(selectedDateWorkouts[0].workout.workout_date)
                    : ''}
                </Text>
                {(() => {
                  const isUpcoming =
                    selectedDateWorkouts.length > 0 &&
                    new Date(
                      selectedDateWorkouts[0].workout.workout_date * 1000
                    ).setHours(0, 0, 0, 0) > new Date().setHours(0, 0, 0, 0);

                  return (
                    <>
                      <View style={styles.modalLegendContainer}>
                        {!isUpcoming && (
                          <View style={styles.modalLegendItem}>
                            <Ionicons
                              name="checkmark-circle"
                              size={20}
                              color={theme.buttonBackground}
                            />
                            <Text
                              style={[
                                styles.modalLegendText,
                                { color: theme.text },
                              ]}
                            >
                              {t('Logged')}
                            </Text>
                          </View>
                        )}
                        <View style={styles.modalLegendItem}>
                          <Ionicons
                            name="ellipse-outline"
                            size={20}
                            color={isUpcoming ? 'grey' : theme.text}
                          />
                          <Text
                            style={[
                              styles.modalLegendText,
                              { color: theme.text },
                            ]}
                          >
                            {isUpcoming ? t('Upcoming') : t('Untracked')}
                          </Text>
                        </View>
                      </View>
                      <ScrollView style={{ width: '100%' }}>
                        {selectedDateWorkouts.map((entry, index) => (
                          <TouchableOpacity
                            key={index}
                            style={[
                              styles.modalWorkoutItem,
                              {
                                backgroundColor: theme.background,
                                borderColor: theme.border,
                              },
                            ]}
                            onPress={() => {
                              if (entry.isLogged || isUpcoming) {
                                setDetailedWorkout(entry);
                                fetchWorkoutDetails(
                                  entry.workout.workout_log_id,
                                  entry.isLogged
                                );
                              } else {
                                setModalVisible(false);
                                handleUntrackedWorkoutPress(entry);
                              }
                            }}
                            onLongPress={() => handleLongPress(entry)}
                          >
                            <View style={{ flex: 1 }}>
                              <Text
                                style={[
                                  styles.modalWorkoutName,
                                  { color: theme.text },
                                ]}
                              >
                                {entry.workout.workout_name}
                              </Text>
                              <Text
                                style={[
                                  styles.modalWorkoutDay,
                                  { color: theme.text },
                                ]}
                              >
                                {entry.workout.day_name}
                              </Text>
                            </View>
                            <View>
                              {entry.isLogged ? (
                                <Ionicons
                                  name="checkmark-circle"
                                  size={24}
                                  color={theme.buttonBackground}
                                />
                              ) : (
                                <Ionicons
                                  name="ellipse-outline"
                                  size={24}
                                  color={isUpcoming ? 'grey' : theme.text}
                                />
                              )}
                            </View>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </>
                  );
                })()}
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal for Untracked Workout Choice */}
      <Modal
        visible={untrackedChoiceModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeUntrackedModal}
      >
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: 'rgba(0, 0, 0, 0.5)' },
          ]}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <TouchableOpacity
              style={[styles.modalCloseButton, { right: 10 }]}
              onPress={closeUntrackedModal}
            >
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {selectedUntrackedWorkout?.workout.workout_name}
            </Text>
            {selectedUntrackedWorkout && (
              <Text style={[styles.modalSubtitle, { color: theme.text }]}>
                {selectedUntrackedWorkout.workout.day_name} |{' '}
                {formatDate(selectedUntrackedWorkout.workout.workout_date)}
              </Text>
            )}
            <ScrollView
              style={{ width: '100%', maxHeight: 200, marginVertical: 20 }}
            >
              {untrackedWorkoutDetails.map((exercise, index) => (
                <View key={index} style={styles.modalExercise}>
                  <Text
                    style={[
                      styles.modalExerciseName,
                      { color: theme.text, fontSize: 18 },
                    ]}
                  >
                    {exercise.exercise_name}
                  </Text>
                  <Text
                    style={[
                      styles.modalExerciseDetails,
                      { color: theme.text, fontSize: 14 },
                    ]}
                  >
                    {exercise.sets} {t('Sets')} x {exercise.reps} {t('Reps')}
                  </Text>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[
                styles.choiceButton,
                { backgroundColor: theme.buttonBackground },
              ]}
              onPress={() => {
                if (!selectedUntrackedWorkout) return;
                navigation.navigate('StartedWorkoutInterface', {
                  workout_log_id:
                    selectedUntrackedWorkout.workout.workout_log_id,
                });
                closeUntrackedModal();
              }}
            >
              <Ionicons
                name="stopwatch-outline"
                size={22}
                color={theme.buttonText}
                style={styles.icon}
              />
              <Text
                style={[styles.actionButtonText, { color: theme.buttonText }]}
              >
                {t('startWorkout')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.choiceButton,
                { backgroundColor: theme.buttonBackground, marginTop: 15 },
              ]}
              onPress={() => {
                if (!selectedUntrackedWorkout) return;
                navigation.navigate('LogWeights', {
                  workout_log_id:
                    selectedUntrackedWorkout.workout.workout_log_id,
                });
                closeUntrackedModal();
              }}
            >
              <Ionicons
                name="stats-chart"
                size={22}
                color={theme.buttonText}
                style={styles.icon}
              />
              <Text
                style={[styles.actionButtonText, { color: theme.buttonText }]}
              >
                {t('logWeightsManually')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  titleIcon: {
    marginRight: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 400,
    marginBottom: 30,
  },
  actionButton: {
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48%',
  },
  actionButtonText: {
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
  icon: {
    marginRight: 8,
  },
  tipText: {
    marginTop: 10,
    textAlign: 'center',
    fontSize: 14,
    fontStyle: 'italic',
    opacity: 0.8,
  },
  emptyText: { fontSize: 16, textAlign: 'center', opacity: 0.7 },
  // Calendar Styles
  calendarContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 15,
    marginTop: 5,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  calendarMonthText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  weekDaysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  weekDayText: {
    fontSize: 14,
    fontWeight: '600',
    width: 32,
    textAlign: 'center',
    opacity: 0.6,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  dayCell: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
    borderRadius: 20,
  },
  dayText: {
    fontSize: 16,
    fontWeight: '500',
  },
  otherMonthDayText: {
    opacity: 0.3,
  },
  todayIndicator: {
    width: 16,
    height: 3,
    borderRadius: 2,
    position: 'absolute',
    bottom: 4,
  },
  untrackedDay: {
    borderWidth: 2,
  },
  upcomingDay: {
    backgroundColor: 'rgba(128, 128, 128, 0.2)',
  },
  // Legend Styles
  legendContainer: {
    width: '100%',
    maxWidth: 400,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 10,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 5,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
    marginVertical: 5,
  },
  legendIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10, 
  },
  legendIconText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  legendText: {
    fontSize: 14,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalCloseButton: { position: 'absolute', top: 10 },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalExercise: { marginBottom: 15, width: '100%' },
  modalExerciseName: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  modalExerciseDetails: { fontSize: 16, textAlign: 'center', opacity: 0.8 },
  multipleWorkoutIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    position: 'absolute',
    top: 5,
    right: 5,
  },
  modalWorkoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
    borderWidth: 1,
  },
  modalWorkoutName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalWorkoutDay: {
    fontSize: 14,
    opacity: 0.8,
  },
  modalLegendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    marginTop: 5,
  },
  modalLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 15,
  },
  modalLegendText: {
    marginLeft: 5,
    fontSize: 14,
  },
  completionTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  completionTimeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  choiceButton: {
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '80%',
  },
});