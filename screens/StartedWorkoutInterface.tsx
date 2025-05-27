import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  TextInput,
  Alert,
  FlatList,
  Vibration,
  AppState,
  AppStateStatus,
  Platform,
  Switch,
  Modal
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useSQLiteContext } from 'expo-sqlite';
import { StartWorkoutStackParamList } from '../App';
import * as Notifications from 'expo-notifications';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettings } from '../context/SettingsContext';
import { loadRestTimerPreferences, saveRestTimerPreferences } from '../utils/restTimerUtils';

// Define AsyncStorage keys
const WORKOUT_TIMER_KEY = '@workout_timer';
const REST_TIMER_KEY = '@rest_timer';
const WORKOUT_STATE_KEY = '@workout_state';

type StartedWorkoutRouteProps = RouteProp<
  StartWorkoutStackParamList,
  'StartedWorkoutInterface'
>;

// Define interfaces for workout data
interface Exercise {
  exercise_name: string;
  sets: number;
  reps: number;
  logged_exercise_id: number;
}

interface ExerciseSet {
  exercise_name: string;
  exercise_id: number;
  set_number: number;
  total_sets: number;
  reps_goal: number;
  reps_done: number;
  weight: string;
  completed: boolean;
}

// Define workout states
type WorkoutStage = 'overview' | 'exercise' | 'rest' | 'completed';

