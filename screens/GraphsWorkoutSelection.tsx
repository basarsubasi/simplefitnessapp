import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSQLiteContext } from 'expo-sqlite';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';

// Define the navigation param list type if not already defined in App.tsx
type GraphsStackParamList = {
  GraphsWorkoutSelection: undefined;
  GraphsWorkoutDetails: { workoutName: string };
};

type GraphsNavigationProp = StackNavigationProp<GraphsStackParamList, 'GraphsWorkoutSelection'>;

export default function GraphsWorkoutSelection() {
  const navigation = useNavigation<GraphsNavigationProp>();
  const db = useSQLiteContext();
  const { theme } = useTheme();
  const { t } = useTranslation();
  
  const [workouts, setWorkouts] = useState<string[]>([]);

  useEffect(() => {
    fetchWorkoutsWithLogs();
  }, []);

  // Fetch workouts that have logged data
  const fetchWorkoutsWithLogs = async () => {
    try {
      const result = await db.getAllAsync<{ workout_name: string }>(
        `SELECT DISTINCT Workout_Log.workout_name
         FROM Workout_Log
         INNER JOIN Weight_Log 
         ON Weight_Log.workout_log_id = Workout_Log.workout_log_id;`
      );

      const workouts = result.map((row) => row.workout_name);
      setWorkouts(workouts);
    } catch (error) {
      console.error('Error fetching workouts with logs:', error);
    }
  };

  // Navigate to workout details screen for graphs
  const handleWorkoutPress = (workoutName: string) => {
    navigation.navigate('GraphsWorkoutDetails', { workoutName });
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
      
      {/* Title */}
      <Text style={[styles.title, { color: theme.text }]}>
        {t('SelectWorkoutforGraph')}
      </Text>
      
      {/* Workouts List */}
      <FlatList
        data={workouts}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.workoutCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => handleWorkoutPress(item)}
          >
            <View style={styles.workoutCardContent}>
              <Text style={[styles.workoutText, { color: theme.text }]}>{item}</Text>
              <Ionicons name="trending-up" size={20} color={theme.text} />
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="analytics-outline" size={60} color={theme.text} style={{ opacity: 0.5 }} />
            <Text style={[styles.emptyText, { color: theme.text }]}>
              {t('No workout data available for graphs')}
            </Text>
            <Text style={[styles.emptySubText, { color: theme.text }]}>
              {t('Track a workout first to see your progress')}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
    padding: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  workoutCard: {
    backgroundColor: '#F7F7F7',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    marginBottom: 16,
  },
  workoutCardContent: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  workoutText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
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
}); 