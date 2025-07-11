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
  Platform,
  Switch,
  Modal,
  AppState,
  Linking
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useSQLiteContext } from 'expo-sqlite';
import { StartWorkoutStackParamList } from '../App';
import * as Notifications from 'expo-notifications';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useSettings } from '../context/SettingsContext';
import { loadRestTimerPreferences, saveRestTimerPreferences } from '../utils/startedWorkoutPreferenceUtils';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import { 
  useTimerPersistence, 
  createTimerState, 
  updateTimerState, 
  timerCalculations,
  TimerState 
} from '../utils/timerPersistenceUtils';
import { AutoSizeText, ResizeTextMode } from 'react-native-auto-size-text';

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
  exercise_fully_logged: boolean;
  web_link: string | null;
  muscle_group: string | null;
}

interface ExerciseSet {
  exercise_name: string;
  exercise_id: number;
  set_number: number;
  total_sets: number;
  reps_goal: number;
  reps_done: string;
  weight: string;
  set_logged: boolean;
  web_link: string | null;
  muscle_group: string | null;
}

export default function StartedWorkoutInterface() {
  const navigation = useNavigation();
  const route = useRoute<StartedWorkoutRouteProps>();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const db = useSQLiteContext();
  const { notificationPermissionGranted, weightFormat } = useSettings();
  
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
  const [restTime, setRestTime] = useState('30');
  const [exerciseRestTime, setExerciseRestTime] = useState('60');
  const [isExerciseListModalVisible, setIsExerciseListModalVisible] = useState(false);
  const [autoFillWeight, setAutoFillWeight] = useState(true);
  const [autoFillReps, setAutoFillReps] = useState(true);
  const [enableSetSwitchSound, setEnableSetSwitchSound] = useState(false);
  
  // User preference toggles
  const [enableVibration, setEnableVibration] = useState(true);
  const [enableNotifications, setEnableNotifications] = useState(false);
  
  // Sets data for tracking workout
  const [allSets, setAllSets] = useState<ExerciseSet[]>([]);
  
  // Timer state using the new utility
  const [timerState, setTimerState] = useState<TimerState>(createTimerState());
  const [isCompletingSet, setIsCompletingSet] = useState(false);
  
  // Timer refs for intervals
  const workoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const restTimerRef = useRef<NodeJS.Timeout | null>(null);
  const weightMapRef = useRef(new Map<string, string>());
  
  const updateExerciseLoggedStatus = (exerciseId: number, currentSets: ExerciseSet[]) => {
    const exerciseSets = currentSets.filter(s => s.exercise_id === exerciseId);
    const allSetsLogged = exerciseSets.every(s => s.set_logged);

    setExercises(prevExercises =>
      prevExercises.map(ex =>
        ex.logged_exercise_id === exerciseId
          ? { ...ex, exercise_fully_logged: allSetsLogged }
          : ex
      )
    );
  };
  
  // Handle timer restoration from background
  const handleTimerRestore = (savedState: TimerState, elapsedSeconds: number) => {
    console.log('=== RESTORING TIMER STATE ===');
    console.log('Saved state:', savedState);
    console.log('Elapsed seconds:', elapsedSeconds);
    
    // Restore workout timer
    if (savedState.workoutStartTime) {
      const newDuration = savedState.workoutDuration + elapsedSeconds;
      const newStartTime = Date.now() - (newDuration * 1000);
      
      setTimerState(prev => updateTimerState(prev, {
        workoutDuration: newDuration,
        workoutStartTime: newStartTime,
        currentSetIndex: savedState.currentSetIndex,
        workoutStage: savedState.workoutStage,
        workoutStarted: savedState.workoutStarted
      }));
      
      // Restart workout timer
      stopWorkoutTimer();
      startWorkoutTimer();
    }
    
    // Restore rest timer if needed
    if (savedState.isResting && savedState.restRemaining !== null && savedState.restRemaining > 0) {
      const newRestTime = Math.max(0, savedState.restRemaining - elapsedSeconds);
      
      if (newRestTime <= 0) {
        // Rest completed in background
        console.log('Rest completed during background');
        handleRestComplete(savedState.isExerciseRest);
      } else {
        // Continue rest timer
        setTimerState(prev => updateTimerState(prev, {
          restRemaining: newRestTime,
          isResting: true,
          isExerciseRest: savedState.isExerciseRest,
          restStartTime: Date.now()
        }));
        
        stopRestTimer();
        startRestTimer(newRestTime);
      }
    }
  };
  
  // Setup timer persistence
  useTimerPersistence(timerState, {
    onRestore: handleTimerRestore,
    onError: (error) => {
      console.error('Timer persistence error:', error);
      Alert.alert('Timer Error', 'There was an issue with timer persistence.');
    }
  }, {
    enabled: timerState.workoutStarted,
    debugMode: __DEV__
  });
  
  // Handle AppState changes for notifications
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: string) => {
      // Going to background - schedule notification if workout is active and notifications are enabled
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Stop active intervals when going to background
        // Let useTimerPersistence handle saving the actual current state
        stopWorkoutTimer();
        stopRestTimer();
        // clearRestTimerState(); // Clear timer state when going background // REMOVED

        if (timerState.workoutStarted && 
            timerState.workoutStage !== 'completed' && 
            enableNotifications && 
            notificationPermissionGranted) {
          
          console.log('App going to background - scheduling notification');
          
          try {
            // Clear any existing notifications first
            await Notifications.dismissAllNotificationsAsync();
            
            // Schedule workout progress notification
            await Notifications.scheduleNotificationAsync({
              content: {
                title: t("Workout in Progress"),
                body: t("Workout in Progress Message"),
                priority: 'min',
                data: { 
                  startTime: timerState.workoutStartTime,
                  type: 'workout_timer'
                },
              },
              trigger: null,
            });
            
          } catch (error) {
            console.error('Error scheduling notifications:', error);
          }
        }
      } 
      // Coming to foreground - clear notifications
      else if (nextAppState === 'active') {
        // clearRestTimerState(); // Clear timer state when coming to foreground // REMOVED
        if (enableNotifications) {
          console.log('App returning to foreground - clearing notifications');
          try {
            await Notifications.dismissAllNotificationsAsync();
          } catch (error) {
            console.error('Error clearing notifications:', error);
          }
        }
      }
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      // clearRestTimerState(); // Clear on unmount // This was already correctly removed/commented
      subscription.remove();
    };
  }, [
    timerState.workoutStarted, 
    timerState.workoutStage, 
    enableNotifications, 
    notificationPermissionGranted,
    t,
    timerState.workoutStartTime
  ]);
  
  // Update enableNotifications only if permission is granted
  useEffect(() => {
    if (notificationPermissionGranted && !enableNotifications) {
      // Optional: enable notifications by default if permission is granted
      // setEnableNotifications(true);
    }
  }, [notificationPermissionGranted]);
  
  useEffect(() => {
    const loadInitialData = async () => {
        try {
            const preferences = await loadRestTimerPreferences();
            setRestTime(preferences.restTimeBetweenSets);
            setExerciseRestTime(preferences.restTimeBetweenExercises);
            setEnableVibration(preferences.enableVibration);
            setAutoFillWeight(preferences.autoFillWeight);
            setAutoFillReps(preferences.autoFillReps);
            setEnableSetSwitchSound(preferences.enableSetSwitchSound);
            if (notificationPermissionGranted) {
                setEnableNotifications(preferences.enableNotifications);
            } else {
                setEnableNotifications(false);
            }

            await fetchWorkoutDetails(preferences.autoFillWeight, preferences.autoFillReps);
        } catch (error) {
            console.error('Error loading initial data:', error);
            setLoading(false);
        }
    };

    loadInitialData();

    return () => {
        stopWorkoutTimer();
        stopRestTimer();
        deactivateKeepAwake();
    };
  }, [notificationPermissionGranted]);

  // Setup notification handler and keep awake
  useEffect(() => {
    const configureNotifications = async () => {
      await Notifications.setNotificationHandler({
        handleNotification: async (notification) => {
          // Handle different notification types
          const notificationType = notification.request.content.data?.type;
          
          return {
            shouldShowAlert: true,
            shouldPlaySound: notificationType === 'rest_complete',
            shouldSetBadge: false,
          };
        },
      });
    };
    
    if (timerState.workoutStarted) {
      activateKeepAwakeAsync();
      configureNotifications();
    }
    
    return () => {
      deactivateKeepAwake();
      // Clear notifications when component unmounts
      if (enableNotifications) {
        Notifications.dismissAllNotificationsAsync().catch(console.error);
      }
    };
  }, [timerState.workoutStarted, enableNotifications]);

  // Handle back press when workout is started
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!timerState.workoutStarted || timerState.workoutStage === 'completed') {
        return;
      }

      e.preventDefault();

      Alert.alert(
        t('exitWorkout'),
        t('exitWorkoutMessage'),
        [
          { text: t('Cancel'), style: 'cancel', onPress: () => {} },
          {
            text: t('exit'),
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
        ]
      );
    });

    return unsubscribe;
  }, [navigation, timerState.workoutStarted, timerState.workoutStage, t]);
  
  const handleLinkPress = async (url: string | null) => {
    if (!url) {
      Alert.alert(t('noLinkAvailable'));
      return;
    }
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(`${t('cannotOpenURL')}: ${url}`);
      }
    } catch (error) {
      console.error('Error opening URL:', error);
      Alert.alert(t('errorOpeningURL'));
    }
  };
  
  const fetchWorkoutDetails = async (shouldAutoFill: boolean, shouldAutoFillReps: boolean) => {
    try {
      setLoading(true);
      
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
        
        const exercisesResult = await db.getAllAsync<Exercise>(
          `SELECT exercise_name, sets, reps, logged_exercise_id, web_link, muscle_group
           FROM Logged_Exercises 
           WHERE workout_log_id = ?;`,
          [workout_log_id]
        );
        
        setExercises(exercisesResult.map(e => ({ ...e, exercise_fully_logged: false })));
        
        weightMapRef.current.clear();

        if (exercisesResult.length > 0) {
            const exerciseNames = exercisesResult.map(e => e.exercise_name);
            const placeholders = exerciseNames.map(() => '?').join(',');
        
            const lastWeightsResult = await db.getAllAsync<{ exercise_name: string; set_number: number; weight_logged: number }>(
                `SELECT wl.exercise_name, wl.set_number, wl.weight_logged
                 FROM Weight_Log wl
                 INNER JOIN (
                   SELECT exercise_name, set_number, MAX(workout_log_id) as max_log_id
                   FROM Weight_Log
                   WHERE exercise_name IN (${placeholders})
                   GROUP BY exercise_name, set_number
                 ) as latest_logs
                 ON wl.exercise_name = latest_logs.exercise_name 
                 AND wl.set_number = latest_logs.set_number 
                 AND wl.workout_log_id = latest_logs.max_log_id;`,
                exerciseNames
              );
        
              lastWeightsResult.forEach(row => {
                weightMapRef.current.set(`${row.exercise_name}-${row.set_number}`, row.weight_logged.toString());
              });
        }
        
        // Prepare all sets data structure
        const setsData: ExerciseSet[] = [];
        exercisesResult.forEach(exercise => {
          for (let i = 1; i <= exercise.sets; i++) {
            const weight = shouldAutoFill ? (weightMapRef.current.get(`${exercise.exercise_name}-${i}`) || '') : '';
            setsData.push({
              exercise_name: exercise.exercise_name,
              exercise_id: exercise.logged_exercise_id,
              set_number: i,
              total_sets: exercise.sets,
              reps_goal: exercise.reps,
              reps_done: shouldAutoFillReps ? exercise.reps.toString() : '',
              weight: weight,
              set_logged: false,
              web_link: exercise.web_link || null,
              muscle_group: exercise.muscle_group || null
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
    const startTime = Date.now() - (timerState.workoutDuration * 1000);
    setTimerState(prev => updateTimerState(prev, { workoutStartTime: startTime }));
    
    workoutTimerRef.current = setInterval(() => {
      setTimerState(prev => updateTimerState(prev, {
        workoutDuration: prev.workoutDuration + 1
      }));
    }, 1000);
  };
  
  const stopWorkoutTimer = () => {
    if (workoutTimerRef.current) {
      clearInterval(workoutTimerRef.current);
      workoutTimerRef.current = null;
    }
  };
  
  const startRestTimer = (seconds: number) => {
    // We're explicitly setting a number here, not null
    setTimerState(prev => updateTimerState(prev, {
      restRemaining: seconds,  // This is a number
      restStartTime: Date.now(),
      isResting: true
    }));
    
    restTimerRef.current = setInterval(() => {
      setTimerState(prev => {
        if (prev.restRemaining === null) {
          stopRestTimer();
          return prev;
        }
        const newRestTime = prev.restRemaining - 1;
        
        if (newRestTime <= 0) {
          stopRestTimer();
          handleRestComplete(prev.isExerciseRest);
          return updateTimerState(prev, {
            restRemaining: null,  // Only set to null when complete
            isResting: false,
            isExerciseRest: false
          });
        }
        
        return updateTimerState(prev, { restRemaining: newRestTime });
      });
    }, 1000);
  };
  
  const stopRestTimer = () => {
    if (restTimerRef.current) {
      clearInterval(restTimerRef.current);
      restTimerRef.current = null;
    }
  };
  
  const handleRestComplete = (wasExerciseRest: boolean) => {
  
    clearRestTimerState(); // Clear rest timer state before new set
    setTimerState(prev => updateTimerState(prev, {
      workoutStage: 'exercise'
    }));
    
    if (enableVibration) {
      Vibration.vibrate([500, 300, 500]);
    }
    if (enableSetSwitchSound) {
      playSound();
    }
  };
  
  const handleAutoFillToggle = (newValue: boolean) => {
    setAutoFillWeight(newValue);
    setAllSets(currentSets => 
      currentSets.map(set => {
        if (set.set_logged) {
          return set;
        }

        const newWeight = newValue ? (weightMapRef.current.get(`${set.exercise_name}-${set.set_number}`) || '') : '';

        return {
          ...set,
          weight: newWeight,
        };
      })
    );
  };

  const handleAutoFillRepsToggle = (newValue: boolean) => {
    setAutoFillReps(newValue);
    setAllSets(currentSets =>
      currentSets.map(set => {
        if (set.set_logged) {
          return set;
        }

        return {
          ...set,
          reps_done: newValue ? set.reps_goal.toString() : '',
        };
      })
    );
  };

  // Workout flow functions
  const startWorkout = async () => {
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

    try {
      await saveRestTimerPreferences({
        restTimeBetweenSets: restTime,
        restTimeBetweenExercises: exerciseRestTime,
        enableVibration: enableVibration,
        enableNotifications: enableNotifications,
        autoFillWeight: autoFillWeight,
        enableSetSwitchSound: enableSetSwitchSound,
        autoFillReps: autoFillReps,
      });
    } catch (error) {
      console.error('Error saving rest timer preferences:', error);
    }
    
    setTimerState(prev => updateTimerState(prev, {
      workoutStarted: true,
      workoutStage: 'exercise'
    }));
    
    startWorkoutTimer();
  };
  
  const handleNotificationToggle = async () => {
    if (!enableNotifications) {
      if (!notificationPermissionGranted) {
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
      setEnableNotifications(true);
    } else {
      setEnableNotifications(false);
      // Clear any existing notifications when disabling
      try {
        await Notifications.dismissAllNotificationsAsync();
      } catch (error) {
        console.error('Error clearing notifications:', error);
      }
    }
  };
  
  const isDifferentExercise = (currentIndex: number, nextIndex: number): boolean => {
    if (nextIndex >= allSets.length) return false;
    return allSets[currentIndex].exercise_name !== allSets[nextIndex].exercise_name;
  };

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
  
  // Rest of the render functions remain the same...
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
          renderItem={({ item }) => {
            const muscleGroupInfo = muscleGroupData.find(mg => mg.value === item.muscle_group);
            return (
              <View style={[styles.exerciseItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1,}}>
                    <Text style={[styles.exerciseName, { color: theme.text, marginRight: 8 }]}>{item.exercise_name}</Text>
                    {muscleGroupInfo && muscleGroupInfo.value && (
                      <View style={[styles.muscleGroupBadgeOverview, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <Text style={[styles.muscleGroupBadgeText, { color: theme.text }]}>
                          {t(muscleGroupInfo.label)}
                        </Text>
                      </View>
                    )}
                  </View>
                  {item.web_link && (
                    <TouchableOpacity onPress={() => handleLinkPress(item.web_link)} style={{ marginLeft: 10 }}>
                      <Ionicons name="link-outline" size={22} color={theme.text} />
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={[styles.exerciseDetails, { color: theme.text, marginTop: 4 }]}>
                  {item.sets} {t('Sets')} × {item.reps} {t('Reps')}
                </Text>
              </View>
            )
          }}
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
            maxLength={4}
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
            maxLength={4}
            placeholderTextColor={theme.type === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'}
          />
          
          <Text style={[styles.setupLabel, { color: theme.text, marginTop: 15 }]}>{t('workoutSettings')}:</Text>
          
          <View style={[styles.toggleRow, { 
            backgroundColor: theme.type === 'dark' ? '#121212' : '#f0f0f0',
            borderColor: theme.type === 'dark' ? '#000000' : '#e0e0e0'
          }]}>
            <Text style={[styles.toggleText, { color: theme.text }]}>{t('autoFillWeights')}</Text>
            <Switch
              value={autoFillWeight}
              onValueChange={handleAutoFillToggle}
              trackColor={{ false: theme.type === 'dark' ? '#444' : '#ccc', true: theme.buttonBackground }}
              thumbColor={autoFillWeight ? (theme.type === 'dark' ? '#fff' : '#fff') : (theme.type === 'dark' ? '#888' : '#f4f3f4')}
            />
          </View>

          <View style={[styles.toggleRow, {
            backgroundColor: theme.type === 'dark' ? '#121212' : '#f0f0f0',
            borderColor: theme.type === 'dark' ? '#000000' : '#e0e0e0'
          }]}>
            <Text style={[styles.toggleText, { color: theme.text }]}>{t('autoFillReps')}</Text>
            <Switch
              value={autoFillReps}
              onValueChange={handleAutoFillRepsToggle}
              trackColor={{ false: theme.type === 'dark' ? '#444' : '#ccc', true: theme.buttonBackground }}
              thumbColor={autoFillReps ? (theme.type === 'dark' ? '#fff' : '#fff') : (theme.type === 'dark' ? '#888' : '#f4f3f4')}
            />
          </View>
          
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
            <Text style={[styles.toggleText, { color: theme.text }]}>{t('enableSetSwitchSound')}</Text>
            <Switch
              value={enableSetSwitchSound}
              onValueChange={setEnableSetSwitchSound}
              trackColor={{ false: theme.type === 'dark' ? '#444' : '#ccc', true: theme.buttonBackground }}
              thumbColor={enableSetSwitchSound ? (theme.type === 'dark' ? '#fff' : '#fff') : (theme.type === 'dark' ? '#888' : '#f4f3f4')}
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
            <Ionicons name="stopwatch-outline" size={20} color={theme.buttonText} style={styles.buttonIcon} />
            <Text style={[styles.buttonText, { color: theme.buttonText }]}>{t('startWorkout')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  
  // ... (rest of the render functions remain the same)
  
  const renderExerciseScreen = () => {
    const currentSet = allSets[timerState.currentSetIndex];
    if (!currentSet) return null;
    
    const muscleGroupInfo = muscleGroupData.find(mg => mg.value === currentSet.muscle_group);
    
    const isLastUnloggedSet = allSets.filter(s => !s.set_logged).length === 1;

    const loggedSetsCount = allSets.filter(s => s.set_logged).length;
    const progress = allSets.length > 0 ? (loggedSetsCount / allSets.length) * 100 : 0;
    
    const currentExerciseId = currentSet.exercise_id;
    const currentExerciseIndex = exercises.findIndex(ex => ex.logged_exercise_id === currentExerciseId);
    const isLastExercise = currentExerciseIndex === exercises.length - 1;
    const isLastSetOfExercise = currentSet.set_number === currentSet.total_sets;
    const isLastStructuralSet = isLastExercise && isLastSetOfExercise;

    return (
      <View style={styles.exerciseScreenContainer}>
        <View style={[styles.timerDisplay, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.timerLabel, { color: theme.text }]}>{t('workoutTime')}</Text>
          <Text style={[styles.workoutTimerText, { color: theme.text }]}>
            {timerCalculations.formatTime(timerState.workoutDuration)}
          </Text>
        </View>
        
        <View style={[styles.currentExerciseCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {muscleGroupInfo && muscleGroupInfo.value && (
            <View style={{alignItems: 'center', marginBottom: 10}}>
              <View style={[styles.muscleGroupBadgeMain, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.muscleGroupBadgeText, { color: theme.text }]}>
                  {t(muscleGroupInfo.label)}
                </Text>
              </View>
            </View>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            {/* Left spacer to balance the icon on the right */}
            <View style={{ width: 60 }} />

            {/* Exercise name, now perfectly centered */}
            <Text style={[styles.currentExerciseName, { color: theme.text, flex: 1 }]}>
              {currentSet.exercise_name}
            </Text>

            {/* Icon container, same width as the spacer */}
            <View style={{ width: 60, alignItems: 'flex-start' }}>
              {currentSet.web_link && (
                <TouchableOpacity onPress={() => handleLinkPress(currentSet.web_link)}>
                  <Ionicons name="link-outline" size={24} color={theme.text} />
                </TouchableOpacity>
              )}
            </View>
          </View>
          <Text style={[styles.setInfo, { color: theme.text }]}>
           {currentSet.set_number}/{currentSet.total_sets}
          </Text>
          <Text style={[styles.repInfo, { color: theme.text }]}>
            {t('goal')}: {currentSet.reps_goal} {t('Reps')}
          </Text>
          
          <View style={styles.inputContainer}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>{t('repsDone')}</Text>
              <TextInput
                  style={[styles.input, { 
                  backgroundColor: theme.card,
              color: theme.text,
              borderColor: theme.border
            }]}
            value={currentSet.reps_done}
            onChangeText={(text) => {
              const updatedSets = [...allSets];
              updatedSets[timerState.currentSetIndex] = {
                ...updatedSets[timerState.currentSetIndex],
                reps_done: text
              };
              setAllSets(updatedSets);
            }}
            keyboardType="number-pad"
            maxLength={3}
            placeholder="0"
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
                  updatedSets[timerState.currentSetIndex] = {
                    ...updatedSets[timerState.currentSetIndex],
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
        
        <View style={styles.controlsContainer}>
            {!isLastStructuralSet &&
            <TouchableOpacity
                style={[styles.completeButton, { 
                backgroundColor: 
                    !allSets[timerState.currentSetIndex] || allSets[timerState.currentSetIndex].reps_done === '' || parseInt(allSets[timerState.currentSetIndex].reps_done) <= 0 || allSets[timerState.currentSetIndex].weight === '' || parseFloat(allSets[timerState.currentSetIndex].weight) <= 0
                    ? theme.inactivetint 
                    : theme.buttonBackground
                }]}
                onPress={() => {
                const pressCurrentSet = allSets[timerState.currentSetIndex];
                if (!pressCurrentSet || pressCurrentSet.reps_done === '' || parseInt(pressCurrentSet.reps_done) <= 0 || pressCurrentSet.weight === '' || parseFloat(pressCurrentSet.weight) <= 0) {
                    Alert.alert(t('missingInformation'), t('enterRepsAndWeight'));
                    return;
                }
                
                setIsCompletingSet(true);

                const updatedSets = [...allSets];
                const currentSetIndex = timerState.currentSetIndex;
                const currentSet = { ...updatedSets[currentSetIndex], set_logged: true };
                updatedSets[currentSetIndex] = currentSet;
                
                setAllSets(updatedSets);
                updateExerciseLoggedStatus(currentSet.exercise_id, updatedSets);
                
                const findNextUnloggedSet = (startIndex: number) => {
                    for (let i = startIndex; i < updatedSets.length; i++) {
                    if (!updatedSets[i].set_logged) {
                        return i;
                    }
                    }
                    return -1;
                };

                let nextSetIndex = findNextUnloggedSet(currentSetIndex + 1);

                if (nextSetIndex !== -1) {
                    const differentExercise = isDifferentExercise(currentSetIndex, nextSetIndex);
                    
                    setTimerState(prev => updateTimerState(prev, {
                    workoutStage: 'rest',
                    isExerciseRest: differentExercise,
                    currentSetIndex: nextSetIndex 
                    }));
                    
                    const restSeconds = differentExercise 
                    ? parseInt(exerciseRestTime) 
                    : parseInt(restTime);
                    
                    setIsCompletingSet(false);
                    startRestTimer(restSeconds);
                    
                } else {
                    // No more unlogged sets after current one
                    const anyUnlogged = updatedSets.some(s => !s.set_logged);
                    if (anyUnlogged) {
                    Alert.alert(
                        t('unsavedSetsTitle'),
                        t('unsavedSetsMessage'),
                        [
                        {
                            text: t('Yes'),
                            style: 'destructive',
                            onPress: () => {
                            setTimerState(prev => updateTimerState(prev, { workoutStage: 'completed' }));
                            stopWorkoutTimer();
                            },
                        },
                        {
                            text: t('No'),
                            style: 'cancel',
                            onPress: () => {
                            const firstUnloggedIndex = findNextUnloggedSet(0);
                            if (firstUnloggedIndex !== -1) {
                                setTimerState(prev => updateTimerState(prev, {
                                workoutStage: 'exercise',
                                currentSetIndex: firstUnloggedIndex
                                }));
                            }
                            setIsCompletingSet(false);
                            },
                        },
                        ],
                        { onDismiss: () => setIsCompletingSet(false) }
                    );
                    } else {
                    // All sets are logged
                    setTimerState(prev => updateTimerState(prev, { workoutStage: 'completed' }));
                    stopWorkoutTimer();
                    }
                }
                }}
                disabled={
                    isCompletingSet ||
                    !allSets[timerState.currentSetIndex] || allSets[timerState.currentSetIndex].reps_done === '' || parseInt(allSets[timerState.currentSetIndex].reps_done) <= 0 || allSets[timerState.currentSetIndex].weight === '' || parseFloat(allSets[timerState.currentSetIndex].weight) <= 0
                }
            >
                <Text style={[styles.buttonText, { color: theme.buttonText }]}>
                {isCompletingSet ? `${t('completing')}...` : (isLastUnloggedSet ? t('finishWorkout') : t('completeSet'))}
                </Text>
            </TouchableOpacity>
            }
            <View style={styles.secondaryControlsContainer}>
                {!isLastExercise &&
                  <TouchableOpacity
                  style={[styles.secondaryButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={handleSkipToNextExercise}
                  >
                    <AutoSizeText
                      fontSize={16}
                      numberOfLines={3}
                      mode={ResizeTextMode.max_lines}
                      style={[styles.secondaryButtonText, { color: theme.text }]}
                    >
                      {t('skipToNextExercise')}
                    </AutoSizeText>
                  </TouchableOpacity>
                }
                <TouchableOpacity
                  style={[
                    styles.secondaryButton, 
                    { backgroundColor: theme.card, borderColor: theme.border },
                    (isLastExercise && !isLastStructuralSet) && { width: '100%' },
                    (isLastExercise && isLastStructuralSet) && { width: '100%' }
                  ]}
                  onPress={handleFinishWorkout}
                >
                  <AutoSizeText
                    fontSize={16}
                    numberOfLines={3}
                    mode={ResizeTextMode.max_lines}
                    style={[styles.secondaryButtonText, { color: theme.text }]}
                  >
                    {t('finishWorkout')}
                  </AutoSizeText>
                </TouchableOpacity>
            </View>
        </View>
        
        <View style={styles.progressContainer}>
          <Text style={[styles.progressText, { color: theme.text }]}>
          %{Math.round(progress)}
          </Text>
          <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  backgroundColor: theme.buttonBackground,
                  width: `${progress}%`
                }
              ]} 
            />
          </View>
        </View>
        <Text style={[styles.tipText, { color: theme.text }]}>{t('startedWorkoutTip')}</Text>
      </View>
    );
  };
  
  const renderRestScreen = () => {
    const nextSet = allSets[timerState.currentSetIndex];
    
    const muscleGroupInfo = nextSet ? muscleGroupData.find(mg => mg.value === nextSet.muscle_group) : null;
    
    return (
      <View style={styles.restScreenContainer}>
        <View style={[styles.restCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.restTitle, { color: theme.text }]}>{t('restTime')}</Text>
          
          <View style={styles.restTimerContainer}>
            <Text style={[styles.restTimerText, { color: theme.text }]}>
              {timerState.restRemaining}
            </Text>
            <Text style={[styles.restTimerUnit, { color: theme.text }]}>{t('sec')}</Text>
          </View>
          
          <TouchableOpacity
            style={[styles.addTimeButton, { backgroundColor: theme.type === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.2)' }]}
            onPress={() => setTimerState(prev => updateTimerState(prev, { 
              restRemaining: (prev.restRemaining ?? 0) + 15 
            }))}
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
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1 }}>
                <Text style={[styles.upNextExercise, { color: theme.text, marginRight: 8 }]}>
                  {nextSet.exercise_name}
                </Text>
                {muscleGroupInfo && muscleGroupInfo.value && (
                  <View style={[styles.muscleGroupBadgeModal, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Text style={[styles.muscleGroupBadgeText, { color: theme.text }]}>
                      {t(muscleGroupInfo.label)}
                    </Text>
                  </View>
                )}
              </View>
              {nextSet.web_link && (
                <TouchableOpacity onPress={() => handleLinkPress(nextSet.web_link)} style={{ marginLeft: 10 }}>
                  <Ionicons name="link-outline" size={22} color={theme.text} />
                </TouchableOpacity>
              )}
            </View>
            <Text style={[styles.upNextSetInfo, { color: theme.text }]}>
              {t('upcomingSet')}: {nextSet.set_number}
            </Text>
          </View>
        )}
        
        <TouchableOpacity
          style={[styles.skipRestButton, { backgroundColor: theme.buttonBackground }]}
          onPress={() => {
            clearRestTimerState(); // Clear rest timer state when skipping
            setTimerState(prev => updateTimerState(prev, {
              workoutStage: 'exercise'
            }));
          }}
        >
          <Text style={[styles.buttonText, { color: theme.buttonText }]}>{t('skipRest')}</Text>
        </TouchableOpacity>
      </View>
    );
  };
  
  const renderCompletedScreen = () => {
    const loggedSets = allSets.filter(set => set.set_logged);
    
    const saveWorkout = async () => {
      try {
        console.log('Starting workout save process...');
        
        await db.runAsync('BEGIN TRANSACTION;');
        
        console.log('Saving completion time to Workout_Log:', timerState.workoutDuration);
        await db.runAsync(
          `UPDATE Workout_Log 
           SET completion_time = ? 
           WHERE workout_log_id = ?;`,
          [timerState.workoutDuration, workout_log_id]
        );
        
        console.log('Saving completed sets:', loggedSets.length);
        for (let i = 0; i < loggedSets.length; i++) {
          const set = loggedSets[i];
          await db.runAsync(
            `INSERT INTO Weight_Log (
              workout_log_id, 
              logged_exercise_id, 
              exercise_name, 
              set_number, 
              weight_logged, 
              reps_logged,
              muscle_group
            ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
            [
              workout_log_id,
              set.exercise_id,
              set.exercise_name,
              set.set_number,
              parseFloat(set.weight),
              parseInt(set.reps_done),
              set.muscle_group
            ]
          );
        }
        
        await db.runAsync('COMMIT;');
        console.log('Workout save completed successfully!');
        
        Alert.alert(
          t('workoutSaved'),
          t('workoutSavedMessage'),
          [{ text: t('OK'), onPress: () => navigation.goBack() }]
        );
      } catch (error) {
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
                {timerCalculations.formatTime(timerState.workoutDuration)}
              </Text>
              <Text style={[styles.completedStatLabel, { color: theme.text }]}>{t('totalTime')}</Text>
            </View>
            
            <View style={styles.completedStatItem}>
              <Text style={[styles.completedStatValue, { color: theme.text }]}>
                {loggedSets.length}
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
    const currentExerciseNameFromSet = allSets[timerState.currentSetIndex]?.exercise_name;

    return (
      <Modal
        visible={isExerciseListModalVisible}
        transparent={true}
        animationType="fade"
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
              showsVerticalScrollIndicator={false}
              data={exercises}
              keyExtractor={(item) => item.logged_exercise_id.toString()}
              renderItem={({ item }) => {
                const isCurrent = item.exercise_name === currentExerciseNameFromSet;
                const muscleGroupInfo = muscleGroupData.find(mg => mg.value === item.muscle_group);
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

                const handlePress = () => {
                  if (item.exercise_fully_logged) {
                    return; // Do nothing if exercise is fully logged
                  }
                  
                  const firstUnloggedSetIndex = allSets.findIndex(
                    s => s.exercise_id === item.logged_exercise_id && !s.set_logged
                  );

                  if (firstUnloggedSetIndex !== -1) {
                    clearRestTimerState();
                    setTimerState(prev =>
                      updateTimerState(prev, {
                        currentSetIndex: firstUnloggedSetIndex,
                        workoutStage: 'exercise',
                      })
                    );
                    setIsExerciseListModalVisible(false);
                  }
                };

                return (
                  <TouchableOpacity onPress={handlePress} disabled={item.exercise_fully_logged}>
                    <View style={itemStyle}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1 }}>
                          {item.exercise_fully_logged && (
                            <Ionicons name="checkmark-circle" size={20} color={isCurrent ? theme.buttonText : theme.buttonBackground} style={{ marginRight: 8 }} />
                          )}
                          <Text style={[nameStyle, { marginRight: 8 }]}>{item.exercise_name}</Text>
                          {muscleGroupInfo && muscleGroupInfo.value && (
                            <View style={[
                              styles.muscleGroupBadgeModal,
                              { 
                                backgroundColor: isCurrent ? theme.text : theme.card,
                                borderColor: isCurrent ? theme.buttonText : theme.border,
                              }
                            ]}>
                              <Text style={[
                                styles.muscleGroupBadgeText,
                                { color: isCurrent ? (theme.type === 'dark' ? '#000' : '#fff') : theme.text }
                              ]}>
                                {t(muscleGroupInfo.label)}
                              </Text>
                            </View>
                          )}
                        </View>
                        {item.web_link && (
                          <TouchableOpacity onPress={() => handleLinkPress(item.web_link)} style={{ marginLeft: 10 }}>
                            <Ionicons name="link-outline" size={22} color={isCurrent ? theme.buttonText : theme.text} />
                          </TouchableOpacity>
                        )}
                      </View>
                      <Text style={[detailStyle, { marginTop: 4 }]}>
                        {item.sets} {t('Sets')} × {item.reps} {t('Reps')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };
  
  const clearRestTimerState = () => {
    stopRestTimer(); // Clear the interval
    setTimerState(prev => updateTimerState(prev, {
      isResting: false,
      isExerciseRest: false,
      restRemaining: null,
      restStartTime: null
    }));
  };
  
  useEffect(() => {
    const configureAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
          interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
          playThroughEarpieceAndroid: false,
        });
      } catch (error) {
        console.error("Error configuring audio mode: ", error);
      }
    };

    configureAudio();
  }, []);

  const playSound = async () => {
    
    try {
      const { sound } = await Audio.Sound.createAsync(
         require('../assets/sounds/switch.mp3')
      );
      sound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.isLoaded && status.didJustFinish) {
          await sound.unloadAsync();
        }
      });
      await sound.playAsync();
    } catch (error) {
        console.log('Error playing sound', error);
    }
  };

  const handleSkipToNextExercise = () => {
    const currentExerciseId = allSets[timerState.currentSetIndex].exercise_id;
    const currentExerciseInExercisesIndex = exercises.findIndex(e => e.logged_exercise_id === currentExerciseId);

    let nextUnloggedExercise = null;
    for (let i = currentExerciseInExercisesIndex + 1; i < exercises.length; i++) {
        if (!exercises[i].exercise_fully_logged) {
            nextUnloggedExercise = exercises[i];
            break;
        }
    }

    if (nextUnloggedExercise) {
        const firstUnloggedSetIndex = allSets.findIndex(
            s => s.exercise_id === nextUnloggedExercise.logged_exercise_id && !s.set_logged
        );

        if (firstUnloggedSetIndex !== -1) {
            clearRestTimerState();
            setTimerState(prev =>
              updateTimerState(prev, {
                currentSetIndex: firstUnloggedSetIndex,
                workoutStage: 'exercise',
              })
            );
        }
    } else {
        Alert.alert(t('noMoreExercises'), t('allFollowingExercisesLogged'));
    }
  };
  const handleFinishWorkout = () => {
    const currentSetIndex = timerState.currentSetIndex;
    const currentSet = allSets[currentSetIndex];

    if (currentSet && currentSet.reps_done !== '' && parseInt(currentSet.reps_done) > 0 && currentSet.weight !== '' && parseFloat(currentSet.weight) > 0) {
      const updatedSets = [...allSets];
      updatedSets[currentSetIndex] = { ...currentSet, set_logged: true };
      setAllSets(updatedSets);
      updateExerciseLoggedStatus(currentSet.exercise_id, updatedSets);
    }
    
    stopWorkoutTimer();
    setTimerState(prev => updateTimerState(prev, { workoutStage: 'completed' }));
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
          {timerState.workoutStarted ? (workout ? `${workout.workout_name} - ${workout.day_name}` : 'Workout') : t("startWorkout")}
        </Text>
        {timerState.workoutStarted ? (
          <TouchableOpacity 
            onPress={() => setIsExerciseListModalVisible(true)} 
            style={styles.headerListIcon}
          >
            <Ionicons name="reorder-three-outline" size={23} color={theme.text} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 23 + (styles.headerListIcon.padding * 2), marginLeft: styles.headerListIcon.marginLeft }} />
        )}
      </View>
      
      <ScrollView 
        showsVerticalScrollIndicator={false}
        style={styles.content} 
        contentContainerStyle={[
          styles.scrollContent,
          timerState.workoutStage === 'rest' && styles.restScrollContent
        ]}
      >
        {timerState.workoutStage === 'overview' && renderOverview()}
        {timerState.workoutStage === 'exercise' && renderExerciseScreen()}
        {timerState.workoutStage === 'rest' && renderRestScreen()}
        {timerState.workoutStage === 'completed' && renderCompletedScreen()}
      </ScrollView>
      {renderExerciseListModal()}
    </View>
  );
}

// Styles remain the same...
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
  secondaryControlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 50,
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    width: '48%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  tipText: {
    marginTop: 15,
    textAlign: 'center',
    fontSize: 14,
    fontStyle: 'italic',
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
  },
  upNextSetInfo: {
    fontSize: 16,
    fontWeight: '600',
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
  },
  modalExerciseDetails: {
    fontSize: 14,
  },
  muscleGroupBadgeMain: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 15,
    borderWidth: 1,
    alignSelf: 'center',
  },
  muscleGroupBadgeOverview: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 15,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  muscleGroupBadgeModal: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 15,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  muscleGroupBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