export default function StartedWorkoutInterface() {
  const navigation = useNavigation();
  const route = useRoute<StartedWorkoutRouteProps>();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const db = useSQLiteContext();
  const { notificationPermissionGranted, requestNotificationPermission, weightFormat, setWeightFormat } = useSettings();
  
  const { workout_log_id } = route.params;
  
  // States for workout data
  const [loading, setLoading] = useState(true);
  const [workout, setWorkout] = useState<{
    workout_name: string;
    workout_date: number;
    day_name: string;
  } | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  
  // Workout flow states
  const [workoutStage, setWorkoutStage] = useState<WorkoutStage>('overview');
  const [restTime, setRestTime] = useState('30');
  const [exerciseRestTime, setExerciseRestTime] = useState('60'); // New state for between-exercise rest time
  const [workoutStarted, setWorkoutStarted] = useState(false);
  const [isExerciseListModalVisible, setIsExerciseListModalVisible] = useState(false);
  const [isExerciseRest, setIsExerciseRest] = useState(false); // Flag to track if current rest is between exercises
  
  // User preference toggles
  const [enableVibration, setEnableVibration] = useState(true);
  const [enableNotifications, setEnableNotifications] = useState(false);
  
  // Update enableNotifications only if permission is granted and user hasn't manually set it
  useEffect(() => {
    // Only set to true if permission is granted, never auto-enable
    if (notificationPermissionGranted && !enableNotifications) {
      // Optional: enable notifications by default if permission is granted
      // Comment this line to require explicit user toggling
      // setEnableNotifications(true);
    }
  }, [notificationPermissionGranted]);
  
  // Sets data for tracking workout
  const [allSets, setAllSets] = useState<ExerciseSet[]>([]);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  
  // Timer states
  const [workoutTime, setWorkoutTime] = useState(0);
  const [restTimeRemaining, setRestTimeRemaining] = useState(0);
  const [timerStartTime, setTimerStartTime] = useState<number | null>(null);
  const [restTimerStartTime, setRestTimerStartTime] = useState<number | null>(null);
  const workoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const restTimerRef = useRef<NodeJS.Timeout | null>(null);
  const appState = useRef(AppState.currentState);
  const [appStateVisible, setAppStateVisible] = useState(appState.current);
  
  // Load rest timer preferences when component mounts
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const preferences = await loadRestTimerPreferences();
        setRestTime(preferences.restTimeBetweenSets);
        setExerciseRestTime(preferences.restTimeBetweenExercises);
      } catch (error) {
        console.error('Error loading rest timer preferences:', error);
      }
    };
    
    loadPreferences();
  }, []);

  // Setup notification handling for background timer completion
  useEffect(() => {
    // Configure notifications for timers
    const configureNotifications = async () => {
      await Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true, // Don't show popup alert
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });
    };
    
    // Keep the app awake while workout is in progress
    if (workoutStarted) {
      activateKeepAwakeAsync();
      configureNotifications(); // Configure notifications when workout starts
    }
    
    return () => {
      deactivateKeepAwake();
      
      // Clean up stored timer states
      AsyncStorage.multiRemove([WORKOUT_TIMER_KEY, REST_TIMER_KEY, WORKOUT_STATE_KEY])
        .catch(err => console.error("Error cleaning up stored timer states:", err));
    };
  }, [workoutStarted]);

   // Handle back press and gestures when workout is started
   useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // If workout hasn't started, or it's already completed, allow navigation
      if (!workoutStarted || workoutStage === 'completed') {
        return;
      }

      // Prevent default behavior of leaving the screen
      e.preventDefault();

      // Show confirmation alert
      Alert.alert(
        t('exitWorkout'),
        t('exitWorkoutMessage'),
        [
          { text: t('Cancel'), style: 'cancel', onPress: () => {} },
          {
            text: t('exit'),
            style: 'destructive',
            // If the user confirms, dispatch the action that initiated the go back.
            onPress: () => navigation.dispatch(e.data.action),
          },
        ]
      );
    });

    return unsubscribe;
  }, [navigation, workoutStarted, workoutStage, t]); // Added t to dependencies for Alert messages
  
  // Handle AppState changes to manage timers in background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/active/) && nextAppState.match(/inactive|background/)) {
        // App is going to background
        if (workoutStarted && workoutStage !== 'completed' && enableNotifications) {
          Notifications.scheduleNotificationAsync({
            content: {
              title: t("Workout in Progress"),
              body: t("Workout in Progress Message"),
              priority: 'min',
              data: { 
                startTime: timerStartTime,
                type: 'workout_timer'
              },
            },
            trigger: null,
          });
          // Store workout timer state
          if (timerStartTime) {
            AsyncStorage.setItem(WORKOUT_TIMER_KEY, JSON.stringify({
              startTime: timerStartTime,
              workoutTime: workoutTime,
              timestamp: Date.now()
            }));
          }
          
          // Store rest timer state if in rest stage
          if (workoutStage === 'rest' && restTimerStartTime) {
            AsyncStorage.setItem(REST_TIMER_KEY, JSON.stringify({
              startTime: restTimerStartTime,
              restTimeRemaining: restTimeRemaining,
              isExerciseRest: isExerciseRest,
              timestamp: Date.now()
            }));
          }
          
          // Store workout state
          AsyncStorage.setItem(WORKOUT_STATE_KEY, JSON.stringify({
            workoutStage,
            currentSetIndex,
            isExerciseRest
          }));
        }
      } else if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground
        if (workoutStarted) {
          // Clean up any existing notifications
          Notifications.dismissAllNotificationsAsync().catch(err => 
            console.error("Error dismissing notifications:", err)
          );

          // Restore workout timer state
          AsyncStorage.getItem(WORKOUT_TIMER_KEY).then(storedWorkoutTimer => {
            if (storedWorkoutTimer) {
              const { startTime, workoutTime: storedWorkoutTime, timestamp } = JSON.parse(storedWorkoutTimer);
              const now = Date.now();
              const additionalSeconds = Math.floor((now - timestamp) / 1000);
              setWorkoutTime(storedWorkoutTime + additionalSeconds);
              setTimerStartTime(startTime);
              stopWorkoutTimer();
              startWorkoutTimer();
            }
          });
          
          // Restore rest timer state if needed
          AsyncStorage.getItem(REST_TIMER_KEY).then(storedRestTimer => {
            if (storedRestTimer && workoutStage === 'rest') {
              const { startTime, restTimeRemaining: storedRestTime, isExerciseRest: storedIsExerciseRest, timestamp } = JSON.parse(storedRestTimer);
              const now = Date.now();
              const elapsedSeconds = Math.floor((now - timestamp) / 1000);
              const newRestTime = Math.max(0, storedRestTime - elapsedSeconds);
              
              setRestTimeRemaining(newRestTime);
              setRestTimerStartTime(startTime);
              setIsExerciseRest(storedIsExerciseRest);
              
              if (newRestTime <= 0) {
                // Rest time has already completed while in background
                stopRestTimer();
                setCurrentSetIndex(currentSetIndex + 1);
                setWorkoutStage('exercise');
                setIsExerciseRest(false);
                if (enableVibration) {
                  Vibration.vibrate([500, 300, 500]);
                }
              } else {
                // Continue rest timer
                stopRestTimer();
                startRestTimer(newRestTime);
              }
            }
          });
          
          // Clean up stored timer states
          AsyncStorage.multiRemove([WORKOUT_TIMER_KEY, REST_TIMER_KEY, WORKOUT_STATE_KEY]);
        }
      }
      
      appState.current = nextAppState;
      setAppStateVisible(nextAppState);
    });
    
    return () => {
      subscription.remove();
      // Clean up any notifications when component unmounts
      Notifications.dismissAllNotificationsAsync().catch(err => 
        console.error("Error dismissing notifications:", err)
      );
    };
  }, [workoutStarted, timerStartTime, restTimerStartTime, workoutStage, currentSetIndex, restTime, exerciseRestTime, allSets, workout, enableNotifications, enableVibration, isExerciseRest, t]);
  
  useEffect(() => {
    // Check if completion_time column exists, add it if not
    checkAndAddCompletionTimeColumn();
    fetchWorkoutDetails();
    
    return () => {
      // Clean up resources
      stopWorkoutTimer();
      stopRestTimer();
      deactivateKeepAwake();
      
      // Clean up any stored timer states
      AsyncStorage.multiRemove([WORKOUT_TIMER_KEY, REST_TIMER_KEY, WORKOUT_STATE_KEY])
        .catch(err => console.error("Error cleaning up stored timer states:", err));
    };
  }, []);
  
  // Function to check and add completion_time column if needed
  const checkAndAddCompletionTimeColumn = async () => {
    try {
      // Try to check if the column exists
      await db.runAsync(`
        ALTER TABLE Workout_Log ADD COLUMN completion_time INTEGER;
      `).catch(error => {
        // Column might already exist, ignore error
        console.log('Column might already exist, continuing execution');
      });
    } catch (error) {
      console.error('Error checking or adding completion_time column:', error);
    }
  };
  
  const fetchWorkoutDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch workout details
      const workoutResult = await db.getAllAsync<{
        workout_name: string;
        workout_date: number;
        day_name: string;
      }>(
        `SELECT workout_name, workout_date, day_name 
         FROM Workout_Log 
         WHERE workout_log_id = ?;`,
        [workout_log_id]
      );
      
      if (workoutResult.length > 0) {
        setWorkout(workoutResult[0]);
        
        // Fetch exercises for this workout
        const exercisesResult = await db.getAllAsync<Exercise>(
          `SELECT exercise_name, sets, reps, logged_exercise_id 
           FROM Logged_Exercises 
           WHERE workout_log_id = ?;`,
          [workout_log_id]
        );
        
        setExercises(exercisesResult);
        
        // Prepare all sets data structure
        const setsData: ExerciseSet[] = [];
        exercisesResult.forEach(exercise => {
          for (let i = 1; i <= exercise.sets; i++) {
            setsData.push({
              exercise_name: exercise.exercise_name,
              exercise_id: exercise.logged_exercise_id,
              set_number: i,
              total_sets: exercise.sets,
              reps_goal: exercise.reps,
              reps_done: 0,
              weight: '',
              completed: false
            });
          }
        });
        
        setAllSets(setsData);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching workout details:', error);
      setLoading(false);
    }
  };
  
  // Timer functions
  const startWorkoutTimer = () => {
    setTimerStartTime(Date.now() - (workoutTime * 1000)); // Account for existing time
    workoutTimerRef.current = setInterval(() => {
      setWorkoutTime(prevTime => prevTime + 1);
    }, 1000);
  };
  
  const stopWorkoutTimer = () => {
    if (workoutTimerRef.current) {
      clearInterval(workoutTimerRef.current);
      workoutTimerRef.current = null;
    }
  };
  
  const startRestTimer = (seconds: number) => {
    setRestTimeRemaining(seconds);
    setRestTimerStartTime(Date.now());
    restTimerRef.current = setInterval(() => {
      setRestTimeRemaining(prevTime => {
        if (prevTime <= 1) {
          stopRestTimer();
          setCurrentSetIndex(currentSetIndex + 1);
          setWorkoutStage('exercise');
          setIsExerciseRest(false);
          
          // Vibrate only if enabled
          if (enableVibration) {
            Vibration.vibrate([500, 300, 500]);
          }
          
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
  };
  
  const stopRestTimer = () => {
    if (restTimerRef.current) {
      clearInterval(restTimerRef.current);
      restTimerRef.current = null;
    }
    setRestTimerStartTime(null);
  };
  
  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };
  
  // Workout flow functions
  const startWorkout = async () => {
    // Validate rest time
    const setRestSeconds = parseInt(restTime);
    const exerciseRestSeconds = parseInt(exerciseRestTime);
    
    if (isNaN(setRestSeconds) || setRestSeconds < 0) {
      Alert.alert(t('invalidRestTime'), t('pleaseEnterValidSeconds'));
      return;
    }
    
    if (isNaN(exerciseRestSeconds) || exerciseRestSeconds < 0) {
      Alert.alert(t('invalidExerciseRestTime'), t('pleaseEnterValidSeconds'));
      return;
    }

    // Save rest timer preferences when starting workout
    try {
      await saveRestTimerPreferences({
        restTimeBetweenSets: restTime,
        restTimeBetweenExercises: exerciseRestTime
      });
    } catch (error) {
      console.error('Error saving rest timer preferences:', error);
      // Continue with workout even if save fails
    }
    
    setWorkoutStarted(true);
    setWorkoutStage('exercise');
    startWorkoutTimer();
  };
  
  // Handle notification toggle with permission check
  const handleNotificationToggle = async () => {
    if (!enableNotifications) {
      // User is trying to enable notifications
      if (!notificationPermissionGranted) {
        // Permission not granted, navigate to settings
        Alert.alert(
          t('Permission Required'),
          t('Notification permission is required. Please enable notifications in the Settings page.'),
          [
            { text: t('Cancel'), style: 'cancel' },
            { 
              text: t('Go to Settings'), 
              onPress: () => navigation.navigate('Settings' as never),
              style: 'default' 
            },
          ]
        );
        return;
      }
      
      // Permission already granted, enable notifications
      setEnableNotifications(true);
    } else {
      // User is turning off notifications - simply disable
      setEnableNotifications(false);
    }
  };
  
  // Determine if the next set is for a different exercise
  const isDifferentExercise = (currentIndex: number, nextIndex: number): boolean => {
    if (nextIndex >= allSets.length) return false;
    return allSets[currentIndex].exercise_name !== allSets[nextIndex].exercise_name;
  };
  
  // Render functions for different workout stages
  const renderOverview = () => {
    return (
      <View style={styles.overviewContainer}>
        <View style={[styles.workoutHeaderCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.workoutName, { color: theme.text }]}>{workout?.workout_name}</Text>
          <Text style={[styles.workoutDay, { color: theme.text }]}>{workout?.day_name}</Text>
          <View style={styles.workoutStats}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.text }]}>{exercises.length}</Text>
              <Text style={[styles.statLabel, { color: theme.text }]}>{t('exercises')}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {allSets.length}
              </Text>
              <Text style={[styles.statLabel, { color: theme.text }]}>{t('totalSets')}</Text>
            </View>
          </View>
        </View>
        
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('exercises')}</Text>
        <FlatList
          data={exercises}
          keyExtractor={(item) => item.logged_exercise_id.toString()}
          renderItem={({ item }) => (
            <View style={[styles.exerciseItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.exerciseName, { color: theme.text }]}>{item.exercise_name}</Text>
              <Text style={[styles.exerciseDetails, { color: theme.text }]}>
                {item.sets} {t('Sets')} × {item.reps} {t('Reps')}
              </Text>
            </View>
          )}
          scrollEnabled={false}
          style={styles.exercisesList}
        />
        
        <View style={styles.setupSection}>
          <Text style={[styles.setupLabel, { color: theme.text }]}>{t('restTimeBetweenSets')}:</Text>
          <TextInput
            style={[styles.restTimeInput, { 
              backgroundColor: theme.card,
              color: theme.text,
              borderColor: theme.border
            }]}
            value={restTime}
            onChangeText={setRestTime}
            keyboardType="number-pad"
            maxLength={3}
            placeholderTextColor={theme.type === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'}
          />
          
          <Text style={[styles.setupLabel, { color: theme.text }]}>{t('restTimeBetweenExercises')}:</Text>
          <TextInput
            style={[styles.restTimeInput, { 
              backgroundColor: theme.card,
              color: theme.text,
              borderColor: theme.border
            }]}
            value={exerciseRestTime}
            onChangeText={setExerciseRestTime}
            keyboardType="number-pad"
            maxLength={3}
            placeholderTextColor={theme.type === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'}
          />
          
          {/* Toggle switches for user preferences */}
          <Text style={[styles.setupLabel, { color: theme.text, marginTop: 15 }]}>{t('workoutSettings')}:</Text>
          
          <View style={[styles.toggleRow, { 
            backgroundColor: theme.type === 'dark' ? '#121212' : '#f0f0f0',
            borderColor: theme.type === 'dark' ? '#000000' : '#e0e0e0'
          }]}>
            <Text style={[styles.toggleText, { color: theme.text }]}>{t('vibration')}</Text>
            <Switch
              value={enableVibration}
              onValueChange={setEnableVibration}
              trackColor={{ false: theme.type === 'dark' ? '#444' : '#ccc', true: theme.buttonBackground }}
              thumbColor={enableVibration ? (theme.type === 'dark' ? '#fff' : '#fff') : (theme.type === 'dark' ? '#888' : '#f4f3f4')}
            />
          </View>
          
          <View style={[styles.toggleRow, { 
            backgroundColor: theme.type === 'dark' ? '#121212' : '#f0f0f0',
            borderColor: theme.type === 'dark' ? '#000000' : '#e0e0e0'
          }]}>
            <Text style={[styles.toggleText, { color: theme.text }]}>{t('notifications')}</Text>
            <Switch
              value={enableNotifications}
              onValueChange={() => handleNotificationToggle()}
              trackColor={{ false: theme.type === 'dark' ? '#444' : '#ccc', true: theme.buttonBackground }}
              thumbColor={enableNotifications ? (theme.type === 'dark' ? '#fff' : '#fff') : (theme.type === 'dark' ? '#888' : '#f4f3f4')}
            />
          </View>
          
          <TouchableOpacity
            style={[styles.startButton, { backgroundColor: theme.buttonBackground }]}
            onPress={startWorkout}
          >
            <Ionicons name="play" size={20} color={theme.buttonText} style={styles.buttonIcon} />
            <Text style={[styles.buttonText, { color: theme.buttonText }]}>{t('startWorkout')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  
  const renderExerciseScreen = () => {
    const currentSet = allSets[currentSetIndex];
    if (!currentSet) return null;
    
    const isLastSet = currentSetIndex === allSets.length - 1;
    
    return (
      <View style={styles.exerciseScreenContainer}>
        {/* Main timer display */}
        <View style={[styles.timerDisplay, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.timerLabel, { color: theme.text }]}>{t('workoutTime')}</Text>
          <Text style={[styles.workoutTimerText, { color: theme.text }]}>
            {formatTime(workoutTime)}
          </Text>
        </View>
        
        {/* Exercise information */}
        <View style={[styles.currentExerciseCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.currentExerciseName, { color: theme.text }]}>
            {currentSet.exercise_name}
          </Text>
          <Text style={[styles.setInfo, { color: theme.text }]}>
           {currentSet.set_number}/{currentSet.total_sets}
          </Text>
          <Text style={[styles.repInfo, { color: theme.text }]}>
            {t('goal')}: {currentSet.reps_goal} {t('Reps')}
          </Text>
          
          {/* Input fields for tracking */}
          <View style={styles.inputContainer}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>{t('repsDone')}</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.card,
                  color: theme.text,
                  borderColor: theme.border
                }]}
                value={currentSet.reps_done.toString() || ''}
                onChangeText={(text) => {
                  const reps = text === '' ? 0 : parseInt(text);
                  if (isNaN(reps)) return;
                  
                  const updatedSets = [...allSets];
                  updatedSets[currentSetIndex] = {
                    ...updatedSets[currentSetIndex],
                    reps_done: reps
                  };
                  setAllSets(updatedSets);
                }}
                keyboardType="number-pad"
                maxLength={3}
                placeholderTextColor={theme.type === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.text }]}> {t('Weight')} ({weightFormat})</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.card,
                  color: theme.text,
                  borderColor: theme.border
                }]}
                value={currentSet.weight}
                onChangeText={(text) => {
                  const updatedSets = [...allSets];
                  updatedSets[currentSetIndex] = {
                    ...updatedSets[currentSetIndex],
                    weight: text
                  };
                  setAllSets(updatedSets);
                }}
                keyboardType="decimal-pad"
                placeholder="0.0"
                placeholderTextColor={theme.type === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'}
              />
            </View>
          </View>
        </View>
        
        {/* Controls */}
        <View style={styles.controlsContainer}>
          <TouchableOpacity
            style={[styles.completeButton, { 
              backgroundColor: 
                allSets[currentSetIndex].reps_done <= 0 || 
                allSets[currentSetIndex].weight === '' 
                  ? theme.inactivetint 
                  : theme.buttonBackground
            }]}
            onPress={() => {
              if (
                allSets[currentSetIndex].reps_done <= 0 || 
                allSets[currentSetIndex].weight === ''
              ) {
                Alert.alert(t('missingInformation'), t('enterRepsAndWeight'));
                return;
              }
              
              // Mark current set as completed
              const updatedSets = [...allSets];
              updatedSets[currentSetIndex] = {
                ...updatedSets[currentSetIndex],
                completed: true
              };
              setAllSets(updatedSets);
              
              if (isLastSet) {
                // This is the last set, finish the workout
                setWorkoutStage('completed');
                stopWorkoutTimer();
              } else {
                // Check if next set is for a different exercise
                const nextSetIndex = currentSetIndex + 1;
                const differentExercise = isDifferentExercise(currentSetIndex, nextSetIndex);
                
                // Move to rest period before next set
                setWorkoutStage('rest');
                setIsExerciseRest(differentExercise);
                
                // Use appropriate rest time based on whether we're changing exercises
                const restSeconds = differentExercise 
                  ? parseInt(exerciseRestTime) 
                  : parseInt(restTime);
                
                startRestTimer(restSeconds);
              }
            }}
            disabled={allSets[currentSetIndex].reps_done <= 0 || allSets[currentSetIndex].weight === ''}
          >
            <Text style={[styles.buttonText, { color: theme.buttonText }]}>
              {isLastSet ? t('finishWorkout') : t('completeSet')}
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Progress indicator */}
        <View style={styles.progressContainer}>
          <Text style={[styles.progressText, { color: theme.text }]}>
          %{Math.round(((currentSetIndex + 1) / allSets.length) * 100)}
          </Text>
          <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  backgroundColor: theme.buttonBackground,
                  width: `${((currentSetIndex + 1) / allSets.length) * 100}%`
                }
              ]} 
            />
          </View>
        </View>
      </View>
    );
  };
  
  const renderRestScreen = () => {
    const nextSet = currentSetIndex + 1 < allSets.length 
      ? allSets[currentSetIndex + 1] 
      : null;
    
    return (
      <View style={styles.restScreenContainer}>
        <View style={[styles.restCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.restTitle, { color: theme.text }]}>{t('restTime')}</Text>
          
          <View style={styles.restTimerContainer}>
            <Text style={[styles.restTimerText, { color: theme.text }]}>
              {restTimeRemaining}
            </Text>
            <Text style={[styles.restTimerUnit, { color: theme.text }]}>{t('sec')}</Text>
          </View>
          
          <TouchableOpacity
            style={[styles.addTimeButton, { backgroundColor: theme.type === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.2)' }]}
            onPress={() => setRestTimeRemaining(prev => prev + 15)}
          >
            <Text style={[styles.addTimeButtonText, { color: theme.text }]}>{t('addTime')}</Text>
          </TouchableOpacity>
          
          <Text style={[styles.restMessage, { color: theme.text }]}>
            {t('takeBreath')}
          </Text>
        </View>
        
        {nextSet && (
          <View style={[styles.upNextCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.upNextLabel, { color: theme.text }]}>{t('upNext')}</Text>
            <Text style={[styles.upNextExercise, { color: theme.text }]}>
              {nextSet.exercise_name}
            </Text>
            <Text style={[styles.upNextSetInfo, { color: theme.text }]}>
              {t('upcomingSet')}: {nextSet.set_number}
            </Text>
          </View>
        )}
        
        <TouchableOpacity
          style={[styles.skipRestButton, { backgroundColor: theme.buttonBackground }]}
          onPress={() => {
            stopRestTimer();
            setCurrentSetIndex(currentSetIndex + 1);
            setWorkoutStage('exercise');
            setIsExerciseRest(false);
          }}
        >
          <Text style={[styles.buttonText, { color: theme.buttonText }]}>{t('skipRest')}</Text>
        </TouchableOpacity>
      </View>
    );
  };
  
  const renderCompletedScreen = () => {
    // Filter only completed sets with data
    const completedSets = allSets.filter(set => set.completed);
    
    const saveWorkout = async () => {
      try {
        console.log('Starting workout save process...');
        
        // Start a transaction
        await db.runAsync('BEGIN TRANSACTION;');
        
        // Update Workout_Log with completion time
        console.log('Saving completion time to Workout_Log:', workoutTime);
        await db.runAsync(
          `UPDATE Workout_Log 
           SET completion_time = ? 
           WHERE workout_log_id = ?;`,
          [workoutTime, workout_log_id]
        );
        
        // For each completed set, save to Weight_Log
        console.log('Saving completed sets:', completedSets.length);
        for (let i = 0; i < completedSets.length; i++) {
          const set = completedSets[i];
          await db.runAsync(
            `INSERT INTO Weight_Log (
              workout_log_id, 
              logged_exercise_id, 
              exercise_name, 
              set_number, 
              weight_logged, 
              reps_logged
            ) VALUES (?, ?, ?, ?, ?, ?);`,
            [
              workout_log_id,
              set.exercise_id,
              set.exercise_name,
              set.set_number,
              parseFloat(set.weight),
              set.reps_done
            ]
          );
        }
        
        // Commit transaction
        await db.runAsync('COMMIT;');
        console.log('Workout save completed successfully!');
        
        Alert.alert(
          t('workoutSaved'),
          t('workoutSavedMessage'),
          [{ text: t('OK'), onPress: () => navigation.goBack() }]
        );
      } catch (error) {
        // If there's an error, rollback the transaction
        await db.runAsync('ROLLBACK;');
        console.error('Error saving workout:', error);
        Alert.alert(
          'Error',
          'There was an error saving your workout. Please try again.'
        );
      }
    };
    
    return (
      <View style={styles.completedContainer}>
        <Ionicons name="checkmark-circle" size={80} color={theme.buttonBackground} style={styles.completedIcon} />
        
        <Text style={[styles.completedTitle, { color: theme.text }]}>{t('workoutCompleted')}</Text>
        
        <View style={[styles.completedCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.completedWorkoutName, { color: theme.text }]}>
            {workout?.workout_name}
          </Text>
          
          <View style={styles.completedStats}>
            <View style={styles.completedStatItem}>
              <Text style={[styles.completedStatValue, { color: theme.text }]}>
                {formatTime(workoutTime)}
              </Text>
              <Text style={[styles.completedStatLabel, { color: theme.text }]}>{t('totalTime')}</Text>
            </View>
            
            <View style={styles.completedStatItem}>
              <Text style={[styles.completedStatValue, { color: theme.text }]}>
                {completedSets.length}
              </Text>
              <Text style={[styles.completedStatLabel, { color: theme.text }]}>{t('setsCompleted')}</Text>
            </View>
          </View>
        </View>
        
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: theme.buttonBackground }]}
          onPress={saveWorkout}
        >
          <Text style={[styles.buttonText, { color: theme.buttonText }]}>
            {t('completeWorkout')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };
  
  const renderExerciseListModal = () => {
    const currentExerciseNameFromSet = allSets[currentSetIndex]?.exercise_name;

    return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={isExerciseListModalVisible}
        onRequestClose={() => {
          setIsExerciseListModalVisible(false);
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPressOut={() => setIsExerciseListModalVisible(false)}
        >
          <View 
            style={[styles.modalContainer, { backgroundColor: theme.card, borderColor: theme.border }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>{workout?.day_name }</Text>
              <TouchableOpacity onPress={() => setIsExerciseListModalVisible(false)} style={styles.modalCloseButton}>
                <Ionicons name="close-outline" size={28} color={theme.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={exercises}
              keyExtractor={(item) => item.logged_exercise_id.toString()}
              renderItem={({ item }) => {
                const isCurrent = item.exercise_name === currentExerciseNameFromSet;
                const itemStyle = [
                  styles.modalExerciseItem,
                  { borderColor: theme.border },
                  isCurrent
                    ? { 
                        backgroundColor: theme.buttonBackground,
                      }
                    : { backgroundColor: theme.card }
                ];
                const nameStyle = [
                  styles.modalExerciseName,
                  isCurrent
                    ? { color: theme.buttonText }
                    : { color: theme.text }
                ];
                const detailStyle = [
                  styles.modalExerciseDetails,
                  isCurrent
                    ? { color: theme.buttonText }
                    : { color: theme.text }
                ];

                return (
                  <View style={itemStyle}>
                    <Text style={nameStyle}>{item.exercise_name}</Text>
                    <Text style={detailStyle}>
                      {item.sets} {t('Sets')} × {item.reps} {t('Reps')}
                    </Text>
                  </View>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };
  
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.text} />
        <Text style={[styles.loadingText, { color: theme.text }]}>{t('loadingWorkout')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            navigation.goBack();
          }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>
          {workoutStarted ? (workout ? `${workout.workout_name} - ${workout.day_name}` : 'Workout') : t("startWorkout")}
        </Text>
        {workoutStarted ? (
          <TouchableOpacity 
            onPress={() => setIsExerciseListModalVisible(true)} 
            style={styles.headerListIcon}
          >
            <Ionicons name="reorder-three-outline" size={23} color={theme.text} />
          </TouchableOpacity>
        ) : (
          // Placeholder to balance the backButton for centering the title when workout has not started
          // The width is calculated based on the help icon's size (23) and its TouchableOpacity padding (styles.headerListIcon.padding * 2)
          // styles.headerListIcon = { padding: 5, marginLeft: 15 }, so padding is 5.
          // Width = 23 + (5 * 2) = 33. marginLeft is 15.
          <View style={{ width: 23 + (styles.headerListIcon.padding * 2), marginLeft: styles.headerListIcon.marginLeft }} />
        )}
      </View>
      
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={[
          styles.scrollContent,
          // Adjust styling based on stage
          workoutStage === 'rest' && styles.restScrollContent
        ]}
      >
        {workoutStage === 'overview' && renderOverview()}
        {workoutStage === 'exercise' && renderExerciseScreen()}
        {workoutStage === 'rest' && renderRestScreen()}
        {workoutStage === 'completed' && renderCompletedScreen()}
      </ScrollView>
      {renderExerciseListModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    padding: 5,
    marginRight: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  headerListIcon: {
    padding: 5,
    marginLeft: 15,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  restScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    justifyContent: 'center',
    flex: 1
  },
  
  // Toggle styles
  toggleRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 10, 
    paddingHorizontal: 15, 
    borderRadius: 8, 
    borderWidth: 1, 
    marginBottom: 10 
  },
  toggleText: { 
    fontSize: 16, 
    fontWeight: '600' 
  },
  
  // Overview screen styles
  overviewContainer: {
    width: '100%',
  },
  workoutHeaderCard: {
    borderRadius: 15,
    borderWidth: 1,
    padding: 20,
    marginBottom: 25,
    alignItems: 'center',
  },
  workoutName: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  workoutDay: {
    fontSize: 18,
    marginBottom: 15,
    textAlign: 'center',
  },
  workoutStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 10,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
    marginTop: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  exercisesList: {
    marginBottom: 20,
  },
  exerciseItem: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 15,
    marginBottom: 10,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  exerciseDetails: {
    fontSize: 14,
  },
  setupSection: {
    marginTop: 15,
    marginBottom: 20,
  },
  setupLabel: {
    fontSize: 16,
    marginBottom: 10,
  },
  restTimeInput: {
    height: 50,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 18,
    marginBottom: 15,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    paddingVertical: 15,
    marginTop: 10,
  },
  buttonIcon: {
    marginRight: 10,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  
  // Exercise screen styles
  exerciseScreenContainer: {
    width: '100%',
  },
  timerDisplay: {
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 15,
    borderWidth: 1,
    marginBottom: 20,
  },
  timerLabel: {
    fontSize: 14,
    marginBottom: 5,
  },
  workoutTimerText: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  currentExerciseCard: {
    borderRadius: 15,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
  },
  currentExerciseName: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  setInfo: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 8,
  },
  repInfo: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  inputGroup: {
    width: '48%',
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 18,
  },
  controlsContainer: {
    marginTop: 10,
    marginBottom: 20,
  },
  completeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    paddingVertical: 15,
  },
  progressContainer: {
    marginTop: 20,
  },
  progressText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    width: '100%',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  
  // Rest screen styles
  restScreenContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  restCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 25,
    alignItems: 'center',
    marginBottom: 30,
    width: '100%',
  },
  restTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  restTimerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  restTimerText: {
    fontSize: 70,
    fontWeight: 'bold',
    lineHeight: 70,
  },
  restTimerUnit: {
    fontSize: 24,
    marginBottom: 10,
    marginLeft: 5,
  },
  addTimeButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  addTimeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  restMessage: {
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic',
    maxWidth: '90%',
  },
  upNextCard: {
    borderRadius: 15,
    borderWidth: 1,
    padding: 20,
    width: '100%',
    marginBottom: 30,
  },
  upNextLabel: {
    fontSize: 14,
    marginBottom: 5,
  },
  upNextExercise: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  upNextSetInfo: {
    fontSize: 16,
  },
  skipRestButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    paddingVertical: 15,
    paddingHorizontal: 30,
  },
  
  // Completed screen styles
  completedContainer: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 30,
  },
  completedIcon: {
    marginBottom: 20,
  },
  completedTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  completedCard: {
    borderRadius: 15,
    borderWidth: 1,
    padding: 20,
    width: '100%',
    alignItems: 'center',
    marginBottom: 30,
  },
  completedWorkoutName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  completedStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  completedStatItem: {
    alignItems: 'center',
  },
  completedStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  completedStatLabel: {
    fontSize: 14,
    marginTop: 5,
  },
  saveButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    paddingVertical: 15,
    paddingHorizontal: 40,
    marginTop: 20,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '70%',
    borderRadius: 15,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 15,
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    padding: 5,
  },
  modalExerciseItem: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginBottom: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  modalExerciseName: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  modalExerciseDetails: {
    fontSize: 14,
  },
}); 