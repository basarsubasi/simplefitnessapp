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
  Platform,
} from 'react-native';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { StackNavigationProp } from '@react-navigation/stack';
// Import the scaling utilities
import {
  scale,
  verticalScale,
  moderateScale,
} from 'react-native-size-matters';
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

type MyCalendarRouteProp = RouteProp<WorkoutLogStackParamList, 'MyCalendar'>;

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
  const route = useRoute<MyCalendarRouteProp>();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { dateFormat, weightFormat, firstWeekday } = useSettings();
  const { cancelNotification } = useNotifications();
  const { checkRecurringWorkouts } = useRecurringWorkouts();

  // State for the calendar
  const [currentDate, setCurrentDate] = useState(new Date());
  const [workouts, setWorkouts] = useState<Map<string, WorkoutEntry[]>>(
    new Map(),
  );

  // State for the modal
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDateWorkouts, setSelectedDateWorkouts] = useState<
    WorkoutEntry[]
  >([]);
  const [detailedWorkout, setDetailedWorkout] = useState<WorkoutEntry | null>(
    null,
  );
  const [exercises, setExercises] = useState<ExerciseDetails[]>([]);
  const [completionTime, setCompletionTime] = useState<number | null>(null);
  const [untrackedChoiceModalVisible, setUntrackedChoiceModalVisible] =
    useState(false);
  const [selectedUntrackedWorkout, setSelectedUntrackedWorkout] =
    useState<WorkoutEntry | null>(null);
  const [untrackedWorkoutDetails, setUntrackedWorkoutDetails] = useState<
    ExerciseDetails[]
  >([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Run this check only ONCE when the component mounts
  useEffect(() => {
    console.log('MyCalendar: Component mounted, checking recurring workouts.');
    addColumn0();
    addColumn1();
    addColumn2();
    // checkRecurringWorkouts();
    setUntrackedWorkoutDetails([]);
  }, []); // Empty dependency array ensures this runs only once

  const addColumn1 = async () => {
    try {
      // Check if column exists first
      const tableInfo = await db.getAllAsync(
        'PRAGMA table_info(Workout_Log);',
      );
      const columnExists = tableInfo.some(
        (column: any) => column.name === 'completion_time',
      );

      if (!columnExists) {
        await db.runAsync(
          'ALTER TABLE Workout_Log ADD COLUMN completion_time INTEGER;',
        );
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
      const tableInfo = await db.getAllAsync('PRAGMA table_info(Weight_Log);');
      const columnExists = tableInfo.some(
        (column: any) => column.name === 'completion_time',
      );

      if (!columnExists) {
        await db.runAsync(
          'ALTER TABLE Weight_Log ADD COLUMN completion_time INTEGER;',
        );
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
        'PRAGMA table_info(Workout_Log);',
      );
      const columnExists = tableInfo.some(
        (column: any) => column.name === 'notification_id',
      );

      if (!columnExists) {
        await db.runAsync(
          'ALTER TABLE Workout_Log ADD COLUMN notification_id TEXT;',
        );
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

        const daysToSubtract =
          firstWeekday === 'Monday'
            ? dayOfWeek === 0
              ? 6
              : dayOfWeek - 1
            : dayOfWeek;

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
          [startTimestamp, endTimestamp],
        );
        const loggedWorkoutIds = new Set(
          loggedWorkoutIdsResult.map((item) => item.workout_log_id),
        );

        const workoutsMap = new Map<string, WorkoutEntry[]>();
        allWorkoutsInRange.forEach((workout) => {
          const workoutDate = new Date(workout.workout_date * 1000);
          const dateKey = `${workoutDate.getFullYear()}-${String(
            workoutDate.getMonth() + 1,
          ).padStart(2, '0')}-${String(workoutDate.getDate()).padStart(
            2,
            '0',
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
    [db, firstWeekday],
  );

  // Refresh the calendar data every time the screen is focused
  useFocusEffect(
    useCallback(() => {
      console.log('MyCalendar: Screen focused, fetching workouts for grid.');
      fetchWorkoutsForGrid(currentDate);
    }, [currentDate, fetchWorkoutsForGrid]),
  );

  const fetchWorkoutDetails = async (
    workout_log_id: number,
    isLogged: boolean,
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
          [workout_log_id],
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
                throw new Error(
                  `Failed to find or create group for exercise: ${item.exercise_name}`,
                );
              }

              exerciseGroup.logs.push({
                set_number: item.set_number,
                weight_logged: item.weight_logged,
                reps_logged: item.reps_logged,
              });
              return acc;
            },
            {} as Record<string, ExerciseDetails>,
          );

          setExercises(Object.values(grouped));
        } else {
          const planned = await db.getAllAsync<
            { exercise_name: string; sets: number; reps: number }
          >(
            `SELECT exercise_name, sets, reps FROM Logged_Exercises WHERE workout_log_id = ?;`,
            [workout_log_id],
          );
          setExercises(planned.map((p) => ({ ...p, logs: [] })));
        }
      } else {
        const planned = await db.getAllAsync<
          { exercise_name: string; sets: number; reps: number }
        >(
          `SELECT exercise_name, sets, reps FROM Logged_Exercises WHERE workout_log_id = ?;`,
          [workout_log_id],
        );
        setExercises(planned.map((p) => ({ ...p, logs: [] })));
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
        [workout_log_id],
      );
      setUntrackedWorkoutDetails(planned.map((p) => ({ ...p, logs: [] })));
    } catch (error) {
      console.error('Error fetching untracked workout details:', error);
    }
  };

  useEffect(() => {
    const handleRefresh = async () => {
      console.log('DEBUG: Refresh signal received, starting async process.');
      await checkRecurringWorkouts();
      console.log('Recurring workouts check complete.');
      await fetchWorkoutsForGrid(currentDate);
      console.log('Calendar grid data re-fetched.');
      navigation.setParams({ refresh: false });
    };

    if (route.params?.refresh) {
      handleRefresh();
    }
  }, [
    route.params?.refresh,
    navigation,
    fetchWorkoutsForGrid,
    currentDate,
    checkRecurringWorkouts,
  ]);

  const closeUntrackedModal = () => {
    setUntrackedChoiceModalVisible(false);
    setUntrackedWorkoutDetails([]);
  };

  const handleUntrackedWorkoutPress = (entry: WorkoutEntry) => {
    setSelectedUntrackedWorkout(entry);
    fetchUntrackedWorkoutDetails(entry.workout.workout_log_id);
    setUntrackedChoiceModalVisible(true);
  };

  const handleDatePress = (date: Date, workoutEntries?: WorkoutEntry[]) => {
    setSelectedDate(date);
    setSelectedDateWorkouts(workoutEntries || []);
    setDetailedWorkout(null);
    setExercises([]);
    setModalVisible(true);
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
                [workout_log_id],
              );
              await db.runAsync(
                `DELETE FROM Weight_Log WHERE workout_log_id = ?;`,
                [workout_log_id],
              );
              await db.runAsync(
                `DELETE FROM Logged_Exercises WHERE workout_log_id = ?;`,
                [workout_log_id],
              );
              fetchWorkoutsForGrid(currentDate);

              const updatedWorkouts = selectedDateWorkouts.filter(
                (w) => w.workout.workout_log_id !== workout_log_id,
              );

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
      ],
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
        '0',
      )}:${paddedMinutes}:${paddedSeconds}`;
    }
    return `${paddedMinutes}:${paddedSeconds}`;
  };

  const handlePrevMonth = () => {
    setCurrentDate(
      (prevDate) => new Date(prevDate.getFullYear(), prevDate.getMonth() - 1, 1),
    );
  };

  const handleNextMonth = () => {
    setCurrentDate(
      (prevDate) => new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 1),
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
      'December',
    ];
    return t(months[date.getMonth()]);
  };

  const weekDays =
    firstWeekday === 'Monday'
      ? [
          t('Mon'),
          t('Tue'),
          t('Wed'),
          t('Thu'),
          t('Fri'),
          t('Sat'),
          t('Sun'),
        ]
      : [
          t('Sun'),
          t('Mon'),
          t('Tue'),
          t('Wed'),
          t('Thu'),
          t('Fri'),
          t('Sat'),
        ];

  const renderCalendarGrid = () => {
    const gridItems = [];

    weekDays.forEach((day, index) => {
      gridItems.push(
        <View key={`weekday-${index}`} style={styles.gridCell}>
          <Text style={[styles.weekDayText, { color: theme.text }]}>{day}</Text>
        </View>,
      );
    });

    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    const today = new Date();

    const firstDayOfMonth = new Date(year, month, 1);
    const dayOfWeek = firstDayOfMonth.getDay();

    const daysToSubtract =
      firstWeekday === 'Monday'
        ? dayOfWeek === 0
          ? 6
          : dayOfWeek - 1
        : dayOfWeek;

    const gridStartDate = new Date(firstDayOfMonth);
    gridStartDate.setDate(gridStartDate.getDate() - daysToSubtract);

    for (let i = 0; i < 42; i++) {
      const cellDate = new Date(gridStartDate);
      cellDate.setDate(gridStartDate.getDate() + i);

      const day = cellDate.getDate();
      const cellMonth = cellDate.getMonth();
      const cellYear = cellDate.getFullYear();

      const dateKey = `${cellYear}-${String(cellMonth + 1).padStart(
        2,
        '0',
      )}-${String(day).padStart(2, '0')}`;
      const workoutEntries = workouts.get(dateKey);

      const isCurrentMonth = cellMonth === month;
      const isToday =
        today.getFullYear() === cellYear &&
        today.getMonth() === cellMonth &&
        today.getDate() === day;
      const isPast = cellDate.setHours(0, 0, 0, 0) < today.setHours(0, 0, 0, 0);
      const isFuture =
        cellDate.setHours(0, 0, 0, 0) > today.setHours(0, 0, 0, 0);

      const dayCellStyles: ViewStyle[] = [styles.dayCellContainer];
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
          dayCellStyles.push({ backgroundColor: theme.buttonBackground });
          textStyle.splice(1, 1, { color: theme.buttonText });
        } else if (isPast || isToday) {
          dayCellStyles.push(styles.untrackedDay, { borderColor: theme.text });
        } else if (isFuture) {
          dayCellStyles.push(styles.upcomingDay);
        }
      }

      gridItems.push(
        <TouchableOpacity
          key={dateKey}
          style={styles.gridCell}
          onPress={() => {
            handleDatePress(cellDate, workoutEntries);
          }}
        >
          <View style={dayCellStyles}>
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
              <View
                style={[
                  styles.multipleWorkoutIndicator,
                  {
                    backgroundColor: isAnyLogged
                      ? theme.buttonText
                      : theme.text,
                  },
                ]}
              />
            )}
          </View>
        </TouchableOpacity>,
      );
    }
    return gridItems;
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={[styles.contentContainer, { paddingTop: 70 }]}
    >
      <View style={styles.titleContainer}>
        <Ionicons
          name='calendar'
          size={scale(30)}
          color={theme.text}
          style={styles.titleIcon}
        />
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
          onPress={() => navigation.navigate('RecurringWorkoutOptions')}
        >
          <Ionicons
            name='infinite'
            size={scale(22)}
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
            <Ionicons name='chevron-back' size={scale(24)} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.calendarMonthText, { color: theme.text }]}>
            {`${getMonthName(currentDate)} ${currentDate.getFullYear()}`}
          </Text>
          <TouchableOpacity onPress={handleNextMonth}>
            <Ionicons
              name='chevron-forward'
              size={scale(24)}
              color={theme.text}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.daysGrid}>{renderCalendarGrid()}</View>
      </View>

      {/* Legend Section */}
      <View style={styles.legendContainer}>
        {/* First Column of Legend */}
        <View style={styles.legendColumn}>
          {/* Today Item */}
          <View style={styles.legendItem}>
            <View style={styles.todayLegendIcon}>
              <Text style={[styles.legendIconText, { color: theme.text }]}>
                1
              </Text>
              <View
                style={[
                  styles.todayIndicator,
                  { backgroundColor: theme.text, bottom: -4 },
                ]}
              />
            </View>
            <Text style={[styles.legendText, { color: theme.text }]}>
              {t('Today')}
            </Text>
          </View>
          {/* Untracked Item */}
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendIcon,
                styles.untrackedLegendIcon,
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
        </View>

        {/* Second Column of Legend */}
        <View style={styles.legendColumn}>
          {/* Logged Item */}
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
          {/* Upcoming Item */}
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
        animationType='fade'
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
            <View style={styles.modalHeader}>
              {detailedWorkout ? (
                <TouchableOpacity
                  style={styles.modalLeftButton}
                  onPress={() => {
                    setDetailedWorkout(null);
                    setExercises([]);
                    setCompletionTime(null);
                  }}
                >
                  <Ionicons
                    name='arrow-back'
                    size={scale(24)}
                    color={theme.text}
                  />
                </TouchableOpacity>
              ) : (
                <View style={styles.modalLeftButton} />
              )}

              <TouchableOpacity
                style={styles.modalRightButton}
                onPress={() => {
                  setModalVisible(false);
                  setDetailedWorkout(null);
                }}
              >
                <Ionicons name='close' size={scale(24)} color={theme.text} />
              </TouchableOpacity>
            </View>

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
                    <Ionicons
                      name='time-outline'
                      size={scale(16)}
                      color={theme.text}
                    />
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
                  {selectedDate
                    ? formatDate(selectedDate.getTime() / 1000)
                    : ''}
                </Text>
                {(() => {
                  if (selectedDateWorkouts.length === 0) {
                    return (
                      <Text
                        style={[
                          styles.emptyText,
                          { color: theme.text, padding: 20 },
                        ]}
                      >
                        {t('noWorkoutsScheduledForDate')}
                      </Text>
                    );
                  }

                  const isUpcoming =
                    new Date(
                      selectedDateWorkouts[0].workout.workout_date * 1000,
                    ).setHours(0, 0, 0, 0) > new Date().setHours(0, 0, 0, 0);

                  return (
                    <>
                      <View style={styles.modalLegendContainer}>
                        {!isUpcoming && (
                          <View style={styles.modalLegendItem}>
                            <Ionicons
                              name='checkmark-circle'
                              size={scale(20)}
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
                            name='ellipse-outline'
                            size={scale(20)}
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
                                  entry.isLogged,
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
                                  name='checkmark-circle'
                                  size={scale(24)}
                                  color={theme.buttonBackground}
                                />
                              ) : (
                                <Ionicons
                                  name='ellipse-outline'
                                  size={scale(24)}
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
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    {
                      backgroundColor: theme.buttonBackground,
                      marginTop: 20,
                      width: '100%',
                    },
                  ]}
                  onPress={() => {
                    if (!selectedDate) return;
                    navigation.navigate('LogWorkout', {
                      selectedDate: selectedDate.toISOString(),
                    });
                    setModalVisible(false);
                  }}
                >
                  <Ionicons
                    name='add'
                    size={scale(22)}
                    color={theme.buttonText}
                    style={styles.icon}
                  />
                  <Text
                    style={[
                      styles.actionButtonText,
                      { color: theme.buttonText },
                    ]}
                  >
                    {t('scheduleWorkout')}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal for Untracked Workout Choice */}
      <Modal
        visible={untrackedChoiceModalVisible}
        transparent={true}
        animationType='fade'
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
              <Ionicons name='close' size={scale(24)} color={theme.text} />
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
              style={{
                width: '100%',
                maxHeight: 200,
                marginVertical: verticalScale(20),
              }}
            >
              {untrackedWorkoutDetails.map((exercise, index) => (
                <View key={index} style={styles.modalExercise}>
                  <Text
                    style={[
                      styles.modalExerciseName,
                      { color: theme.text, fontSize: moderateScale(18) },
                    ]}
                  >
                    {exercise.exercise_name}
                  </Text>
                  <Text
                    style={[
                      styles.modalExerciseDetails,
                      { color: theme.text, fontSize: moderateScale(14) },
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
                name='stopwatch-outline'
                size={scale(22)}
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
                {
                  backgroundColor: theme.buttonBackground,
                  marginTop: verticalScale(15),
                },
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
                name='stats-chart'
                size={scale(22)}
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
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(40),
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(20),
  },
  titleIcon: {
    marginRight: scale(10),
  },
  title: {
    fontSize: moderateScale(32),
    fontWeight: '900',
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 400,
    marginBottom: verticalScale(30),
  },
  actionButton: {
    borderRadius: 20,
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(20),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48%',
  },
  actionButtonText: {
    fontWeight: 'bold',
    fontSize: moderateScale(14),
    textAlign: 'center',
  },
  icon: {
    marginRight: scale(8),
  },
  tipText: {
    marginTop: verticalScale(10),
    textAlign: 'center',
    fontSize: moderateScale(14),
    fontStyle: 'italic',
    opacity: 0.8,
  },
  emptyText: {
    fontSize: moderateScale(16),
    textAlign: 'center',
    opacity: 0.7,
  },
  // Calendar Styles
  calendarContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: moderateScale(15),
    marginTop: verticalScale(5),
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
    marginBottom: verticalScale(10),
  },
  calendarMonthText: {
    fontSize: moderateScale(20),
    fontWeight: 'bold',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridCell: {
    width: `${100 / 7}%`,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: verticalScale(2),
  },
  weekDayText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    opacity: 0.6,
    paddingVertical: verticalScale(1),
  },
  dayCellContainer: {
    width: '90%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 100,
  },
  dayText: {
    fontSize: moderateScale(16),
    fontWeight: '500',
  },
  todayIndicator: {
    width: scale(16),
    height: verticalScale(2),
    borderRadius: 2,
    position: 'absolute',
    bottom: verticalScale(3),
  },
  untrackedDay: {
    borderWidth: 2,
  },
  upcomingDay: {
    backgroundColor: 'rgba(128, 128, 128, 0.2)',
  },
  // Legend Styles
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 400,
    marginTop: verticalScale(20),
  },
  legendColumn: {
    marginHorizontal: scale(25),
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(20),
  },
  legendIcon: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    marginRight: scale(8),
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayLegendIcon: {
    width: scale(24),
    height: scale(24),
    marginRight: scale(8),
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  untrackedLegendIcon: {
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  legendIconText: {
    fontSize: moderateScale(12),
    fontWeight: 'bold',
    lineHeight: Platform.OS === 'ios' ? moderateScale(24) : moderateScale(22),
  },
  legendText: {
    fontSize: moderateScale(14),
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 20,
    padding: moderateScale(20),
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    position: 'absolute',
    top: verticalScale(15),
    paddingLeft: 0,
    paddingRight: 0,
    zIndex: 1,
  },
  modalLeftButton: {
    padding: moderateScale(5),
  },
  modalRightButton: {
    padding: moderateScale(5),
  },
  modalTitle: {
    fontSize: moderateScale(24),
    fontWeight: '900',
    marginBottom: verticalScale(10),
    textAlign: 'center',
    marginTop: verticalScale(20),
  },
  modalSubtitle: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    marginBottom: verticalScale(20),
    textAlign: 'center',
  },
  modalExercise: { marginBottom: verticalScale(15), width: '100%' },
  modalExerciseName: {
    fontSize: moderateScale(20),
    fontWeight: '800',
    textAlign: 'center',
  },
  modalExerciseDetails: {
    fontSize: moderateScale(16),
    textAlign: 'center',
    opacity: 0.8,
  },
  multipleWorkoutIndicator: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    position: 'absolute',
    top: verticalScale(5),
    right: scale(5),
  },
  modalWorkoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: moderateScale(15),
    borderRadius: 15,
    marginBottom: verticalScale(10),
    borderWidth: 0,
  },
  modalWorkoutName: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
  },
  modalWorkoutDay: {
    fontSize: moderateScale(14),
    opacity: 0.8,
  },
  modalLegendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(15),
    marginTop: verticalScale(5),
  },
  modalLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: scale(15),
  },
  modalLegendText: {
    marginLeft: scale(5),
    fontSize: moderateScale(14),
  },
  completionTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(15),
  },
  completionTimeText: {
    fontSize: moderateScale(16),
    fontWeight: '600',
  },
  choiceButton: {
    borderRadius: 20,
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(16),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '80%',
  },
  modalCloseButton: {
    position: 'absolute',
    top: verticalScale(10),
    marginRight: scale(10),
  },
});