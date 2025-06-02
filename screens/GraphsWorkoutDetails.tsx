import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { LineChart } from 'react-native-chart-kit';
import { useSettings } from '../context/SettingsContext';

// Define the type for route params
type GraphsParamList = {
  GraphsWorkoutDetails: { workoutName: string };
};

type GraphsWorkoutDetailsRouteProp = RouteProp<GraphsParamList, 'GraphsWorkoutDetails'>;

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
};
type TimeFrame = 'week' | 'month' | 'year' | 'all';
type CalculationType = 'CES' | '1RM' | 'Sets';
type ProcessedDataPoint = {
  x: string; // Date string for display
  y: number; // Value (CES or 1RM)
  timestamp: number; // Raw timestamp for sorting
  originalData: LogData[]; // Store original data for tooltip
};

// Add new data structure for sets
type SetProgressData = {
  setNumber: number;
  data: ProcessedDataPoint[];
  color: string;
};

export default function GraphsWorkoutDetails() {
  const navigation = useNavigation();
  const route = useRoute<GraphsWorkoutDetailsRouteProp>();
  const { workoutName } = route.params;
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

  // State variables
  const [days, setDays] = useState<DayOption[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [exercises, setExercises] = useState<ExerciseOption[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('month');
  const [calculationType, setCalculationType] = useState<CalculationType>('CES');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [logData, setLogData] = useState<LogData[]>([]);
  const [chartData, setChartData] = useState<ProcessedDataPoint[]>([]);
  const [setsData, setSetsData] = useState<SetProgressData[]>([]);

  // Dropdown visibility state
  const [dayDropdownVisible, setDayDropdownVisible] = useState<boolean>(false);
  const [exerciseDropdownVisible, setExerciseDropdownVisible] = useState<boolean>(false);
  
  // Tooltip state
  const [tooltipVisible, setTooltipVisible] = useState<boolean>(false);
  const [selectedPoint, setSelectedPoint] = useState<ProcessedDataPoint | null>(null);

  // Fetch days for the selected workout
  useEffect(() => {
    fetchDays();
  }, [workoutName]);

  // Fetch exercises when day changes
  useEffect(() => {
    if (selectedDay) {
      fetchExercises();
    }
  }, [selectedDay]);

  // Fetch and process data when exercise, timeframe, or calculation type changes
  useEffect(() => {
    if (selectedExercise) {
      fetchData();
    }
  }, [selectedExercise, timeFrame, calculationType]);

  // Process log data into chart data
  useEffect(() => {
    if (logData.length > 0) {
      processDataForChart();
    }
  }, [logData, calculationType]);

  const fetchDays = async () => {
    try {
      const result = await db.getAllAsync<{ day_name: string }>(
        `SELECT DISTINCT day_name FROM Workout_Log 
         WHERE workout_name = ? 
         ORDER BY day_name ASC`,
        [workoutName]
      );
      
      const dayOptions = result.map(day => ({
        label: day.day_name,
        value: day.day_name
      }));
      
      setDays(dayOptions);
      
      if (dayOptions.length > 0) {
        setSelectedDay(dayOptions[0].value);
      }
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
        [workoutName, selectedDay]
      );
      
      const exerciseOptions = result.map(exercise => ({
        label: exercise.exercise_name,
        value: exercise.exercise_name
      }));
      
      setExercises(exerciseOptions);
      
      if (exerciseOptions.length > 0) {
        setSelectedExercise(exerciseOptions[0].value);
      } else {
        setSelectedExercise('');
      }
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
        [workoutName, selectedDay, selectedExercise, startTimestamp]
      );
      
      setLogData(result);
    } catch (error) {
      console.error('Error fetching log data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate CES (Combined Effort Score)
  const calculateCES = (sets: LogData[]): number => {
    return sets.reduce((total, set) => {
      const setScore = set.weight_logged * set.reps_logged * (1 + set.reps_logged / 30);
      return total + setScore;
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

  // Update processDataForChart to handle different calculation types
  const processDataForChart = () => {
    if (calculationType === 'Sets') {
      processDataForSetsChart();
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
    
    // Sort by timestamp and take only the last 10 points if there are more
    const sortedData = processedData
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-10);
    
    setChartData(sortedData);
  };

  const processDataForSetsChart = () => {
    // Group logs by date first
    const logsByDate = logData.reduce((acc, log) => {
      const date = log.date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(log);
      return acc;
    }, {} as Record<number, LogData[]>);

    // Get all unique set numbers across all dates
    const allSetNumbers = new Set<number>();
    logData.forEach(log => allSetNumbers.add(log.set_number));
    const maxSetNumber = Math.max(...Array.from(allSetNumbers));

    // Process data for each set
    const setsProgressData: SetProgressData[] = [];

    for (let setNum = 1; setNum <= maxSetNumber; setNum++) {
      const setData: ProcessedDataPoint[] = [];

      Object.entries(logsByDate).forEach(([dateStr, logs]) => {
        const date = new Date(parseInt(dateStr) * 1000);
        
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const formattedDate = dateFormat === 'mm-dd-yyyy'
          ? `${month}/${day}`
          : `${day}/${month}`;

        // Find the log for this specific set number
        const setLog = logs.find(log => log.set_number === setNum);
        
        if (setLog) {
          setData.push({
            x: formattedDate,
            y: setLog.weight_logged,
            timestamp: parseInt(dateStr),
            originalData: [setLog]
          });
        }
      });

      // Sort by timestamp and filter out empty data points
      const sortedSetData = setData
        .sort((a, b) => a.timestamp - b.timestamp)
        .filter(point => point.originalData.length > 0)
        .slice(-10);

      if (sortedSetData.length > 0) {
        setsProgressData.push({
          setNumber: setNum,
          data: sortedSetData,
          color: setColors[(setNum - 1) % setColors.length]
        });
      }
    }

    setSetsData(setsProgressData);
    
    // Also set chart data to the first set for compatibility with existing tooltip logic
    if (setsProgressData.length > 0) {
      setChartData(setsProgressData[0].data);
    }
  };

  const handleDataPointClick = (data: any) => {
    // Find the data point that was clicked
    if (data.index !== undefined && chartData[data.index]) {
      setSelectedPoint(chartData[data.index]);
      setTooltipVisible(true);
    }
  };

  const closeTooltip = () => {
    setTooltipVisible(false);
    setSelectedPoint(null);
  };

  // Update calculation type toggle to include Sets
  const renderCalculationTypeToggle = () => {
    return (
      <View style={styles.toggleContainer}>
        <TouchableOpacity 
          style={[
            styles.toggleButton, 
            calculationType === 'CES' && styles.toggleButtonActive,
            { backgroundColor: calculationType === 'CES' ? theme.buttonBackground : theme.card }
          ]}
          onPress={() => setCalculationType('CES')}
        >
          <Ionicons 
            name="fitness" 
            size={20} 
            color={calculationType === 'CES' ? theme.buttonText : theme.text} 
          />
          <Text style={[
            styles.toggleText, 
            { color: calculationType === 'CES' ? theme.buttonText : theme.text }
          ]}>
            {t('CES')}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.toggleButton, 
            calculationType === '1RM' && styles.toggleButtonActive,
            { backgroundColor: calculationType === '1RM' ? theme.buttonBackground : theme.card }
          ]}
          onPress={() => setCalculationType('1RM')}
        >
          <Ionicons 
            name="barbell" 
            size={20} 
            color={calculationType === '1RM' ? theme.buttonText : theme.text} 
          />
          <Text style={[
            styles.toggleText, 
            { color: calculationType === '1RM' ? theme.buttonText : theme.text }
          ]}>
            {t('1RM')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.toggleButton, 
            calculationType === 'Sets' && styles.toggleButtonActive,
            { backgroundColor: calculationType === 'Sets' ? theme.buttonBackground : theme.card }
          ]}
          onPress={() => setCalculationType('Sets')}
        >
          <Ionicons 
            name="analytics" 
            size={20} 
            color={calculationType === 'Sets' ? theme.buttonText : theme.text} 
          />
          <Text style={[
            styles.toggleText, 
            { color: calculationType === 'Sets' ? theme.buttonText : theme.text }
          ]}>
            {t('Sets')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Update chart rendering to handle different calculation types
  const renderChart = () => {
    if (calculationType === 'Sets') {
      return renderSetsChart();
    } else {
      return renderRegularChart();
    }
  };

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

    // Ensure dates are formatted according to user's preference
    const formattedChartData = chartData.map(point => {
      // Parse the date from timestamp
      const date = new Date(point.timestamp * 1000);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      
      // Format according to preference (short format for chart labels)
      const formattedDate = dateFormat === 'mm-dd-yyyy'
        ? `${month}/${day}`
        : `${day}/${month}`;
        
      return {
        ...point,
        x: formattedDate
      };
    });

    const data = {
      labels: formattedChartData.map(point => point.x),
      datasets: [
        {
          data: formattedChartData.map(point => point.y),
          color: (opacity = 1) => `rgba(0, 123, 255, ${opacity})`,
          strokeWidth: 2
        }
      ],
      legend: [calculationType === 'CES' ? 'Combined Effort Score' : t('Estimated 1RM')]
    };

    const chartConfig = {
      backgroundColor: theme.card,
      backgroundGradientFrom: theme.card,
      backgroundGradientTo: theme.card,
      decimalPlaces: 1,
      color: (opacity = 1) => `rgba(0, 123, 255, ${opacity})`,
      labelColor: (opacity = 1) => theme.text,
      style: {
        borderRadius: 16
      },
      propsForDots: {
        r: '6',
        strokeWidth: '2',
        stroke: '#ffa726'
      }
    };

    return (
      <View style={styles.chartContainer}>
        <LineChart
          data={data}
          width={screenWidth}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          verticalLabelRotation={30}
          onDataPointClick={handleDataPointClick}
        />
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

    // Get all unique dates from all sets
    const allDates = new Set<string>();
    setsData.forEach(setData => {
      setData.data.forEach(point => allDates.add(point.x));
    });
    const sortedDates = Array.from(allDates).sort();

    // Create datasets for each set
    const datasets = setsData.map(setData => {
      // Create data array that matches all dates, filling with null for missing dates
      const dataArray = sortedDates.map(date => {
        const point = setData.data.find(p => p.x === date);
        return point ? point.y : null;
      }).filter(val => val !== null) as number[];

      return {
        data: dataArray,
        color: (opacity = 1) => setData.color.replace('1)', `${opacity})`),
        strokeWidth: 2,
        withDots: true
      };
    });

    const data = {
      labels: sortedDates,
      datasets: datasets,
      legend: setsData.map(setData => `${t('Set')} ${setData.setNumber}`)
    };

    // Calculate dynamic height based on number of sets
    const dynamicHeight = Math.max(220, 180 + (setsData.length * 10));

    const chartConfig = {
      backgroundColor: theme.card,
      backgroundGradientFrom: theme.card,
      backgroundGradientTo: theme.card,
      decimalPlaces: 1,
      color: (opacity = 1) => `rgba(0, 123, 255, ${opacity})`,
      labelColor: (opacity = 1) => theme.text,
      style: {
        borderRadius: 16
      },
      propsForDots: {
        r: '4',
        strokeWidth: '2'
      }
    };

    return (
      <View style={styles.chartContainer}>
        <LineChart
          data={data}
          width={screenWidth}
          height={dynamicHeight}
          chartConfig={chartConfig}
          style={styles.chart}
          verticalLabelRotation={30}
          onDataPointClick={handleDataPointClick}
        />
        
        {/* Legend for sets */}
        <View style={[styles.legendContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.legendTitle, { color: theme.text }]}>
            {t('Sets Legend')}
          </Text>
          <View style={styles.legendItems}>
            {setsData.map(setData => (
              <View key={setData.setNumber} style={styles.legendItem}>
                <View 
                  style={[
                    styles.legendColor, 
                    { backgroundColor: setData.color }
                  ]} 
                />
                <Text style={[styles.legendText, { color: theme.text }]}>
                  {t('Set')} {setData.setNumber}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  // Render tooltip
  const renderTooltip = () => {
    if (!selectedPoint) return null;

    const formattedDate = formatDate(selectedPoint.timestamp);
    
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
                {selectedExercise} - {formattedDate}
              </Text>
              <TouchableOpacity onPress={closeTooltip}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.tooltipSubtitle, { color: theme.text }]}>
              {calculationType === 'CES' 
                ? `${t('CES')}: ${selectedPoint.y.toFixed(1)}`
                : calculationType === '1RM'
                ? `${t('1RM')}: ${formatWeight(selectedPoint.y)}`
                : `${t('Weight')}: ${formatWeight(selectedPoint.y)}`
              }
            </Text>
            
            <View style={styles.tooltipSetsList}>
              <Text style={[styles.tooltipSetsHeader, { color: theme.text }]}>
                {t('Sets')}:
              </Text>
              <FlatList
                data={selectedPoint.originalData}
                keyExtractor={(item, index) => `${item.logged_exercise_id}_${index}`}
                renderItem={({ item }) => (
                  <View style={styles.tooltipSetItem}>
                    <Text style={[styles.tooltipSetText, { color: theme.text }]}>
                      {t('Set')} {item.set_number}: {formatWeight(item.weight_logged)} × {item.reps_logged} {t('Reps')}
                    </Text>
                  </View>
                )}
              />
            </View>
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
                  borderColor: theme.border
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

  // Render day dropdown button
  const renderDayDropdown = () => {
    const selectedDayObj = days.find(day => day.value === selectedDay);
    
    return (
      <View style={styles.pickerContainer}>
        <Text style={[styles.pickerLabel, { color: theme.text }]}>
          {t('selectDay')}
        </Text>
        <TouchableOpacity
          style={[styles.dropdownButton, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={() => {
            setDayDropdownVisible(!dayDropdownVisible);
            setExerciseDropdownVisible(false); // Close other dropdown
          }}
        >
          <Text style={[styles.dropdownButtonText, { color: theme.text }]}>
            {selectedDayObj ? selectedDayObj.label : t('selectDay')}
          </Text>
          <Ionicons
            name={dayDropdownVisible ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={theme.text}
            style={styles.dropdownIcon}
          />
        </TouchableOpacity>
        
        {dayDropdownVisible && days.length > 0 && (
          <View style={[styles.dropdownListContainer, { borderColor: theme.border }]}>
            <FlatList
              data={days}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.dropdownItem,
                    selectedDay === item.value && styles.dropdownItemActive,
                    { backgroundColor: selectedDay === item.value ? theme.buttonBackground : theme.card }
                  ]}
                  onPress={() => {
                    setSelectedDay(item.value);
                    setDayDropdownVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      selectedDay === item.value && styles.dropdownItemTextActive,
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
              )}
              style={styles.dropdownList}
              nestedScrollEnabled={true}
            />
          </View>
        )}
      </View>
    );
  };

  // Render exercise dropdown button
  const renderExerciseDropdown = () => {
    const selectedExerciseObj = exercises.find(exercise => exercise.value === selectedExercise);
    
    return (
      <View style={styles.pickerContainer}>
        <Text style={[styles.pickerLabel, { color: theme.text }]}>
          {t('Select Exercise')}
        </Text>
        <TouchableOpacity
          style={[styles.dropdownButton, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={() => {
            if (exercises.length > 0) {
              setExerciseDropdownVisible(!exerciseDropdownVisible);
              setDayDropdownVisible(false); // Close other dropdown
            }
          }}
          disabled={exercises.length === 0}
        >
          <Text style={[
            styles.dropdownButtonText, 
            { color: exercises.length > 0 ? theme.text : theme.inactivetint }
          ]}>
            {selectedExerciseObj 
              ? selectedExerciseObj.label 
              : exercises.length > 0 
                ? t('Select an exercise') 
                : t('No exercises available')}
          </Text>
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
          <View style={[styles.dropdownListContainer, { borderColor: theme.border }]}>
            <FlatList
              data={exercises}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.dropdownItem,
                    selectedExercise === item.value && styles.dropdownItemActive,
                    { backgroundColor: selectedExercise === item.value ? theme.buttonBackground : theme.card }
                  ]}
                  onPress={() => {
                    setSelectedExercise(item.value);
                    setExerciseDropdownVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      selectedExercise === item.value && styles.dropdownItemTextActive,
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
              )}
              style={styles.dropdownList}
              nestedScrollEnabled={true}
            />
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.background }]}
      nestedScrollEnabled={true}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color={theme.text} />
      </TouchableOpacity>
      
      <Text style={[styles.title, { color: theme.text }]}>
        {workoutName}
      </Text>
      
      {/* Calculation Type Toggle */}
      {renderCalculationTypeToggle()}
      
      {/* Day and Exercise Selectors */}
      <View style={[styles.selectionContainer, (dayDropdownVisible || exerciseDropdownVisible) && styles.expandedSelectionContainer]}>
        {/* Custom dropdown selectors */}
        {renderDayDropdown()}
        {renderExerciseDropdown()}
      </View>
      
      {/* Graph Area */}
      <View style={styles.graphSection}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {calculationType === 'CES' 
            ? t('Combined Effort Score') 
            : calculationType === '1RM' 
            ? t('Estimated 1RM')
            : t('Weight Progression by Sets')}
        </Text>
        
        {isLoading ? (
          <ActivityIndicator size="large" color={theme.buttonBackground} style={styles.loader} />
        ) : (
          renderChart()
        )}
        
        {/* Info about calculation */}
        <View style={[styles.infoBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.infoTitle, { color: theme.text }]}>
            {calculationType === 'CES' 
              ? t('About CES') 
              : calculationType === '1RM' 
              ? t('About 1RM')
              : t('About Sets Progression')}
          </Text>
          <Text style={[styles.infoText, { color: theme.text }]}>
            {calculationType === 'CES' 
              ? t('CESExplanation')
              : calculationType === '1RM'
              ? t('1RMExplanation')
              : t('This graph shows the weight progression for each set position over time. Each line represents a different set number (Set 1, Set 2, etc.), allowing you to track how your performance changes throughout your workout sessions.')}
          </Text>
        </View>
      </View>
      
      {/* Timeframe selector */}
      {renderTimeFrameButtons()}
      
      {/* Tooltip Modal */}
      {renderTooltip()}
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
  backButton: {
    marginTop: 40,
    marginBottom: 10,
    padding: 8,
    width: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
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
    marginLeft: 5,
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
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 15,
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
  chart: {
    marginVertical: 8,
    borderRadius: 16,
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
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginVertical: 5,
    minWidth: '22%',
    alignItems: 'center',
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
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  tooltipSetText: {
    fontSize: 15,
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
});