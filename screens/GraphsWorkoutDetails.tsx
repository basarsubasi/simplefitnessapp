import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { useSettings } from '../context/SettingsContext';
import StickyYAxis from '../components/StickyYAxis';
import { StackNavigationProp } from '@react-navigation/stack';
import { WeightLogStackParamList } from '../App';
import { AutoSizeText, ResizeTextMode } from 'react-native-auto-size-text';

type GraphsNavigationProp = StackNavigationProp<
  WeightLogStackParamList,
  'GraphsWorkoutDetails'
>;

// Define data types
type DayOption = { label: string; value: string };
type ExerciseOption = { label: string; value: string };
type LogData = {
  date: number;
  exercise_name: string;
  weight_logged: number;
  reps_logged: number;
  set_number: number;
  workout_log_id: number;
  logged_exercise_id: number;
  dayName?: string; // For time data
};
type TimeFrame = 'week' | 'month' | 'year' | 'all';
type CalculationType = 'CES' | '1RM' | 'Sets' | 'Reps' | 'Time' | 'MuscleDistribution' | 'OverallMuscleGroups' | 'MuscleGroupVolume';
type GraphMode = 'Exercise' | 'Time' | 'Overall';
type ProcessedDataPoint = {
  x: string; // Date string for display
  y: number; // Value (CES, 1RM, or time in seconds)
  timestamp: number; // Raw timestamp for sorting
  originalData: LogData[]; // Store original data for tooltip
  originalWeight?: number; // Original weight before offset adjustment
  originalReps?: number; // Original reps before offset adjustment
  workoutLogId?: number; // For time data
  dayName?: string; // For time data
};

// Add new data structure for sets
type SetProgressData = {
  setNumber: number;
  data: ProcessedDataPoint[];
  color: string;
  showInLegend?: boolean; // Whether to show this set in the legend
};

// Add this type definition near the top with other type definitions
type SetDataPoint = {
  setNumber: number;
  weight: number;
  color: string;
  reps: number;
};

// Add new type for time data
type TimeLogData = {
  workout_log_id: number;
  workout_date: number;
  day_name: string;
  completion_time: number;
};

// Add new type for workout session exercises
type WorkoutSessionExercise = {
  day_name: string;
  exercise_name: string;
  weight_logged: number;
  reps_logged: number;
  set_number: number;
};

// Add new type for Workout CES data
type WorkoutCESData = {
  workout_log_id: number;
  workout_date: number;
  day_name: string;
  total_ces: number;
};

// Add new type for Muscle Group Distribution data
type MuscleDistributionData = {
  workout_name: string;
  muscle_group: string;
  exercise_count: number;
};

type OverallMuscleGroupsData = {
  muscle_group: string;
  set_count: number;
};

type MuscleGroupVolumeData = {
  date: number;
  total_ces: number;
};

type MuscleGroupLogData = {
  exercise_name: string;
  weight_logged: number;
  reps_logged: number;
  set_number: number;
};

