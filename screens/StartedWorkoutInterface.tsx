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
  FlatList
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useSQLiteContext } from 'expo-sqlite';
import { StartWorkoutStackParamList } from '../App';

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
  const [workoutStarted, setWorkoutStarted] = useState(false);
  
  // Sets data for tracking workout
  const [allSets, setAllSets] = useState<ExerciseSet[]>([]);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  
  // Timer states
  const [workoutTime, setWorkoutTime] = useState(0);
  const [restTimeRemaining, setRestTimeRemaining] = useState(0);
  const workoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const restTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Check if completion_time column exists, add it if not
    checkAndAddCompletionTimeColumn();
    fetchWorkoutDetails()    
    return () => {
      stopWorkoutTimer();
      stopRestTimer();
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
    restTimerRef.current = setInterval(() => {
      setRestTimeRemaining(prevTime => {
        if (prevTime <= 1) {
          stopRestTimer();
          setCurrentSetIndex(currentSetIndex + 1);
          setWorkoutStage('exercise');
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
  };
  
  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };
  
  // Workout flow functions
  const startWorkout = () => {
    // Validate rest time
    const restSeconds = parseInt(restTime);
    if (isNaN(restSeconds) || restSeconds < 0) {
      Alert.alert('Invalid Rest Time', 'Please enter a valid number of seconds');
      return;
    }
    
    setWorkoutStarted(true);
    setWorkoutStage('exercise');
    startWorkoutTimer();
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
              <Text style={[styles.statLabel, { color: theme.text }]}>Exercises</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {allSets.length}
              </Text>
              <Text style={[styles.statLabel, { color: theme.text }]}>Total Sets</Text>
            </View>
          </View>
        </View>
        
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Exercises</Text>
        <FlatList
          data={exercises}
          keyExtractor={(item) => item.logged_exercise_id.toString()}
          renderItem={({ item }) => (
            <View style={[styles.exerciseItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.exerciseName, { color: theme.text }]}>{item.exercise_name}</Text>
              <Text style={[styles.exerciseDetails, { color: theme.text }]}>
                {item.sets} sets × {item.reps} reps
              </Text>
            </View>
          )}
          scrollEnabled={false}
          style={styles.exercisesList}
        />
        
        <View style={styles.setupSection}>
          <Text style={[styles.setupLabel, { color: theme.text }]}>Rest time between sets (seconds):</Text>
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
          
          <TouchableOpacity
            style={[styles.startButton, { backgroundColor: theme.buttonBackground }]}
            onPress={startWorkout}
          >
            <Ionicons name="play" size={20} color={theme.buttonText} style={styles.buttonIcon} />
            <Text style={[styles.buttonText, { color: theme.buttonText }]}>Start Workout</Text>
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
          <Text style={[styles.timerLabel, { color: theme.text }]}>Workout Time</Text>
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
            Set {currentSet.set_number} of {currentSet.total_sets}
          </Text>
          <Text style={[styles.repInfo, { color: theme.text }]}>
            Goal: {currentSet.reps_goal} reps
          </Text>
          
          {/* Input fields for tracking */}
          <View style={styles.inputContainer}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>Reps Done</Text>
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
              <Text style={[styles.inputLabel, { color: theme.text }]}>Weight (kg/lbs)</Text>
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
                Alert.alert('Missing Information', 'Please enter both reps and weight before continuing.');
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
                // Move to rest period before next set
                setWorkoutStage('rest');
                startRestTimer(parseInt(restTime));
              }
            }}
            disabled={allSets[currentSetIndex].reps_done <= 0 || allSets[currentSetIndex].weight === ''}
          >
            <Text style={[styles.buttonText, { color: theme.buttonText }]}>
              {isLastSet ? 'Finish Workout' : 'Complete Set & Rest'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Progress indicator */}
        <View style={styles.progressContainer}>
          <Text style={[styles.progressText, { color: theme.text }]}>
            {currentSetIndex + 1} of {allSets.length} sets
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
          <Text style={[styles.restTitle, { color: theme.text }]}>Rest Time</Text>
          
          <View style={styles.restTimerContainer}>
            <Text style={[styles.restTimerText, { color: theme.text }]}>
              {restTimeRemaining}
            </Text>
            <Text style={[styles.restTimerUnit, { color: theme.text }]}>sec</Text>
          </View>
          
          <TouchableOpacity
            style={[styles.addTimeButton, { backgroundColor: theme.type === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }]}
            onPress={() => setRestTimeRemaining(prev => prev + 15)}
          >
            <Text style={[styles.addTimeButtonText, { color: theme.text }]}>+15s</Text>
          </TouchableOpacity>
          
          <Text style={[styles.restMessage, { color: theme.text }]}>
            Take a breath and prepare for your next set
          </Text>
        </View>
        
        {nextSet && (
          <View style={[styles.upNextCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.upNextLabel, { color: theme.text }]}>Up Next</Text>
            <Text style={[styles.upNextExercise, { color: theme.text }]}>
              {nextSet.exercise_name}
            </Text>
            <Text style={[styles.upNextSetInfo, { color: theme.text }]}>
              Set {nextSet.set_number} of {nextSet.total_sets} • {nextSet.reps_goal} reps
            </Text>
          </View>
        )}
        
        <TouchableOpacity
          style={[styles.skipRestButton, { backgroundColor: theme.buttonBackground }]}
          onPress={() => {
            stopRestTimer();
            setCurrentSetIndex(currentSetIndex + 1);
            setWorkoutStage('exercise');
          }}
        >
          <Text style={[styles.buttonText, { color: theme.buttonText }]}>Skip Rest</Text>
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
          'Workout Saved',
          'Your workout has been successfully logged!',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
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
        
        <Text style={[styles.completedTitle, { color: theme.text }]}>Workout Completed!</Text>
        
        <View style={[styles.completedCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.completedWorkoutName, { color: theme.text }]}>
            {workout?.workout_name}
          </Text>
          
          <View style={styles.completedStats}>
            <View style={styles.completedStatItem}>
              <Text style={[styles.completedStatValue, { color: theme.text }]}>
                {formatTime(workoutTime)}
              </Text>
              <Text style={[styles.completedStatLabel, { color: theme.text }]}>
                Total Time
              </Text>
            </View>
            
            <View style={styles.completedStatItem}>
              <Text style={[styles.completedStatValue, { color: theme.text }]}>
                {completedSets.length}
              </Text>
              <Text style={[styles.completedStatLabel, { color: theme.text }]}>
                Sets Completed
              </Text>
            </View>
          </View>
        </View>
        
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: theme.buttonBackground }]}
          onPress={saveWorkout}
        >
          <Text style={[styles.buttonText, { color: theme.buttonText }]}>
            Complete Workout
          </Text>
        </TouchableOpacity>
      </View>
    );
  };
  
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.text} />
        <Text style={[styles.loadingText, { color: theme.text }]}>Loading workout...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (workoutStarted) {
              // Confirm exit during workout
              Alert.alert(
                'Exit Workout?',
                'Are you sure you want to exit? Your progress will be lost.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Exit', style: 'destructive', onPress: () => navigation.goBack() }
                ]
              );
            } else {
              navigation.goBack();
            }
          }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>
          {workoutStarted ? (workout ? `${workout.workout_name} - ${workout.day_name}` : 'Workout') : 'Start Workout'}
        </Text>
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
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
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
    marginBottom: 25,
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
}); 