export default function GraphsWorkoutDetails() {
  const navigation = useNavigation<GraphsNavigationProp>();
  const db = useSQLiteContext();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { dateFormat, weightFormat } = useSettings();
  const screenWidth = Dimensions.get('window').width - 40; // Account for padding

  // Add colors for different sets
  const setColors = [
    'rgba(255, 99, 132, 1)',   // Red
    'rgba(54, 162, 235, 1)',   // Blue  
    'rgba(255, 205, 86, 1)',   // Yellow
    'rgba(75, 192, 192, 1)',   // Teal
    'rgba(153, 102, 255, 1)',  // Purple
    'rgba(255, 159, 64, 1)',   // Orange
    'rgba(199, 199, 199, 1)',  // Grey
    'rgba(83, 102, 146, 1)',   // Dark Blue
    'rgba(255, 99, 255, 1)',   // Pink
    'rgba(99, 255, 132, 1)',   // Green
  ];

  const timeChartDayColors = [
    'rgb(255, 114, 38)',
    'rgba(0, 168, 132, 1)',
    'rgba(107, 107, 255, 1)',
    'rgba(255, 165, 0, 1)',
    'rgba(128, 0, 128, 1)',
    'rgba(0, 128, 128, 1)',
    'rgba(255, 20, 147, 1)',
    'rgba(0, 191, 255, 1)',
    'rgba(218, 165, 32, 1)',
    'rgba(128, 128, 0, 1)',
  ];

  // State variables
  const [allWorkouts, setAllWorkouts] = useState<DayOption[]>([]);
  const [selectedWorkout, setSelectedWorkout] = useState<string>('');
  const [days, setDays] = useState<DayOption[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [exercises, setExercises] = useState<ExerciseOption[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('month');
  const [calculationType, setCalculationType] = useState<CalculationType>('Sets');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [logData, setLogData] = useState<LogData[]>([]);
  const [timeLogData, setTimeLogData] = useState<TimeLogData[]>([]);
  const [workoutCESData, setWorkoutCESData] = useState<WorkoutCESData[]>([]);
  const [muscleDistributionData, setMuscleDistributionData] = useState<MuscleDistributionData[]>([]);
  const [overallMuscleGroupsData, setOverallMuscleGroupsData] = useState<OverallMuscleGroupsData[]>([]);
  const [muscleGroupVolumeData, setMuscleGroupVolumeData] = useState<MuscleGroupVolumeData[]>([]);
  const [chartData, setChartData] = useState<ProcessedDataPoint[]>([]);
  const [setsData, setSetsData] = useState<SetProgressData[]>([]);
  const [distributionWorkout, setDistributionWorkout] = useState<string | null>(null);
  const [availableMuscleGroups, setAvailableMuscleGroups] = useState<{ label: string; value: string }[]>([]);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>('');

  // Dropdown visibility state
  const [workoutDropdownVisible, setWorkoutDropdownVisible] = useState<boolean>(false);
  const [dayDropdownVisible, setDayDropdownVisible] = useState<boolean>(false);
  const [exerciseDropdownVisible, setExerciseDropdownVisible] = useState<boolean>(false);
  const [muscleGroupDropdownVisible, setMuscleGroupDropdownVisible] = useState<boolean>(false);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [graphMode, setGraphMode] = useState<GraphMode>('Exercise');
  
  // Tooltip state
  const [tooltipVisible, setTooltipVisible] = useState<boolean>(false);
  const [selectedPoint, setSelectedPoint] = useState<ProcessedDataPoint | null>(null);
  const [workoutSessionExercises, setWorkoutSessionExercises] = useState<WorkoutSessionExercise[]>([]);
  const [muscleGroupDayDetails, setMuscleGroupDayDetails] = useState<MuscleGroupLogData[]>([]);

  // Smart data sampling functions
  const getOptimalDataPoints = (data: ProcessedDataPoint[], timeFrame: TimeFrame): ProcessedDataPoint[] => {
    if (data.length === 0) return data;

    const sortedData = data.sort((a, b) => a.timestamp - b.timestamp);
    
    switch (timeFrame) {
      case 'week':
        // Show all data for week (max 7 points)
        return sortedData;
        
      case 'month':
        return sortedData;
        
      case 'year':
        // Show ~100 data points for year 
        return sampleEvenly(sortedData, 100);
        
      case 'all':
        // Show ~200 data points for all time
        return sampleEvenly(sortedData, 100);
        
      default:
        return sortedData.slice(-10);
    }
  };

  const sampleEvenly = (data: ProcessedDataPoint[], maxPoints: number): ProcessedDataPoint[] => {
    if (data.length <= maxPoints) {
      return data;
    }

    const sampled: ProcessedDataPoint[] = [];
    const step = (data.length - 1) / (maxPoints - 1);
    
    for (let i = 0; i < maxPoints - 1; i++) {
      const index = Math.round(i * step);
      sampled.push(data[index]);
    }
    
    // Always include the last data point
    sampled.push(data[data.length - 1]);
    
    return sampled;
  };

  const getChartWidth = (dataPointsCount: number): number => {
    const pointWidth = 60; // Width per data point
    const minWidth = screenWidth;
    const calculatedWidth = dataPointsCount * pointWidth;
    return Math.max(minWidth, calculatedWidth);
  };

  // Add time formatting functions
  const formatTimeFromSeconds = (totalSecondsInput: number): string => {
    const roundedTotalSeconds = Math.round(totalSecondsInput);

    const hours = Math.floor(roundedTotalSeconds / 3600);
    const minutes = Math.floor((roundedTotalSeconds % 3600) / 60);
    const seconds = roundedTotalSeconds % 60;
    
    const formattedString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    return formattedString;
  };

  const formatTimeForChart = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}h`;
    } else {
      return `${minutes}m`;
    }
  };

  // Fetch all workouts that have logged data
  useFocusEffect(
    useCallback(() => {
      fetchWorkoutsWithLogs();
    }, [])
  );

  useEffect(() => {
    if (graphMode === 'Exercise') {
      setCalculationType('Sets');
    } else if (graphMode === 'Time') {
      setCalculationType('Time');
    } else if (graphMode === 'Overall') {
      setCalculationType('OverallMuscleGroups');
    }
  }, [graphMode]);

  // Fetch days for the selected workout
  useEffect(() => {
    if (!selectedWorkout) {
      setDays([]);
      setExercises([]);
      setLogData([]);
      return;
    }
    setLogData([]);
    fetchDays();
  }, [selectedWorkout]);

  // Fetch exercises when day changes
  useEffect(() => {
    if (selectedDay) {
      setLogData([]);
      fetchExercises();
    } else {
      setExercises([]);
      setSelectedExercise('');
    }
  }, [selectedDay]);

  // Fetch and process data when exercise, timeframe, or calculation type changes
  useEffect(() => {
    if (graphMode === 'Time') {
      if (calculationType === 'Time') {
        fetchTimeData();
      } else if (calculationType === 'CES') {
        fetchWorkoutCESData();
      } else if (calculationType === 'MuscleDistribution') {
        fetchMuscleGroupDistributionData();
      }
    } else if (selectedExercise) {
      fetchData();
    } else if (graphMode === 'Overall') {
      if (calculationType === 'OverallMuscleGroups') {
        fetchOverallMuscleGroupsData();
      }
      // Data for MuscleGroupVolume is fetched in other useEffects
      // to prevent re-fetching the button list on timeframe change.
    }
  }, [selectedExercise, timeFrame, calculationType, graphMode]);

  useEffect(() => {
    if (graphMode === 'Overall' && calculationType === 'MuscleGroupVolume') {
      fetchAvailableMuscleGroups();
    }
  }, [graphMode, calculationType]);

  useEffect(() => {
    if (graphMode === 'Overall' && calculationType === 'MuscleGroupVolume' && selectedMuscleGroup) {
      fetchMuscleGroupVolumeData();
    }
  }, [selectedMuscleGroup, timeFrame]);

  // Process log data into chart data
  useEffect(() => {
    if (graphMode === 'Time') {
      if (calculationType === 'Time') {
        if (timeLogData.length > 0) {
          processTimeDataForChart();
        } else {
          setChartData([]);
          setSetsData([]);
        }
      } else if (calculationType === 'CES') {
        if (workoutCESData.length > 0) {
          processWorkoutCESDataForChart();
        } else {
          setChartData([]);
          setSetsData([]);
        }
      } else if (calculationType === 'MuscleDistribution') {
        // For muscle distribution, we don't need to process it into `chartData`
        // as the bar chart will consume `muscleDistributionData` directly.
        // We just need to make sure we clear other chart data.
        if (muscleDistributionData.length === 0) {
          setChartData([]);
          setSetsData([]);
        }
      }
    } else if (graphMode === 'Overall' && calculationType === 'MuscleGroupVolume') {
      if (muscleGroupVolumeData.length > 0) {
        processMuscleGroupVolumeDataForChart();
      } else {
        setChartData([]);
      }
    } else { // Exercise mode
      if (logData.length > 0) {
        processDataForChart();
      } else {
        setChartData([]);
        setSetsData([]);
      }
    }
  }, [logData, timeLogData, workoutCESData, muscleDistributionData, muscleGroupVolumeData, calculationType, timeFrame, graphMode]);

  const fetchWorkoutsWithLogs = async () => {
    setIsInitialLoading(true);
    try {
      const result = await db.getAllAsync<{ workout_name: string }>(
        `SELECT DISTINCT Workout_Log.workout_name
         FROM Workout_Log
         INNER JOIN Weight_Log 
         ON Weight_Log.workout_log_id = Workout_Log.workout_log_id;`
      );

      const workoutOptions = result.map((workout) => ({
        label: workout.workout_name,
        value: workout.workout_name,
      }));

      setAllWorkouts(workoutOptions);
    } catch (error) {
      console.error('Error fetching workouts with logs:', error);
    } finally {
      setIsInitialLoading(false);
    }
  };

  const fetchDays = async () => {
    if (!selectedWorkout) return;
    try {
      const result = await db.getAllAsync<{ day_name: string }>(
        `SELECT DISTINCT day_name FROM Workout_Log 
         WHERE workout_name = ? 
         ORDER BY day_name ASC`,
        [selectedWorkout]
      );
      
      const dayOptions = result.map(day => ({
        label: day.day_name,
        value: day.day_name
      }));
      
      setDays(dayOptions);
      
    } catch (error) {
      console.error('Error fetching days:', error);
    }
  };

  const fetchExercises = async () => {
    try {
      const result = await db.getAllAsync<{ exercise_name: string }>(
        `SELECT DISTINCT Weight_Log.exercise_name 
         FROM Weight_Log
         INNER JOIN Workout_Log 
         ON Weight_Log.workout_log_id = Workout_Log.workout_log_id
         WHERE Workout_Log.workout_name = ? AND Workout_Log.day_name = ?
         ORDER BY Weight_Log.exercise_name ASC`,
        [selectedWorkout, selectedDay]
      );
      
      const exerciseOptions = result.map(exercise => ({
        label: exercise.exercise_name,
        value: exercise.exercise_name
      }));
      
      setExercises(exerciseOptions);
      setSelectedExercise(''); // Reset exercise selection when day changes
    } catch (error) {
      console.error('Error fetching exercises:', error);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Calculate date based on timeframe
      const now = new Date();
      let startDate = new Date();
      
      switch (timeFrame) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        case 'all':
          startDate = new Date(0); // Beginning of time (1970)
          break;
      }
      
      const startTimestamp = Math.floor(startDate.getTime() / 1000);
      
      const result = await db.getAllAsync<LogData>(
        `SELECT Weight_Log.exercise_name, Weight_Log.weight_logged, Weight_Log.reps_logged, 
                Weight_Log.set_number, Workout_Log.workout_date as date,
                Weight_Log.workout_log_id, Weight_Log.logged_exercise_id
         FROM Weight_Log
         INNER JOIN Workout_Log 
         ON Weight_Log.workout_log_id = Workout_Log.workout_log_id
         WHERE Workout_Log.workout_name = ? 
         AND Workout_Log.day_name = ?
         AND Weight_Log.exercise_name = ?
         AND Workout_Log.workout_date >= ?
         ORDER BY Workout_Log.workout_date ASC`,
        [selectedWorkout, selectedDay, selectedExercise, startTimestamp]
      );
      
      setLogData(result);
    } catch (error) {
      console.error('Error fetching log data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTimeData = async () => {
    setIsLoading(true);
    try {
      // Calculate date based on timeframe
      const now = new Date();
      let startDate = new Date();
      
      switch (timeFrame) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        case 'all':
          startDate = new Date(0); // Beginning of time (1970)
          break;
      }
      
      const startTimestamp = Math.floor(startDate.getTime() / 1000);
      
      const result = await db.getAllAsync<TimeLogData>(
        `SELECT workout_log_id, workout_date, day_name, completion_time
         FROM Workout_Log
         WHERE workout_name = ? 
         AND completion_time IS NOT NULL
         AND workout_date >= ?
         ORDER BY workout_date ASC`,
        [selectedWorkout, startTimestamp]
      );
      
      setTimeLogData(result);
    } catch (error) {
      console.error('Error fetching time data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWorkoutCESData = async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      let startDate = new Date();
      
      switch (timeFrame) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        case 'all':
          startDate = new Date(0);
          break;
      }
      
      const startTimestamp = Math.floor(startDate.getTime() / 1000);
      
      const result = await db.getAllAsync<WorkoutCESData>(
        `SELECT
            wl.workout_log_id,
            wl.workout_date,
            wl.day_name,
            SUM(wgl.weight_logged * wgl.reps_logged * (1 + wgl.reps_logged / 30.0)) / 10 AS total_ces
        FROM Workout_Log wl
        INNER JOIN Weight_Log wgl ON wl.workout_log_id = wgl.workout_log_id
        WHERE wl.workout_name = ? 
        AND wl.workout_date >= ?
        AND wgl.weight_logged > 0
        GROUP BY wl.workout_log_id, wl.workout_date, wl.day_name
        ORDER BY wl.workout_date ASC;`,
        [selectedWorkout, startTimestamp]
      );
      
      setWorkoutCESData(result);
    } catch (error) {
      console.error('Error fetching workout CES data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMuscleGroupDistributionData = async () => {
    setIsLoading(true);
    try {
      const result = await db.getAllAsync<MuscleDistributionData>(
        `SELECT
            w.workout_name,
            COALESCE(e.muscle_group, 'Unspecified') as muscle_group,
            COUNT(e.exercise_id) as exercise_count
         FROM Exercises e
         JOIN Days d ON e.day_id = d.day_id
         JOIN Workouts w ON d.workout_id = w.workout_id
         GROUP BY w.workout_name, COALESCE(e.muscle_group, 'Unspecified')
         ORDER BY w.workout_name, exercise_count DESC;`
      );
      setMuscleDistributionData(result);
    } catch (error) {
      console.error('Error fetching muscle group distribution data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOverallMuscleGroupsData = async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      let startDate = new Date();

      switch (timeFrame) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        case 'all':
          startDate = new Date(0);
          break;
      }

      const startTimestamp = Math.floor(startDate.getTime() / 1000);

      const result = await db.getAllAsync<OverallMuscleGroupsData>(
        `SELECT
          COALESCE(e.muscle_group, 'Unspecified') as muscle_group,
          COUNT(*) as set_count
        FROM Weight_Log wl
        INNER JOIN Workout_Log wlog ON wl.workout_log_id = wlog.workout_log_id
        LEFT JOIN (
            SELECT exercise_name, muscle_group
            FROM Exercises
            GROUP BY exercise_name
        ) e ON wl.exercise_name = e.exercise_name
        WHERE wlog.workout_date >= ?
        GROUP BY COALESCE(e.muscle_group, 'Unspecified')
        ORDER BY set_count DESC;`,
        [startTimestamp]
      );
      setOverallMuscleGroupsData(result);
    } catch (error) {
      console.error('Error fetching overall muscle groups data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableMuscleGroups = async () => {
    setIsLoading(true);
    try {
      const result = await db.getAllAsync<{ muscle_group: string }>(
        `SELECT DISTINCT COALESCE(e.muscle_group, 'Unspecified') as muscle_group
         FROM Weight_Log wl
         INNER JOIN Workout_Log wlog ON wl.workout_log_id = wlog.workout_log_id
         LEFT JOIN (
            SELECT exercise_name, muscle_group
            FROM Exercises
            GROUP BY exercise_name
         ) e ON wl.exercise_name = e.exercise_name
         WHERE e.muscle_group IS NOT NULL AND e.muscle_group != 'Unspecified'
         ORDER BY muscle_group ASC;`
      );
      const muscleGroupOptions = result.map(mg => ({
        label: t(mg.muscle_group.charAt(0).toUpperCase() + mg.muscle_group.slice(1)),
        value: mg.muscle_group
      }));
      setAvailableMuscleGroups(muscleGroupOptions);
      if (muscleGroupOptions.length > 0 && !selectedMuscleGroup) {
        setSelectedMuscleGroup(muscleGroupOptions[0].value);
      }
    } catch (error) {
      console.error('Error fetching available muscle groups:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMuscleGroupVolumeData = async () => {
    if (!selectedMuscleGroup) return;
    setIsLoading(true);
    try {
      const now = new Date();
      let startDate = new Date();

      switch (timeFrame) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        case 'all':
          startDate = new Date(0);
          break;
      }
      const startTimestamp = Math.floor(startDate.getTime() / 1000);

      const result = await db.getAllAsync<MuscleGroupVolumeData>(
        `SELECT
            wlog.workout_date as date,
            SUM(wl.weight_logged * wl.reps_logged * (1 + wl.reps_logged / 30.0)) / 10 AS total_ces
        FROM Weight_Log wl
        INNER JOIN Workout_Log wlog ON wl.workout_log_id = wlog.workout_log_id
        LEFT JOIN (
            SELECT exercise_name, muscle_group
            FROM Exercises
            GROUP BY exercise_name
        ) e ON wl.exercise_name = e.exercise_name
        WHERE wlog.workout_date >= ?
        AND e.muscle_group = ?
        GROUP BY wlog.workout_date
        ORDER BY wlog.workout_date ASC;`,
        [startTimestamp, selectedMuscleGroup]
      );
      setMuscleGroupVolumeData(result);
    } catch (error) {
      console.error('Error fetching muscle group volume data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const processTimeDataForChart = () => {
    const processedData: ProcessedDataPoint[] = timeLogData.map(log => {
      const date = new Date(log.workout_date * 1000);
      
      // Format the date for display in chart
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const formattedDate = dateFormat === 'mm-dd-yyyy'
        ? `${month}/${day}`
        : `${day}/${month}`;
      
      return {
        x: formattedDate,
        y: log.completion_time, // completion_time is already in seconds
        timestamp: log.workout_date,
        originalData: [], // Will be populated when needed for tooltip
        workoutLogId: log.workout_log_id,
        dayName: log.day_name
      };
    });
    
    // Apply smart sampling based on timeframe
    const optimizedData = getOptimalDataPoints(processedData, timeFrame);
    setChartData(optimizedData);
  };

  const processWorkoutCESDataForChart = () => {
    const processedData: ProcessedDataPoint[] = workoutCESData.map(log => {
      const date = new Date(log.workout_date * 1000);
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const formattedDate = dateFormat === 'mm-dd-yyyy'
        ? `${month}/${day}`
        : `${day}/${month}`;
      
      return {
        x: formattedDate,
        y: log.total_ces,
        timestamp: log.workout_date,
        originalData: [],
        workoutLogId: log.workout_log_id,
        dayName: log.day_name
      };
    });
    
    const optimizedData = getOptimalDataPoints(processedData, timeFrame);
    setChartData(optimizedData);
  };

  const processMuscleGroupVolumeDataForChart = () => {
    const processedData: ProcessedDataPoint[] = muscleGroupVolumeData.map(log => {
      const date = new Date(log.date * 1000);
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const formattedDate = dateFormat === 'mm-dd-yyyy'
        ? `${month}/${day}`
        : `${day}/${month}`;
      
      return {
        x: formattedDate,
        y: log.total_ces,
        timestamp: log.date,
        originalData: [], // Fetched on click
      };
    });
    
    const optimizedData = getOptimalDataPoints(processedData, timeFrame);
    setChartData(optimizedData);
  };

  const fetchWorkoutSessionExercises = async (workoutLogId: number) => {
    try {
      const result = await db.getAllAsync<WorkoutSessionExercise>(
        `SELECT Weight_Log.exercise_name, Weight_Log.weight_logged, 
                Weight_Log.reps_logged, Weight_Log.set_number, Workout_Log.day_name
         FROM Weight_Log
         INNER JOIN Workout_Log ON Weight_Log.workout_log_id = Workout_Log.workout_log_id
         WHERE Workout_Log.workout_log_id = ?
         ORDER BY Workout_Log.day_name ASC, Weight_Log.exercise_name ASC, Weight_Log.set_number ASC`,
        [workoutLogId]
      );
      
      setWorkoutSessionExercises(result);
    } catch (error) {
      console.error('Error fetching workout session exercises:', error);
    }
  };

  const fetchMuscleGroupDayDetails = async (timestamp: number, muscleGroup: string) => {
    try {
      const result = await db.getAllAsync<MuscleGroupLogData>(
        `SELECT
            wl.exercise_name,
            wl.weight_logged,
            wl.reps_logged,
            wl.set_number
        FROM Weight_Log wl
        INNER JOIN Workout_Log wlog ON wl.workout_log_id = wlog.workout_log_id
        LEFT JOIN (
            SELECT exercise_name, muscle_group
            FROM Exercises
            GROUP BY exercise_name
        ) e ON wl.exercise_name = e.exercise_name
        WHERE wlog.workout_date = ?
        AND e.muscle_group = ?
        ORDER BY wl.exercise_name, wl.set_number;`,
        [timestamp, muscleGroup]
      );
      setMuscleGroupDayDetails(result);
    } catch (error) {
      console.error('Error fetching muscle group day details:', error);
    }
  };

  // Calculate CES (Combined Effort Score)
  const calculateCES = (sets: LogData[]): number => {
    return sets.reduce((total, set) => {
      const setScore = set.weight_logged * set.reps_logged * (1 + set.reps_logged / 30);
      return ((total + setScore)/10);
    }, 0);
  };

  // Calculate estimated 1RM (one-rep max)
  const calculate1RM = (sets: LogData[]): number => {
    if (sets.length === 0) return 0;
    
    // Find the set with the most weight
    const maxWeightSet = sets.reduce((maxSet, currentSet) => {
      return (currentSet.weight_logged > maxSet.weight_logged) ? currentSet : maxSet;
    }, sets[0]);
    
    // Apply the e1RM formula: weight * (1 + reps / 30)
    return maxWeightSet.weight_logged * (1 + maxWeightSet.reps_logged / 30);
  };

  // Format date according to the user's preference
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return dateFormat === 'mm-dd-yyyy' 
      ? `${month}/${day}/${year}`
      : `${day}/${month}/${year}`;
  };

  // Format weight according to the user's preference
  const formatWeight = (weight: number): string => {
    // Just apply the correct unit without conversion
    return `${weight.toFixed(1)} ${weightFormat}`;
  };

  const generateYTickLabels = (
    yValues: number[],
    segments: number,
    formatYLabel: (valueStr: string, textStr?: string) => string,
    fromZero: boolean,
    decimalPlaces?: number
  ): string[] => {
    if (!yValues || yValues.length === 0 || segments === 0) {
      return [];
    }

    let yMin = fromZero && yValues.every(v => v >= 0) ? 0 : Math.min(...yValues);
    let yMax = Math.max(...yValues);

    if (yMin === yMax) {
      if (yMin === 0 && fromZero) {
        yMax = 1;
      } else if (yMin > 0) {
        yMin = fromZero ? 0 : yMin * 0.8;
        yMax = yMax * 1.2;
      } else if (yMin < 0) {
        yMax = 0;
        yMin = yMin * 1.2;
      } else {
        yMax = 1;
        yMin = -1;
      }
    }
    
    if (yMin > yMax) {
      yMin = yMax -1; 
      if (fromZero && yMin < 0 && yValues.every(v => v >= 0)) yMin = 0;
    }

    const yRange = yMax - yMin;
    const tickLabels: string[] = [];

    const effectiveYMax = yRange === 0 && yMin === 0 ? 1 : yMax;
    const effectiveYMin = yMin;
    const effectiveYRange = effectiveYMax - effectiveYMin;

    if (segments > 0) {
        for (let i = 0; i <= segments; i++) {
          const value = effectiveYMax - (effectiveYRange * (i / segments));
          let labelText = decimalPlaces !== undefined ? value.toFixed(decimalPlaces) : String(value);
          let label = formatYLabel(String(value), labelText);
          tickLabels.push(label);
        }
    }
    return tickLabels;
  };

  // Update processDataForChart to handle different calculation types
  const processDataForChart = () => {
    if (calculationType === 'Sets') {
      processDataForSetsChart();
    } else if (calculationType === 'Reps') {
      processDataForRepsChart();
    } else {
      processDataForRegularChart();
    }
  };

  const processDataForRegularChart = () => {
    // Group logs by date
    const logsByDate = logData.reduce((acc, log) => {
      const date = log.date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(log);
      return acc;
    }, {} as Record<number, LogData[]>);
    
    // Process each date's data
    const processedData: ProcessedDataPoint[] = Object.entries(logsByDate).map(([dateStr, logs]) => {
      const date = new Date(parseInt(dateStr) * 1000);
      
      // Format the date for display in chart (shorter format for chart labels)
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const formattedDate = dateFormat === 'mm-dd-yyyy'
        ? `${month}/${day}`
        : `${day}/${month}`;
      
      // Calculate the value based on selected calculation type
      const value = calculationType === 'CES' 
        ? calculateCES(logs)
        : calculate1RM(logs);
      
      return {
        x: formattedDate,
        y: Number(value.toFixed(1)),
        timestamp: parseInt(dateStr),
        originalData: logs
      };
    });
    
    // Apply smart sampling based on timeframe
    const optimizedData = getOptimalDataPoints(processedData, timeFrame);
    setChartData(optimizedData);
  };

  const processDataForSetsChart = () => {
    // Filter out logs with weight <= 0 first
    const filteredLogData = logData.filter(log => log.weight_logged > 0);
    
    // Group logs by set number first, then by date
    const logsBySet = filteredLogData.reduce((acc, log) => {
      const setNum = log.set_number;
      if (!acc[setNum]) {
        acc[setNum] = {};
      }
      const date = log.date;
      if (!acc[setNum][date]) {
        acc[setNum][date] = [];
      }
      acc[setNum][date].push(log);
      return acc;
    }, {} as Record<number, Record<number, LogData[]>>);
  
    // Get all unique set numbers
    const allSetNumbers = Object.keys(logsBySet).map(Number).sort((a, b) => a - b);
  
    // Process data for each set
    const setsProgressData: SetProgressData[] = [];
  
    // Create a map to track points at each timestamp for overlap detection
    const timestampWeightMap: Record<number, number[]> = {};
  
    allSetNumbers.forEach(setNum => {
      const setLogs = logsBySet[setNum];
      const setData: ProcessedDataPoint[] = [];
  
      // Only process dates where this specific set was logged AND weight > 0
      Object.entries(setLogs).forEach(([dateStr, logs]) => {
        const timestamp = parseInt(dateStr);
        const date = new Date(timestamp * 1000);
        
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const formattedDate = dateFormat === 'mm-dd-yyyy'
          ? `${month}/${day}`
          : `${day}/${month}`;
  
        const setLog = logs[0];
        const weight = setLog.weight_logged;
  
        // Skip if weight is 0 or negative
        if (weight <= 0) return;
  
        // Initialize the weight array for this timestamp if it doesn't exist
        if (!timestampWeightMap[timestamp]) {
          timestampWeightMap[timestamp] = [];
        }
  
        // Count how many times this weight appears at this timestamp
        const weightCount = timestampWeightMap[timestamp].filter(w => Math.abs(w - weight) < 0.1).length;
        // Add a small offset if there are overlapping points (reduced offset)
        const adjustedWeight = weight + (weightCount * 0.3); // Reduced from 0.8 to 0.3
        
        // Store the original weight for future overlap checks
        timestampWeightMap[timestamp].push(weight);
        
        setData.push({
          x: formattedDate,
          y: adjustedWeight,
          timestamp: timestamp,
          originalData: [setLog],
          originalWeight: weight,
        });
      });
  
      // Apply smart sampling to each set's data
      const optimizedSetData = getOptimalDataPoints(setData, timeFrame);
  
      if (optimizedSetData.length > 0) {
        setsProgressData.push({
          setNumber: setNum,
          data: optimizedSetData,
          color: setColors[(setNum - 1) % setColors.length],
          showInLegend: setNum <= 5,
        });
      }
    });
  
    setSetsData(setsProgressData);
    
    // Also set chart data to the first set for compatibility with existing tooltip logic
    if (setsProgressData.length > 0) {
      setChartData(setsProgressData[0].data);
    } else {
      setChartData([]);
      setSetsData([]);
    }
  };

  const processDataForRepsChart = () => {
    // Filter out logs with reps <= 0 first
    const filteredLogData = logData.filter(log => log.reps_logged > 0);
    
    // Group logs by set number first, then by date
    const logsBySet = filteredLogData.reduce((acc, log) => {
      const setNum = log.set_number;
      if (!acc[setNum]) {
        acc[setNum] = {};
      }
      const date = log.date;
      if (!acc[setNum][date]) {
        acc[setNum][date] = [];
      }
      acc[setNum][date].push(log);
      return acc;
    }, {} as Record<number, Record<number, LogData[]>>);
  
    // Get all unique set numbers
    const allSetNumbers = Object.keys(logsBySet).map(Number).sort((a, b) => a - b);
  
    // Process data for each set
    const setsProgressData: SetProgressData[] = [];
  
    // Create a map to track points at each timestamp for overlap detection
    const timestampRepsMap: Record<number, number[]> = {};
  
    allSetNumbers.forEach(setNum => {
      const setLogs = logsBySet[setNum];
      const setData: ProcessedDataPoint[] = [];
  
      // Only process dates where this specific set was logged AND reps > 0
      Object.entries(setLogs).forEach(([dateStr, logs]) => {
        const timestamp = parseInt(dateStr);
        const date = new Date(timestamp * 1000);
        
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const formattedDate = dateFormat === 'mm-dd-yyyy'
          ? `${month}/${day}`
          : `${day}/${month}`;
  
        const setLog = logs[0];
        const reps = setLog.reps_logged;
  
        // Skip if reps is 0 or negative
        if (reps <= 0) return;
  
        // Initialize the reps array for this timestamp if it doesn't exist
        if (!timestampRepsMap[timestamp]) {
          timestampRepsMap[timestamp] = [];
        }
  
        // Count how many times this reps value appears at this timestamp
        const repsCount = timestampRepsMap[timestamp].filter(r => Math.abs(r - reps) < 0.1).length;
        // Add a small offset if there are overlapping points
        const adjustedReps = reps + (repsCount * 0.03);
        
        // Store the original reps for future overlap checks
        timestampRepsMap[timestamp].push(reps);
        
        setData.push({
          x: formattedDate,
          y: adjustedReps,
          timestamp: timestamp,
          originalData: [setLog],
          originalReps: reps,
        });
      });
  
      // Apply smart sampling to each set's data
      const optimizedSetData = getOptimalDataPoints(setData, timeFrame);
  
      if (optimizedSetData.length > 0) {
        setsProgressData.push({
          setNumber: setNum,
          data: optimizedSetData,
          color: setColors[(setNum - 1) % setColors.length],
          showInLegend: setNum <= 5,
        });
      }
    });
  
    setSetsData(setsProgressData);
    
    // Also set chart data to the first set for compatibility with existing tooltip logic
    if (setsProgressData.length > 0) {
      setChartData(setsProgressData[0].data);
    } else {
      setChartData([]);
      setSetsData([]);
    }
  };

  const getChartTitle = () => {
    if (graphMode === 'Exercise') {
        switch (calculationType) {
            case 'CES': return t('Combined Effort Score');
            case '1RM': return t('Estimated 1RM');
            case 'Sets': return t('SetsGraph');
            case 'Reps': return t('RepsGraph');
            default: return '';
        }
    }
    if (graphMode === 'Time') {
        switch (calculationType) {
            case 'Time': return t('TimeGraph');
            case 'CES': return t('Workout Volume');
            case 'MuscleDistribution': return t('Muscle Distribution');
            default: return '';
        }
    }
    if (graphMode === 'Overall') {
        switch (calculationType) {
            case 'OverallMuscleGroups': return t('Overall Muscle Groups');
            case 'MuscleGroupVolume': return t('Muscle Group Volume');
            default: return '';
        }
    }
    return '';
  };

  const getChartExplanation = () => {
    if (graphMode === 'Exercise') {
        switch (calculationType) {
            case 'CES': return { title: t('About CES'), text: t('CESExplanation') };
            case '1RM': return { title: t('About 1RM'), text: t('1RMExplanation') };
            case 'Sets': return { title: t('About Sets Progression'), text: t('setsGraphExplanation') };
            case 'Reps': return { title: t('About Reps Progression'), text: t('repsGraphExplanation') };
            default: return { title: '', text: '' };
        }
    }
    if (graphMode === 'Time') {
        switch (calculationType) {
            case 'Time': return { title: t('About Completion Time'), text: t('timeGraphExplanation') };
            case 'CES': return { title: t('About Workout Volume'), text: t('workoutVolumeExplanation') };
            case 'MuscleDistribution': return { title: t('About Muscle Distribution'), text: t('muscleDistributionExplanation') };
            default: return { title: '', text: '' };
        }
    }
    if (graphMode === 'Overall') {
        switch (calculationType) {
            case 'OverallMuscleGroups': return { title: t('About Overall Muscle Groups'), text: t('overallMuscleGroupsExplanation') };
            case 'MuscleGroupVolume': return { title: t('About Muscle Group Volume'), text: t('muscleGroupVolumeExplanation') };
            default: return { title: '', text: '' };
        }
    }
    return { title: '', text: '' };
  };

  const handleDataPointClick = async (data: any) => {
    if (graphMode === 'Time') {
      // For time chart, fetch the workout session details
      if (data.index !== undefined && chartData[data.index]) {
        const clickedPoint = chartData[data.index];
        setSelectedPoint(clickedPoint);
        if (clickedPoint.workoutLogId) {
          await fetchWorkoutSessionExercises(clickedPoint.workoutLogId);
        }
        setTooltipVisible(true);
      }
    } else if (graphMode === 'Overall' && calculationType === 'MuscleGroupVolume') {
      if (data.index !== undefined && chartData[data.index]) {
        const clickedPoint = chartData[data.index];
        setSelectedPoint(clickedPoint);
        await fetchMuscleGroupDayDetails(clickedPoint.timestamp, selectedMuscleGroup);
        setTooltipVisible(true);
      }
    } else if (calculationType === 'Sets' || calculationType === 'Reps') {
      // For sets chart, we need to find which timestamp was clicked
      if (data.index !== undefined) {
        // Get all unique timestamps sorted
        const allTimestamps = new Set<number>();
        setsData.forEach(setData => {
          setData.data.forEach(point => {
            allTimestamps.add(point.timestamp);
          });
        });
        const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);
        
        if (sortedTimestamps[data.index]) {
          const clickedTimestamp = sortedTimestamps[data.index];
          // Create a dummy data point for the clicked timestamp
          const clickedPoint: ProcessedDataPoint = {
            x: formatDate(clickedTimestamp),
            y: 0, // This won't be used in sets mode
            timestamp: clickedTimestamp,
            originalData: [] // This will be populated in the tooltip
          };
          setSelectedPoint(clickedPoint);
          setTooltipVisible(true);
        }
      }
    } else {
      // Original logic for CES/1RM charts
      if (data.index !== undefined && chartData[data.index]) {
        setSelectedPoint(chartData[data.index]);
        setTooltipVisible(true);
      }
    }
  };

  const closeTooltip = () => {
    setTooltipVisible(false);
    setSelectedPoint(null);
    setWorkoutSessionExercises([]);
    setMuscleGroupDayDetails([]);
  };

  // Render workout dropdown
  const renderWorkoutDropdown = () => {
    return (
      <View style={styles.pickerContainer}>
        <Text style={[styles.pickerLabel, { color: theme.text }]}>
          {t('selectWorkout')}
        </Text>
        <TouchableOpacity
          style={[
            styles.dropdownButton,
            { backgroundColor: theme.card },
          ]}
          onPress={() => {
            setWorkoutDropdownVisible(!workoutDropdownVisible);
            setDayDropdownVisible(false);
            setExerciseDropdownVisible(false);
          }}
        >
          <View style={styles.dropdownHeaderTextContainer}>
            <Ionicons name="barbell-outline" size={24} color={theme.text} style={{ marginRight: 10, }}/>
            <Text style={[styles.dropdownHeaderText, { color: theme.text }]}>
              {allWorkouts.find(w => w.value === selectedWorkout)?.label || t('selectWorkout')}
            </Text>
          </View>
          <Ionicons
            name={workoutDropdownVisible ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={theme.text}
            style={styles.dropdownIcon}
          />
        </TouchableOpacity>

        {workoutDropdownVisible && allWorkouts.length > 0 && (
          <View
            style={[
              styles.dropdownListContainer,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            {allWorkouts.map((item) => (
              <TouchableOpacity
                key={item.value}
                style={[
                  styles.dropdownItem,
                  { backgroundColor: theme.card },
                  selectedWorkout === item.value && {
                    backgroundColor: theme.buttonBackground,
                  },
                ]}
                onPress={() => {
                  setSelectedWorkout(item.value);
                  setSelectedDay('');
                  setExercises([]);
                  setWorkoutDropdownVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.dropdownItemText,
                    {
                      color:
                        selectedWorkout === item.value
                          ? theme.buttonText
                          : theme.text,
                    },
                  ]}
                >
                  {item.label}
                </Text>
                {selectedWorkout === item.value && (
                  <Ionicons
                    name="checkmark"
                    size={18}
                    color={theme.buttonText}
                    style={styles.dropdownItemIcon}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  // Update calculation type toggle to include Time
  const renderCalculationTypeToggle = () => {
    if (graphMode === 'Exercise') {
      return (
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              calculationType === 'Sets' && styles.toggleButtonActive,
              {
                backgroundColor:
                  calculationType === 'Sets'
                    ? theme.buttonBackground
                    : theme.card,
              },
            ]}
            onPress={() => setCalculationType('Sets')}
          >
            <Ionicons
              name="analytics"
              size={20}
              color={
                calculationType === 'Sets' ? theme.buttonText : theme.text
              }
            />
            <Text
              style={[
                styles.toggleText,
                {
                  color:
                    calculationType === 'Sets'
                      ? theme.buttonText
                      : theme.text,
                },
              ]}
            >
              {t('setGraph')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toggleButton,
              calculationType === 'CES' && styles.toggleButtonActive,
              {
                backgroundColor:
                  calculationType === 'CES'
                    ? theme.buttonBackground
                    : theme.card,
              },
            ]}
            onPress={() => setCalculationType('CES')}
          >
            <Ionicons
              name="fitness"
              size={20}
              color={
                calculationType === 'CES' ? theme.buttonText : theme.text
              }
            />
            <Text
              style={[
                styles.toggleText,
                {
                  color:
                    calculationType === 'CES'
                      ? theme.buttonText
                      : theme.text,
                },
              ]}
            >
              {t('CES')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toggleButton,
              calculationType === '1RM' && styles.toggleButtonActive,
              {
                backgroundColor:
                  calculationType === '1RM'
                    ? theme.buttonBackground
                    : theme.card,
              },
            ]}
            onPress={() => setCalculationType('1RM')}
          >
            <Ionicons
              name="barbell"
              size={20}
              color={
                calculationType === '1RM' ? theme.buttonText : theme.text
              }
            />
            <Text
              style={[
                styles.toggleText,
                {
                  color:
                    calculationType === '1RM'
                      ? theme.buttonText
                      : theme.text,
                },
              ]}
            >
              {t('1RM')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toggleButton,
              calculationType === 'Reps' && styles.toggleButtonActive,
              {
                backgroundColor:
                  calculationType === 'Reps'
                    ? theme.buttonBackground
                    : theme.card,
              },
            ]}
            onPress={() => setCalculationType('Reps')}
          >
            <Ionicons
              name="man"
              size={20}
              color={
                calculationType === 'Reps' ? theme.buttonText : theme.text
              }
            />
            <Text
              style={[
                styles.toggleText,
                {
                  color:
                    calculationType === 'Reps'
                      ? theme.buttonText
                      : theme.text,
                },
              ]}
            >
              {t('RepsCapital')}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (graphMode === 'Time') {
      return (
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              calculationType === 'Time' && styles.toggleButtonActive,
              {
                backgroundColor:
                  calculationType === 'Time'
                    ? theme.buttonBackground
                    : theme.card,
              },
            ]}
            onPress={() => setCalculationType('Time')}
          >
            <Ionicons
              name="time"
              size={20}
              color={
                calculationType === 'Time' ? theme.buttonText : theme.text
              }
            />
            <Text
              style={[
                styles.toggleText,
                {
                  color:
                    calculationType === 'Time'
                      ? theme.buttonText
                      : theme.text,
                },
              ]}
            >
              {t('Time')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              calculationType === 'CES' && styles.toggleButtonActive,
              {
                backgroundColor:
                  calculationType === 'CES'
                    ? theme.buttonBackground
                    : theme.card,
              },
            ]}
            onPress={() => setCalculationType('CES')}
          >
            <Ionicons
              name="fitness"
              size={20}
              color={
                calculationType === 'CES' ? theme.buttonText : theme.text
              }
            />
            <Text
              style={[
                styles.toggleText,
                {
                  color:
                    calculationType === 'CES'
                      ? theme.buttonText
                      : theme.text,
                },
              ]}
            >
              {t('Volume')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              calculationType === 'MuscleDistribution' && styles.toggleButtonActive,
              {
                backgroundColor:
                  calculationType === 'MuscleDistribution'
                    ? theme.buttonBackground
                    : theme.card,
              },
            ]}
            onPress={() => setCalculationType('MuscleDistribution')}
          >
            <Ionicons
              name="analytics"
              size={20}
              color={
                calculationType === 'MuscleDistribution' ? theme.buttonText : theme.text
              }
            />
            <Text
              style={[
                styles.toggleText,
                {
                  color:
                    calculationType === 'MuscleDistribution'
                      ? theme.buttonText
                      : theme.text,
                },
              ]}
            >
              {t('Distribution')}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (graphMode === 'Overall') {
      return (
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              calculationType === 'OverallMuscleGroups' && styles.toggleButtonActive,
              {
                backgroundColor:
                  calculationType === 'OverallMuscleGroups'
                    ? theme.buttonBackground
                    : theme.card,
              },
            ]}
            onPress={() => setCalculationType('OverallMuscleGroups')}
          >
            <Ionicons
              name="analytics"
              size={20}
              color={
                calculationType === 'OverallMuscleGroups' ? theme.buttonText : theme.text
              }
            />
            <Text
              style={[
                styles.toggleText,
                {
                  color:
                    calculationType === 'OverallMuscleGroups'
                      ? theme.buttonText
                      : theme.text,
                },
              ]}
            >
              {t('Muscle Groups')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              calculationType === 'MuscleGroupVolume' && styles.toggleButtonActive,
              {
                backgroundColor:
                  calculationType === 'MuscleGroupVolume'
                    ? theme.buttonBackground
                    : theme.card,
              },
            ]}
            onPress={() => setCalculationType('MuscleGroupVolume')}
          >
            <Ionicons
              name="cellular"
              size={20}
              color={
                calculationType === 'MuscleGroupVolume' ? theme.buttonText : theme.text
              }
            />
            <Text
              style={[
                styles.toggleText,
                {
                  color:
                    calculationType === 'MuscleGroupVolume'
                      ? theme.buttonText
                      : theme.text,
                },
              ]}
            >
              {t('Volume')}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  // Define chart-specific rendering functions BEFORE renderChart
  const renderRegularChart = () => {
    if (chartData.length === 0) {
      return (
        <View style={styles.noDataContainer}>
          <Ionicons name="analytics-outline" size={60} color={theme.text} style={{ opacity: 0.5 }} />
          <Text style={[styles.noDataText, { color: theme.text }]}>
            {t('No data available for the selected criteria')}
          </Text>
        </View>
      );
    }

    const formattedChartData = chartData.map(point => {
      const date = new Date(point.timestamp * 1000);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const formattedDate = dateFormat === 'mm-dd-yyyy' ? `${month}/${day}` : `${day}/${month}`;
      return { ...point, x: formattedDate };
    });

    const yValues = formattedChartData.map(point => point.y);
    const chartHeight = 220;
    const yAxisWidth = 55; 
    const lineChartContentWidth = getChartWidth(chartData.length);
    const lineChartSegments = 4; 

    const lineChartConfig = {
      backgroundColor: theme.card,
      backgroundGradientFrom: theme.card,
      backgroundGradientTo: theme.card,
      decimalPlaces: 0,
      color: (opacity = 1) => calculationType === '1RM' 
        ? `rgba(0, 168, 132, ${opacity})` 
        : `rgba(0, 123, 255, ${opacity})`,
      labelColor: (opacity = 1) => theme.text,
      style: { borderRadius: 16 },
      propsForDots: {
        r: '4',
        strokeWidth: '4',
        stroke: calculationType === '1RM' ? `rgba(0, 168, 132, 1)` : `rgba(0, 123, 255, 1)`
      },
      fillShadowGradientFrom: calculationType === '1RM' ? `rgba(0, 168, 132, 0.15)` : `rgba(0, 123, 255, 0.15)`,
      fillShadowGradientTo: calculationType === '1RM' ? `rgba(0, 168, 132, 0.02)` : `rgba(0, 123, 255, 0.02)`,
      fillShadowGradientFromOpacity: 0.5,
      fillShadowGradientToOpacity: 0.1,
      useShadowColorFromDataset: true,
      withShadow: true,
      withInnerLines: true,
      withOuterLines: true,
      fromZero: false,
    };

    const defaultFormatYLabel = (yLabelValue: string, yLabelText?: string) => {
        return yLabelText || yLabelValue;
    };

    const yTickLabels = generateYTickLabels(
      yValues,
      lineChartSegments,
      defaultFormatYLabel,
      lineChartConfig.fromZero || false,
      lineChartConfig.decimalPlaces
    );

    const lineChartProps = {
      data: {
        labels: formattedChartData.map(point => point.x),
        datasets: [{
          data: yValues,
          color: lineChartConfig.color,
          strokeWidth: 2
        }],
        legend: [calculationType === 'CES' ? 'Combined Effort Score' : t('Estimated 1RM')]
      },
      width: lineChartContentWidth,
      height: chartHeight + 20,
      chartConfig: lineChartConfig,
      bezier: true,
      style: styles.chart,
      verticalLabelRotation: 30,
      onDataPointClick: handleDataPointClick,
      withHorizontalLabels: false,
      paddingRight: 0, // This is the prop causing the linter issue
      segments: lineChartSegments,
    };

    return (
      <View style={styles.chartContainer}>
        <View style={{ flexDirection: 'row' }}>
          <StickyYAxis
            chartHeight={chartHeight + 20}
            yTickLabels={yTickLabels}
            labelColor={lineChartConfig.labelColor}
            chartPaddingTop={16}
            fontSize={10}
            axisWidth={yAxisWidth}
          />
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chartScrollContainer}
          >
            <LineChart {...lineChartProps as any} />
          </ScrollView>
        </View>
        {chartData.length > 5 && (
          <Text style={[styles.scrollHint, { color: theme.text }]}>
            {t('horizontalScrollHint')} →
          </Text>
        )}
      </View>
    );
  };

  const renderTimeChart = () => {
    if (chartData.length === 0) {
      return (
        <View style={styles.noDataContainer}>
          <Ionicons name="time-outline" size={60} color={theme.text} style={{ opacity: 0.5 }} />
          <Text style={[styles.noDataText, { color: theme.text }]}>
            {t('No data available for the selected criteria')}
          </Text>
        </View>
      );
    }

    const formattedChartData = chartData.map(point => {
      const date = new Date(point.timestamp * 1000);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const formattedDate = dateFormat === 'mm-dd-yyyy' ? `${month}/${day}` : `${day}/${month}`;
      return { ...point, x: formattedDate }; // x is for labels, y for values
    });

    const yValues = formattedChartData.map(point => point.y); // These are completion times in seconds
    
    const dayNames = [...new Set(formattedChartData.map(p => p.dayName).filter(Boolean))] as string[];
    const dayNameColorMap = dayNames.reduce((acc, dayName, index) => {
      acc[dayName] = timeChartDayColors[index % timeChartDayColors.length];
      return acc;
    }, {} as Record<string, string>);

    const getDotColor = (_: any, dataPointIndex: number) => {
      const point = formattedChartData[dataPointIndex];
      if (point && point.dayName) {
        return dayNameColorMap[point.dayName] || theme.text;
      }
      return theme.text;
    };
    
    const chartHeight = 220;
    const lineChartContentWidth = getChartWidth(chartData.length);
    const lineChartSegments = 4; // Default segments for the LineChart

    const timeChartConfig = {
      backgroundColor: theme.card,
      backgroundGradientFrom: theme.card,
      backgroundGradientTo: theme.card,
      backgroundGradientFromOpacity: 1,
      backgroundGradientToOpacity: 1,
      color: (opacity = 1) => `rgba(107, 107, 255, ${opacity})`, // Default line color, overridden by dataset
      labelColor: (opacity = 1) => theme.text, 
      style: { borderRadius: 16 },
      propsForDots: { r: '6', strokeWidth: '4' },
      fillShadowGradientFrom: `rgba(107, 107, 255, 0.15)`,
      fillShadowGradientTo: `rgba(107, 107, 255, 0.02)`,
      fillShadowGradientFromOpacity: 0.5,
      fillShadowGradientToOpacity: 0.1,
      useShadowColorFromDataset: false,
      withShadow: true,
      withInnerLines: true,
      withOuterLines: true,
      fromZero: yValues.every(v => v >= 0),
    };

    const lineChartProps = {
      data: {
        labels: formattedChartData.map(point => point.x),
        datasets: [{
          data: yValues.map(seconds => seconds / 3600), // Convert yValues to hours
          color: timeChartConfig.color, 
          strokeWidth: 2
        }],
        legend: [t('completionTime')]
        
      },
      width: lineChartContentWidth, 
      height: chartHeight + 20,
      chartConfig: timeChartConfig,
      bezier: true,
      style: styles.chart,
      verticalLabelRotation: 30,
      onDataPointClick: handleDataPointClick,
      withHorizontalLabels: true, 
      paddingRight: 50,
      segments: lineChartSegments,
      getDotColor: getDotColor,
      formatYLabel: (yLabel: string) => {
          const hours = parseFloat(yLabel);
          const totalMinutes = Math.round(hours * 60);
          const h = Math.floor(totalMinutes / 60);
          const m = totalMinutes % 60;
          if (h > 0) return `${h}h ${m}m`;
          return `${m}m`;
        }
    };

    return (
      <View style={styles.chartContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chartScrollContainer}
        >
          <LineChart {...lineChartProps as any} />
        </ScrollView>
        <View style={[styles.legendContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.legendTitle, { color: theme.text }]}>{t('Workout Days')}</Text>
          <View style={styles.legendItems}>
            {dayNames.map(dayName => (
              <View key={dayName} style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: dayNameColorMap[dayName] }]} />
                <Text style={[styles.legendText, { color: theme.text }]}>{dayName}</Text>
              </View>
            ))}
          </View>
        </View>
        {chartData.length > 5 && (
          <Text style={[styles.scrollHint, { color: theme.text }]}>
            {t('horizontalScrollHint')} →
          </Text>
        )}
      </View>
    );
  };

  const renderVolumeChart = () => {
    if (chartData.length === 0) {
      return (
        <View style={styles.noDataContainer}>
          <Ionicons name="cellular-outline" size={60} color={theme.text} style={{ opacity: 0.5 }} />
          <Text style={[styles.noDataText, { color: theme.text }]}>
            {t('No data available for the selected criteria')}
          </Text>
        </View>
      );
    }

    const formattedChartData = chartData.map(point => {
      const date = new Date(point.timestamp * 1000);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const formattedDate = dateFormat === 'mm-dd-yyyy' ? `${month}/${day}` : `${day}/${month}`;
      return { ...point, x: formattedDate };
    });

    const yValues = formattedChartData.map(point => point.y);
    const dayNames = [...new Set(formattedChartData.map(p => p.dayName).filter(Boolean))] as string[];
    const dayNameColorMap = dayNames.reduce((acc, dayName, index) => {
      acc[dayName] = timeChartDayColors[index % timeChartDayColors.length];
      return acc;
    }, {} as Record<string, string>);

    const getDotColor = (_: any, dataPointIndex: number) => {
      const point = formattedChartData[dataPointIndex];
      if (point && point.dayName) {
        return dayNameColorMap[point.dayName] || theme.text;
      }
      return theme.text;
    };

    const chartHeight = 220;
    const yAxisWidth = 65;
    const lineChartContentWidth = getChartWidth(chartData.length);
    const lineChartSegments = 4;

    const volumeChartConfig = {
      backgroundColor: theme.card,
      backgroundGradientFrom: theme.card,
      backgroundGradientTo: theme.card,
      backgroundGradientFromOpacity: 1,
      backgroundGradientToOpacity: 1,
      color: (opacity = 1) => `rgba(0, 171, 142, ${opacity})`, 
      labelColor: (opacity = 1) => theme.text,
      style: { borderRadius: 16 },
      propsForDots: { r: '6', strokeWidth: '4' },
      fillShadowGradientFrom: `rgba(0, 171, 142, 0.15)`,
      fillShadowGradientTo: `rgba(0, 171, 142, 0.02)`,
      fillShadowGradientFromOpacity: 0.5,
      fillShadowGradientToOpacity: 0.1,

      useShadowColorFromDataset: false,
      withShadow: true,
      withInnerLines: true,
      withOuterLines: true,
      fromZero: yValues.every(v => v >= 0),
    };

    const lineChartProps = {
      data: {
        labels: formattedChartData.map(point => point.x),
        datasets: [{
          data: yValues,
          color: volumeChartConfig.color,
          strokeWidth: 2
        }],
        legend: [t('Workout Volume')]
      },
      width: lineChartContentWidth,
      height: chartHeight + 20,
      chartConfig: volumeChartConfig,
      bezier: true,
      style: styles.chart,
      verticalLabelRotation: 30,
      onDataPointClick: handleDataPointClick,
      withHorizontalLabels: false,
      paddingRight: 50,
      segments: lineChartSegments,
      getDotColor: getDotColor,
    };

    const defaultFormatYLabel = (yLabelValue: string, yLabelText?: string) => {
      return yLabelText || yLabelValue;
    };

    const yTickLabels =
    calculationType === 'CES'
      ? generateYTickLabels(
          yValues,
          lineChartSegments,
          defaultFormatYLabel,
          volumeChartConfig.fromZero,
          0
        )
      : [];

    return (
      <View style={styles.chartContainer}>
        <View style={{ flexDirection: 'row' }}>
          <StickyYAxis
            chartHeight={chartHeight + 20}
            yTickLabels={yTickLabels}
            labelColor={volumeChartConfig.labelColor}
            chartPaddingTop={16}
            fontSize={10}
            axisWidth={yAxisWidth}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chartScrollContainer}
          >
            <LineChart {...lineChartProps as any} />
          </ScrollView>
        </View>
        <View style={[styles.legendContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.legendTitle, { color: theme.text }]}>{t('Workout Days')}</Text>
          <View style={styles.legendItems}>
            {dayNames.map(dayName => (
              <View key={dayName} style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: dayNameColorMap[dayName] }]} />
                <Text style={[styles.legendText, { color: theme.text }]}>{dayName}</Text>
              </View>
            ))}
          </View>
        </View>
        {chartData.length > 5 && (
          <Text style={[styles.scrollHint, { color: theme.text }]}>
            {t('horizontalScrollHint')} →
          </Text>
        )}
      </View>
    );
  };

  const renderSetsChart = () => {
    if (setsData.length === 0) {
      return (
        <View style={styles.noDataContainer}>
          <Ionicons name="analytics-outline" size={60} color={theme.text} style={{ opacity: 0.5 }} />
          <Text style={[styles.noDataText, { color: theme.text }]}>
            {t('No data available for the selected criteria')}
          </Text>
        </View>
      );
    }
  
    const allTimestamps = new Set<number>();
    const allYValuesForAxis: number[] = []; // Collect all Y values for StickyYAxis scaling

    setsData.forEach(set => {
      set.data.forEach(point => {
        allTimestamps.add(point.timestamp);
        // The point.y already includes the offset for overlap, use originalWeight/originalReps for true scale value
        if (calculationType === 'Sets') {
            if (point.originalWeight && point.originalWeight > 0) {
                allYValuesForAxis.push(point.originalWeight); 
            }
        } else if (calculationType === 'Reps') {
            if (point.originalReps && point.originalReps > 0) {
                allYValuesForAxis.push(point.originalReps); 
            }
        }
      });
    });
    
    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);
    const sortedDates = sortedTimestamps.map(timestamp => {
      const date = new Date(timestamp * 1000);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      return dateFormat === 'mm-dd-yyyy' ? `${month}/${day}` : `${day}/${month}`;
    });
  
    const datasets = setsData.map(setData => {
      const dataArray = sortedTimestamps.map(timestamp => {
        const point = setData.data.find(p => p.timestamp === timestamp);
        if (point) {
          return point.y; // This is the (potentially offset) value for plotting
        }
        return 0; 
      });
      return { data: dataArray, color: (opacity = 1) => setData.color, strokeWidth: 2 };
    });
  
    const chartDataForLineChart = {
      labels: sortedDates,
      datasets: datasets,
      legend: setsData.length > 5 
        ? setsData.map(() => '') 
        : setsData.map(setData => `${t('Set')} ${setData.setNumber}`)
    };
  
    const chartHeight = Math.max(220, 180 + (setsData.length > 5 ? setsData.length * 5 : setsData.length * 10));
    const yAxisWidth = 55;
    const lineChartContentWidth = getChartWidth(sortedDates.length);
    const lineChartSegments = 4;

    // Define setsChartConfig and defaultFormatYLabel before they are used by generateYTickLabels
    const setsChartConfig = {
      backgroundColor: theme.card,
      backgroundGradientFrom: theme.card,
      backgroundGradientTo: theme.card,
      decimalPlaces: 0, // For Y-axis labels displayed by StickyYAxis
      color: (opacity = 1) => `rgba(0, 123, 255, ${opacity})`, // Default line color, overridden by dataset
      labelColor: (opacity = 1) => theme.text, // For StickyYAxis
      style: { borderRadius: 16 },
      propsForDots: { r: '4', strokeWidth: '2' }, // Dots color will use dataset color
      fillShadowGradientFrom: 'rgba(0, 0, 0, 0)', // No fill shadow for sets chart lines
      fillShadowGradientTo: 'rgba(0, 0, 0, 0)',
      fillShadowGradientFromOpacity: 0,
      fillShadowGradientToOpacity: 0,
      useShadowColorFromDataset: false,
      withShadow: false, // No line shadow for sets chart lines
      withInnerLines: true,
      withOuterLines: true,
      fromZero: false, 
    };

    const defaultFormatYLabel = (yLabelValue: string, yLabelText?: string) => {
        return yLabelText || yLabelValue; 
    };

    const yTickValuesForSets = allYValuesForAxis.length > 0 ? allYValuesForAxis : [0,1];
    const yTickLabels = generateYTickLabels(
      yTickValuesForSets,
      lineChartSegments,
      defaultFormatYLabel,
      setsChartConfig.fromZero, // Use fromZero from setsChartConfig
      setsChartConfig.decimalPlaces // Use decimalPlaces from setsChartConfig
    );

    const lineChartProps = {
      data: chartDataForLineChart,
      width: lineChartContentWidth,
      height: chartHeight + 20,
      chartConfig: setsChartConfig,
      style: styles.chart,
      verticalLabelRotation: 30,
      onDataPointClick: handleDataPointClick,
      withHorizontalLabels: false,
      paddingRight: 0,
      segments: lineChartSegments,
      withShadow: false, // Explicitly set here for the LineChart component itself
    };
  
    return (
      <View style={styles.chartContainer}>
        <View style={{ flexDirection: 'row' }}>
          <StickyYAxis
            chartHeight={chartHeight + 20}
            yTickLabels={yTickLabels}
            labelColor={setsChartConfig.labelColor}
            chartPaddingTop={16}
            fontSize={10}
            axisWidth={yAxisWidth}
          />
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chartScrollContainer}
          >
            <LineChart {...lineChartProps as any} />
          </ScrollView>
        </View>
        {sortedDates.length > 5 && (
          <Text style={[styles.scrollHint, { color: theme.text }]}>
            {t('horizontalScrollHint')} →
          </Text>
        )}
      </View>
    );
  };

  const renderMuscleDistributionChart = () => {
    if (muscleDistributionData.length === 0) {
      return (
        <View style={styles.noDataContainer}>
          <Ionicons name="pie-chart-outline" size={60} color={theme.text} style={{ opacity: 0.5 }} />
          <Text style={[styles.noDataText, { color: theme.text }]}>
            {t('No data available for the selected criteria')}
          </Text>
        </View>
      );
    }

    const workoutNames = [...new Set(muscleDistributionData.map(d => d.workout_name))];

    const currentWorkout = distributionWorkout || workoutNames[0];

    const selectedData = muscleDistributionData.filter(d => d.workout_name === currentWorkout);

    const labels = selectedData.map(d => t(d.muscle_group.charAt(0).toUpperCase() + d.muscle_group.slice(1)));
    const data = selectedData.map(d => d.exercise_count);
    const chartWidth = getChartWidth(labels.length);

    const chartConfig = {
      backgroundGradientFrom: theme.card,
      backgroundGradientTo: theme.card,
      color: (opacity = 1) => `rgba(75, 192, 192, ${opacity})`,
      labelColor: (opacity = 1) => theme.text,
      barPercentage: 0.7,
      decimalPlaces: 0,
      style: {
        borderRadius: 16,
      },
      fillShadowGradientFrom: 'rgba(75, 192, 192, 1)',
      fillShadowGradientTo: 'rgba(75, 192, 192, 1)',
      fillShadowGradientFromOpacity: 1,
      fillShadowGradientToOpacity: 1,
    };
    

    return (
      <View style={styles.chartContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.buttonRow} style={{marginBottom: 10}}>
            {workoutNames.map(name => (
                <TouchableOpacity
                    key={name}
                    onPress={() => setDistributionWorkout(name)}
                    style={[
                        styles.timeFrameButton,
                        {
                            backgroundColor: currentWorkout === name ? theme.buttonBackground : theme.card,
                            minWidth: 'auto',
                            paddingHorizontal: 20,
                        }
                    ]}
                >
                    <Text style={[
                        styles.timeFrameButtonText,
                        { color: currentWorkout === name ? theme.buttonText : theme.text }
                    ]}>
                        {name}
                    </Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <BarChart
            data={{
              labels,
              datasets: [{ data }],
            }}
            width={chartWidth}
            height={300}
            chartConfig={chartConfig}
            verticalLabelRotation={30}
            fromZero
            showValuesOnTopOfBars={false}
            style={styles.chart}
            yAxisLabel=""
            yAxisSuffix=""
          />
        </ScrollView>
        {labels.length > 5 && (
          <Text style={[styles.scrollHint, { color: theme.text }]}>
            {t('horizontalScrollHint')} →
          </Text>
        )}
      </View>
    );
  };

  const renderOverallMuscleGroupsChart = () => {
    if (overallMuscleGroupsData.length === 0) {
      return (
        <View style={styles.noDataContainer}>
          <Ionicons name="pie-chart-outline" size={60} color={theme.text} style={{ opacity: 0.5 }} />
          <Text style={[styles.noDataText, { color: theme.text }]}>
            {t('No data available for the selected criteria')}
          </Text>
        </View>
      );
    }
  
    const labels = overallMuscleGroupsData.map(d => t(d.muscle_group.charAt(0).toUpperCase() + d.muscle_group.slice(1)));
    const data = overallMuscleGroupsData.map(d => d.set_count);
    const chartWidth = getChartWidth(labels.length);
  
    const chartConfig = {
      backgroundGradientFrom: theme.card,
      backgroundGradientTo: theme.card,
      color: (opacity = 1) => `rgba(75, 192, 192, ${opacity})`,
      labelColor: (opacity = 1) => theme.text,
      barPercentage: 0.7,
      decimalPlaces: 0,
      style: {
        borderRadius: 16,
      },
      fillShadowGradientFrom: 'rgba(75, 192, 192, 1)',
      fillShadowGradientTo: 'rgba(75, 192, 192, 1)',
      fillShadowGradientFromOpacity: 1,
      fillShadowGradientToOpacity: 1,
    };
  
    return (
      <View style={{ marginBottom: 10 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <BarChart
            data={{
              labels,
              datasets: [{ data }],
            }}
            width={chartWidth}
            height={300}
            chartConfig={chartConfig}
            verticalLabelRotation={30}
            fromZero
            showValuesOnTopOfBars={false}
            style={styles.chart}
            yAxisLabel=""
            yAxisSuffix=""
          />
        </ScrollView>
        {labels.length > 5 && (
          <Text style={[styles.scrollHint, { color: theme.text }]}>
            {t('horizontalScrollHint')} →
          </Text>
        )}
      </View>
    );
  };

  const renderMuscleGroupVolumeChart = () => {
    const chartContent = isLoading ? (
      <ActivityIndicator size="large" color={theme.buttonBackground} style={styles.loader} />
    ) : chartData.length === 0 ? (
      <View style={styles.noDataContainer}>
        <Ionicons name="cellular-outline" size={60} color={theme.text} style={{ opacity: 0.5 }} />
        <Text style={[styles.noDataText, { color: theme.text }]}>
          {t('No data available for the selected criteria')}
        </Text>
      </View>
    ) : (
      <>
        <View style={{ flexDirection: 'row' }}>
          <StickyYAxis
            chartHeight={220 + 20}
            yTickLabels={generateYTickLabels(
              chartData.map(p => p.y),
              4,
              (val, text) => text || val,
              true,
              0
            )}
            labelColor={(opacity = 1) => theme.text}
            chartPaddingTop={16}
            fontSize={10}
            axisWidth={65}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chartScrollContainer}
          >
            <LineChart
              data={{
                labels: chartData.map(point => {
                  const date = new Date(point.timestamp * 1000);
                  const day = date.getDate().toString().padStart(2, '0');
                  const month = (date.getMonth() + 1).toString().padStart(2, '0');
                  return dateFormat === 'mm-dd-yyyy' ? `${month}/${day}` : `${day}/${month}`;
                }),
                datasets: [{ 
                  data: chartData.map(p => p.y), 
                  color: (opacity = 1) => `rgba(153, 102, 255, ${opacity})`, 
                  strokeWidth: 2 
                }],
                legend: [t('Muscle Group Volume')]
              }}
              width={getChartWidth(chartData.length)}
              height={220 + 20}
              chartConfig={{
                backgroundColor: theme.card,
                backgroundGradientFrom: theme.card,
                backgroundGradientTo: theme.card,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(153, 102, 255, ${opacity})`,
                labelColor: (opacity = 1) => theme.text,
                style: { borderRadius: 16 },
                propsForDots: { r: '4', strokeWidth: '4', stroke: `rgba(153, 102, 255, 1)` },
                fillShadowGradientFrom: `rgba(153, 102, 255, 0.15)`,
                fillShadowGradientTo: `rgba(153, 102, 255, 0.02)`,
                fillShadowGradientFromOpacity: 0.5,
                fillShadowGradientToOpacity: 0.1,
                useShadowColorFromDataset: true,
              }}
              bezier={true}
              withShadow={true}
              style={styles.chart}
              verticalLabelRotation={30}
              onDataPointClick={handleDataPointClick}
              withHorizontalLabels={false}
              segments={4}
            />
          </ScrollView>
        </View>
        {chartData.length > 5 && (
          <Text style={[styles.scrollHint, { color: theme.text }]}>
            {t('horizontalScrollHint')} →
          </Text>
        )}
      </>
    );
    
    return (
      <View style={styles.chartContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.buttonRow} style={{marginBottom: 10}}>
            {availableMuscleGroups.map(group => (
                <TouchableOpacity
                    key={group.value}
                    onPress={() => setSelectedMuscleGroup(group.value)}
                    style={[
                        styles.timeFrameButton,
                        {
                            backgroundColor: selectedMuscleGroup === group.value ? theme.buttonBackground : theme.card,
                            minWidth: 'auto',
                            paddingHorizontal: 20,
                        }
                    ]}
                >
                    <Text style={[
                        styles.timeFrameButtonText,
                        { color: selectedMuscleGroup === group.value ? theme.buttonText : theme.text }
                    ]}>
                        {group.label}
                    </Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
        {chartContent}
      </View>
    );
  };

  // Define renderChart AFTER the individual chart rendering functions
  const renderChart = () => {
    if (graphMode === 'Time') {
      if (calculationType === 'Time') {
        return renderTimeChart();
      } else if (calculationType === 'CES') {
        return renderVolumeChart();
      } else if (calculationType === 'MuscleDistribution') {
        return renderMuscleDistributionChart();
      }
    } else if (calculationType === 'Sets' || calculationType === 'Reps') {
      return renderSetsChart();
    } else if (graphMode === 'Overall') {
      if (calculationType === 'OverallMuscleGroups') {
        return renderOverallMuscleGroupsChart();
      }
      if (calculationType === 'MuscleGroupVolume') {
        return renderMuscleGroupVolumeChart();
      }
    } else {
      return renderRegularChart(); // This should now be correctly defined and in scope
    }
  };

  const renderTooltipContent = () => {
    if (!selectedPoint) return null;

    const formattedDate = formatDate(selectedPoint.timestamp);

    if (graphMode === 'Time') {
      const exercisesByDay = workoutSessionExercises.reduce((acc, exercise) => {
        if (!acc[exercise.day_name]) {
          acc[exercise.day_name] = [];
        }
        acc[exercise.day_name].push(exercise);
        return acc;
      }, {} as Record<string, WorkoutSessionExercise[]>);

      return (
        <>
          <Text style={[styles.tooltipSubtitle, { color: theme.text, marginBottom: 5 }]}>
            {selectedPoint.dayName} - {formattedDate}
          </Text>
          <Text style={[styles.tooltipSubtitle, { color: theme.text }]}>
            {calculationType === 'Time'
              ? `${t('completionTime')}: ${formatTimeFromSeconds(selectedPoint.y)}`
              : `${t('Workout Volume')}: ${selectedPoint.y.toFixed(2)}`}
          </Text>
          
          <ScrollView style={styles.tooltipSetsList} nestedScrollEnabled>
            {Object.entries(exercisesByDay).map(([dayName, exercises]) => (
              <View key={dayName} style={styles.tooltipDaySection}>
                {exercises.reduce((acc, exercise) => {
                  const existingExercise = acc.find(ex => ex.exercise_name === exercise.exercise_name);
                  if (existingExercise) {
                    existingExercise.sets.push({
                      set_number: exercise.set_number,
                      weight_logged: exercise.weight_logged,
                      reps_logged: exercise.reps_logged
                    });
                  } else {
                    acc.push({
                      exercise_name: exercise.exercise_name,
                      sets: [{
                        set_number: exercise.set_number,
                        weight_logged: exercise.weight_logged,
                        reps_logged: exercise.reps_logged
                      }]
                    });
                  }
                  return acc;
                }, [] as Array<{exercise_name: string, sets: Array<{set_number: number, weight_logged: number, reps_logged: number}>}>)
                .map((exercise) => (
                  <View key={exercise.exercise_name} style={styles.tooltipExerciseItem}>
                    <Text style={[styles.tooltipExerciseName, { color: theme.text }]}>
                      {exercise.exercise_name}
                    </Text>
                    {exercise.sets
                      .sort((a, b) => a.set_number - b.set_number)
                      .map((set) => (
                      <Text key={set.set_number} style={[styles.tooltipSetText, { color: theme.text, marginLeft: 10 }]}>
                        {t('Set')} {set.set_number}: {formatWeight(set.weight_logged)} × {set.reps_logged} {t('reps')}
                      </Text>
                    ))}
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
        </>
      );
    }

    if (graphMode === 'Overall' && calculationType === 'MuscleGroupVolume') {
      return (
        <>
          <Text style={[styles.tooltipSubtitle, { color: theme.text, marginBottom: 5 }]}>
            {availableMuscleGroups.find(mg => mg.value === selectedMuscleGroup)?.label} - {formattedDate}
          </Text>
          <Text style={[styles.tooltipSubtitle, { color: theme.text }]}>
            {`${t('Volume')}: ${selectedPoint.y.toFixed(1)}`}
          </Text>
          <ScrollView style={styles.tooltipSetsList} nestedScrollEnabled>
            {Object.entries(
              muscleGroupDayDetails.reduce((acc, log) => {
                if (!acc[log.exercise_name]) {
                  acc[log.exercise_name] = [];
                }
                acc[log.exercise_name].push(log);
                return acc;
              }, {} as Record<string, MuscleGroupLogData[]>)
            ).map(([exerciseName, sets]) => (
              <View key={exerciseName} style={styles.tooltipExerciseItem}>
                <Text style={[styles.tooltipExerciseName, { color: theme.text }]}>
                  {exerciseName}
                </Text>
                {sets
                  .sort((a, b) => a.set_number - b.set_number)
                  .map((set) => (
                    <Text key={set.set_number} style={[styles.tooltipSetText, { color: theme.text, marginLeft: 10 }]}>
                      {t('Set')} {set.set_number}: {formatWeight(set.weight_logged)} × {set.reps_logged} {t('reps')}
                    </Text>
                  ))}
              </View>
            ))}
          </ScrollView>
        </>
      );
    }

    if (calculationType === 'Sets' || calculationType === 'Reps') {
      const dateData: SetDataPoint[] = [];
      setsData.forEach(setData => {
        const dataPoint = setData.data.find(point => point.timestamp === selectedPoint.timestamp);
        if (dataPoint) {
          dateData.push({
            setNumber: setData.setNumber,
            weight: dataPoint.originalData[0].weight_logged,
            color: setData.color,
            reps: dataPoint.originalData[0].reps_logged,
          });
        }
      });

      return (
        <View style={styles.tooltipSetsList}>
          <Text style={[styles.tooltipSetsHeader, { color: theme.text, marginBottom: 15 }]}>
            {selectedExercise} - {formattedDate}
          </Text>
          <FlatList
            data={dateData}
            keyExtractor={(item) => `set_${item.setNumber}`}
            renderItem={({ item }) => (
              <View style={[styles.tooltipSetItem, { flexDirection: 'row', alignItems: 'center', marginVertical: 4 }]}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: item.color, marginRight: 8 }} />
                <Text style={[styles.tooltipSetText, { color: theme.text }]}>
                  {t('Set')} {item.setNumber}: {formatWeight(item.weight)} × {item.reps} {t('reps')}
                </Text>
              </View>
            )}
          />
        </View>
      );
    }

    // Default case for Exercise CES/1RM
    return (
      <>
        <Text style={[styles.tooltipSubtitle, { color: theme.text, marginBottom: 5 }]}>
          {selectedExercise} - {formattedDate}
        </Text>
        <Text style={[styles.tooltipSubtitle, { color: theme.text }]}>
          {calculationType === 'CES' 
            ? `${t('CES')}: ${selectedPoint.y.toFixed(1)}`
            : `${t('1RM')}: ${formatWeight(selectedPoint.y)}`
          }
        </Text>
        
        <View style={styles.tooltipSetsList}>
          <Text style={[styles.tooltipSetsHeader, { color: theme.text }]}>
            {t('Sets Logged')}:
          </Text>
          <FlatList
            data={selectedPoint.originalData}
            keyExtractor={(item, index) => `${item.logged_exercise_id}_${index}`}
            renderItem={({ item }) => (
              <View style={styles.tooltipSetItem}>
                <Text style={[styles.tooltipSetText, { color: theme.text }]}>
                  {t('Set')} {item.set_number}: {formatWeight(item.weight_logged)} × {item.reps_logged} {t('reps')}
                </Text>
              </View>
            )}
          />
        </View>
      </>
    );
  };

  // Update tooltip to handle time data
  const renderTooltip = () => {
    if (!selectedPoint) return null;
    
    return (
      <Modal
        transparent={true}
        visible={tooltipVisible}
        onRequestClose={closeTooltip}
        animationType="fade"
      >
        <TouchableOpacity 
          style={styles.tooltipOverlay} 
          activeOpacity={1} 
          onPress={closeTooltip}
        >
          <View style={[styles.tooltipContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.tooltipHeader}>
              <Text style={[styles.tooltipTitle, { color: theme.text }]}>
                {getChartTitle()}
              </Text>
              <TouchableOpacity onPress={closeTooltip}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            {renderTooltipContent()}

          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  // Render timeframe selector buttons
  const renderTimeFrameButtons = () => {
    const timeFrames: { value: TimeFrame; label: string }[] = [
      { value: 'week', label: t('Week') },
      { value: 'month', label: t('Month') },
      { value: 'year', label: t('Year') },
      { value: 'all', label: t('All Time') }
    ];

    return (
      <View style={styles.timeFrameContainer}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {t('Time Frame')}
        </Text>
        <View style={styles.buttonRow}>
          {timeFrames.map((frame) => (
            <TouchableOpacity
              key={frame.value}
              style={[
                styles.timeFrameButton,
                timeFrame === frame.value && styles.timeFrameButtonActive,
                { 
                  backgroundColor: timeFrame === frame.value ? theme.buttonBackground : theme.card,
                }
              ]}
              onPress={() => setTimeFrame(frame.value)}
            >
              <Text 
                style={[
                  styles.timeFrameButtonText, 
                  timeFrame === frame.value && styles.timeFrameButtonTextActive,
                  { color: timeFrame === frame.value ? theme.buttonText : theme.text }
                ]}
              >
                {frame.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  // Render day dropdown button - hide for Time mode
  const renderDayDropdown = () => {
    if (graphMode === 'Time' || graphMode === 'Overall') return null;
    
    const selectedDayObj = days.find(day => day.value === selectedDay);
    
    return (
      <View style={styles.pickerContainer}>
        <Text style={[styles.pickerLabel, { color: theme.text }]}>
          {t('selectDay')}
        </Text>
        <TouchableOpacity
          style={[styles.dropdownButton, { backgroundColor: theme.card }]}
          onPress={() => {
            setDayDropdownVisible(!dayDropdownVisible);
            setExerciseDropdownVisible(false); // Close other dropdown
          }}
        >
          <View style={styles.dropdownHeaderTextContainer}>
            <Ionicons name="calendar-outline" size={24} color={theme.text} style={{ marginRight: 10, }}/>
            <Text style={[styles.dropdownHeaderText, { color: theme.text }]}>
              {days.find(d => d.value === selectedDay)?.label || t('selectDay')}
            </Text>
          </View>
          <Ionicons
            name={dayDropdownVisible ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={theme.text}
            style={styles.dropdownIcon}
          />
        </TouchableOpacity>
        
        {dayDropdownVisible && days.length > 0 && (
          <View style={[styles.dropdownListContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {days.map((item) => (
              <TouchableOpacity
                key={item.value}
                style={[
                  styles.dropdownItem,
                  { backgroundColor: theme.card },
                  selectedDay === item.value && { backgroundColor: theme.buttonBackground }
                ]}
                onPress={() => {
                  setSelectedDay(item.value);
                  setDayDropdownVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.dropdownItemText,
                    { color: selectedDay === item.value ? theme.buttonText : theme.text }
                  ]}
                >
                  {item.label}
                </Text>
                {selectedDay === item.value && (
                  <Ionicons
                    name="checkmark"
                    size={18}
                    color={theme.buttonText}
                    style={styles.dropdownItemIcon}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  // Render exercise dropdown button - hide for Time mode
  const renderExerciseDropdown = () => {
    if (graphMode === 'Time' || graphMode === 'Overall') return null;
    
    const selectedExerciseObj = exercises.find(exercise => exercise.value === selectedExercise);
    
    return (
      <View style={styles.pickerContainer}>
        <Text style={[styles.pickerLabel, { color: theme.text }]}>
          {t('Select Exercise')}
        </Text>
        <TouchableOpacity
          style={[styles.dropdownButton, { backgroundColor: theme.card }]}
          onPress={() => {
            if (exercises.length > 0) {
              setExerciseDropdownVisible(!exerciseDropdownVisible);
              setDayDropdownVisible(false); // Close other dropdown
            }
          }}
          disabled={exercises.length === 0}
        >
          <View style={styles.dropdownHeaderTextContainer}>
            <Ionicons name="bicycle-outline" size={24} color={theme.text} style={{ marginRight: 10, }}/>
            <Text style={[
              styles.dropdownHeaderText,
              { color: exercises.length > 0 ? theme.text : theme.inactivetint }
            ]}>
              {exercises.find(e => e.value === selectedExercise)?.label || (exercises.length > 0 ? t('Select an exercise') : t('No exercises available'))}
            </Text>
          </View>
          {exercises.length > 0 && (
            <Ionicons
              name={exerciseDropdownVisible ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={theme.text}
              style={styles.dropdownIcon}
            />
          )}
        </TouchableOpacity>
        
        {exerciseDropdownVisible && exercises.length > 0 && (
          <View style={[styles.dropdownListContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {exercises.map((item) => (
              <TouchableOpacity
                key={item.value}
                style={[
                  styles.dropdownItem,
                  { backgroundColor: theme.card },
                  selectedExercise === item.value && { backgroundColor: theme.buttonBackground }
                ]}
                onPress={() => {
                  setSelectedExercise(item.value);
                  setExerciseDropdownVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.dropdownItemText,
                    { color: selectedExercise === item.value ? theme.buttonText : theme.text }
                  ]}
                >
                  {item.label}
                </Text>
                {selectedExercise === item.value && (
                  <Ionicons
                    name="checkmark"
                    size={18}
                    color={theme.buttonText}
                    style={styles.dropdownItemIcon}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };



  const renderGraphModeToggle = () => {
    return (
      <View style={styles.graphModeToggleContainer}>
        <TouchableOpacity
          style={[
            styles.graphModeButton,
            {
              backgroundColor:
                graphMode === 'Exercise'
                  ? theme.buttonBackground
                  : theme.card,
            },
          ]}
          onPress={() => setGraphMode('Exercise')}
        >
          <Ionicons
            name="bicycle-outline"
            size={18}
            style={{ marginRight: 6, marginTop: 1 }}
            color={graphMode === 'Exercise' ? theme.buttonText : theme.text}
          />
          <AutoSizeText
            fontSize={16}
            numberOfLines={2}
            mode={ResizeTextMode.max_lines}
            style={[styles.toggleTexticon, { color: graphMode === 'Exercise' ? theme.buttonText : theme.text }]}
          >
            {t('Exercise Stats')}
          </AutoSizeText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.graphModeButton,
            {
              backgroundColor:
                graphMode === 'Time' ? theme.buttonBackground : theme.card,
            },
          ]}
          onPress={() => setGraphMode('Time')}
        >
          <Ionicons
            name="barbell-outline"
            size={18}
            style={{ marginRight: 6, marginTop: 1 }}
            color={graphMode === 'Time' ? theme.buttonText : theme.text}
          />
          <AutoSizeText
            fontSize={16}
            numberOfLines={2}
            mode={ResizeTextMode.max_lines}
            style={[styles.toggleTexticon, { color: graphMode === 'Time' ? theme.buttonText : theme.text }]}
          >
            {t('Workout Stats')}
          </AutoSizeText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.graphModeButton,
            {
              backgroundColor:
                graphMode === 'Overall' ? theme.buttonBackground : theme.card,
            },
          ]}
          onPress={() => setGraphMode('Overall')}
        >
          <Ionicons
            name="podium"
            size={18}
            style={{ marginRight: 6, marginTop: 1 }}
            color={graphMode === 'Overall' ? theme.buttonText : theme.text}
          />
          <AutoSizeText
            fontSize={16}
            numberOfLines={2}
            mode={ResizeTextMode.max_lines}
            style={[styles.toggleTexticon, { color: graphMode === 'Overall' ? theme.buttonText : theme.text }]}
          >
            {t('Overall Stats')}
          </AutoSizeText>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.background }]}
      nestedScrollEnabled={true}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.titleContainer}>
        <Ionicons name="trending-up" size={30} color={theme.text} style={styles.titleIcon} />
        <Text style={[styles.title, { color: theme.text }]}>
          {t('myProgress')}
        </Text>
      </View>

      {isInitialLoading ? (
        <ActivityIndicator size="large" color={theme.buttonBackground} style={{ marginTop: 40 }}/>
      ) : allWorkouts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="analytics-outline" size={60} color={theme.text} style={{ opacity: 0.5 }} />
          <Text style={[styles.emptyText, { color: theme.text }]}>
            {t('No workout data available for graphs')}
          </Text>
          <Text style={[styles.emptySubText, { color: theme.text }]}>
            {t('Track a workout first to see your progress')}
          </Text>
        </View>
      ) : (
        <>
          {/* Metric Selection - Moved up to be available for all graph modes */}
          {(selectedExercise || (graphMode === 'Time' && selectedWorkout) || graphMode === 'Overall') && (
            <>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.text, textAlign: 'center' },
                ]}
              >
                {t('Metric')}
              </Text>
              {renderCalculationTypeToggle()}
            </>
          )}

          {/* Graph Area - Shown first when available */}
          {selectedExercise && graphMode === 'Exercise' && (
            <>
              {/* Graph Section */}
              <View style={styles.graphSection}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  {getChartTitle()}
                </Text>

                {isLoading ? (
                  <ActivityIndicator
                    size="large"
                    color={theme.buttonBackground}
                    style={styles.loader}
                  />
                ) : (
                  renderChart()
                )}

                {/* Info about calculation */}
                <View
                  style={[
                    styles.infoBox,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Text style={[styles.infoTitle, { color: theme.text }]}>
                    {getChartExplanation().title}
                  </Text>
                  <Text style={[styles.infoText, { color: theme.text }]}>
                    {getChartExplanation().text}
                  </Text>
                </View>
              </View>

              {/* Timeframe selector */}
              {calculationType !== 'MuscleDistribution' && renderTimeFrameButtons()}


            </>
          )}

          {/* Time mode graph section - Shown first when in time mode */}
          {graphMode === 'Time' && selectedWorkout && (
            <>
              {/* Graph Section */}
              <View style={styles.graphSection}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  {getChartTitle()}
                </Text>

                {isLoading ? (
                  <ActivityIndicator
                    size="large"
                    color={theme.buttonBackground}
                    style={styles.loader}
                  />
                ) : (
                  renderChart()
                )}

                {/* Info about calculation */}
                <View
                  style={[
                    styles.infoBox,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Text style={[styles.infoTitle, { color: theme.text }]}>
                    {getChartExplanation().title}
                  </Text>
                  <Text style={[styles.infoText, { color: theme.text }]}>
                    {getChartExplanation().text}
                  </Text>
                </View>
              </View>

              {/* Timeframe selector */}
              {calculationType !== 'MuscleDistribution' && renderTimeFrameButtons()}


            </>
          )}

          {/* Overall Stats mode section */}
          {graphMode === 'Overall' && (
            <>
              {/* Graph Section */}
              <View style={styles.graphSection}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  {getChartTitle()}
                </Text>

                {isLoading ? (
                  <ActivityIndicator
                    size="large"
                    color={theme.buttonBackground}
                    style={styles.loader}
                  />
                ) : (
                  renderChart()
                )}

                {/* Info about calculation */}
                <View
                  style={[
                    styles.infoBox,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Text style={[styles.infoTitle, { color: theme.text }]}>
                    {getChartExplanation().title}
                  </Text>
                  <Text style={[styles.infoText, { color: theme.text }]}>
                    {getChartExplanation().text}
                  </Text>
                </View>
              </View>
               {/* Timeframe selector */}
               {calculationType !== 'MuscleDistribution' && renderTimeFrameButtons()}
            </>
          )}

          {/* Selection Controls */}
          <Text
            style={[
              styles.sectionTitle,
              { color: theme.text, textAlign: 'center' },
            ]}
          >
            {t('Graph Type')}
          </Text>
          {renderGraphModeToggle()}

          {/* Workout Dropdown */}
          {graphMode !== 'Overall' && !(graphMode === 'Time' && calculationType === 'MuscleDistribution') && renderWorkoutDropdown()}


          {/* Exercise mode controls */}
          {selectedWorkout && graphMode === 'Exercise' && (
            <>
              {renderDayDropdown()}
              {selectedDay && renderExerciseDropdown()}
            </>
          )}

                        {/* Tip Text */}
              <Text style={[styles.tipText, { color: theme.text }]}>
                {t('graphTipText')}
              </Text>

          {/* View Logs Button */}
          <TouchableOpacity
            style={[styles.logsButton, { backgroundColor: theme.text }]}
            onPress={() => navigation.navigate('MyProgress')}
          >
            <Ionicons
              name="list-outline"
              size={20}
              color={theme.background}
              style={styles.logsButtonIcon}
            />
            <Text
              style={[
                styles.logsButtonText,
                { color: theme.background },
              ]}
            >
              {t('View Logs')}
            </Text>
          </TouchableOpacity>

          {/* Tooltip Modal */}
          {renderTooltip()}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    marginTop: 40,
  },
  titleIcon: {
    marginRight: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
  },
  logsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 20,
  },
  logsButtonIcon: {
    marginRight: 8,
  },
  logsButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginHorizontal: 5,
    marginVertical: 2,
  },
  toggleButtonActive: {
    elevation: 2,
  },
  toggleText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  timeToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginHorizontal: 5,
    marginVertical: 2,
  },

  
  toggleButtonActiveFix: {
    elevation: 2,
  },
  toggleTextFix: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginLeft: 6,
  },
  selectionContainer: {
    marginBottom: 20,
  },
  expandedSelectionContainer: {
    marginBottom: 20,
  },
  pickerContainer: {
    marginBottom: 15,
    zIndex: 1,
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  dropdownIcon: {
    marginLeft: 10,
  },
  dropdownListContainer: {
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 5,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    overflow: 'hidden',
  },
  dropdownList: {
    maxHeight: 200,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  dropdownItemActive: {
    backgroundColor: '#007AFF',
  },
  dropdownItemText: {
    fontSize: 16,
  },
  dropdownItemTextActive: {
    fontWeight: 'bold',
  },
  dropdownItemIcon: {
    marginLeft: 10,
  },
  graphSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  chartScrollContainer: {
    paddingHorizontal: 10,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  scrollHint: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 5,
    opacity: 0.7,
    fontStyle: 'italic',
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    height: 220,
  },
  noDataText: {
    marginTop: 10,
    fontSize: 16,
    textAlign: 'center',
  },
  infoBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 15,
    marginTop: 10,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  timeFrameContainer: {
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  timeFrameButton: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginVertical: 5,
    minWidth: '22%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timeFrameButtonActive: {
    elevation: 2,
  },
  timeFrameButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  timeFrameButtonTextActive: {
    fontWeight: 'bold',
  },
  loader: {
    height: 220,
    justifyContent: 'center',
  },
  inactivetint: {
    opacity: 0.5,
  },
  // Tooltip styles
  tooltipOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  tooltipContainer: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  tooltipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tooltipTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  tooltipSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
  },
  tooltipSetsList: {
    maxHeight: 300,
  },
  tooltipSetsHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  tooltipSetItem: {
    paddingVertical: 8,
  },
  tooltipSetText: {
    fontSize: 15,
  },
  tooltipDaySection: {
    marginBottom: 15,
  },
  tooltipDayHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    textDecorationLine: 'underline',
  },
  tooltipExerciseItem: {
    marginBottom: 10,
    paddingLeft: 5,
  },
  tooltipExerciseName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  // New styles for sets legend
  legendContainer: {
    marginTop: 15,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    marginVertical: 4,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 14,
  },
  setColorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  tipText: {
    textAlign: 'center',
    fontSize: 14,
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
  },
  emptySubText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
    opacity: 0.7,
  },
  graphModeToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  graphModeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  buttonIcon: {
    marginRight: 6,
    marginTop: 1,
  },
  toggleTexticon: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginLeft: 6,
  },
  dropdownContainer: {
    marginBottom: 15,
    zIndex: 1,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  dropdownHeaderTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownHeaderText: {
    fontSize: 16,
    fontWeight: '500',
  },
});