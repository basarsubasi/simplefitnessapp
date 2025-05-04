import React, {useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { StackNavigationProp } from '@react-navigation/stack';
import { WeightLogStackParamList } from '../App'; // Adjust the path to where WeightLogStackParamList is defined
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';



type WeightLogNavigationProp = StackNavigationProp<
  WeightLogStackParamList,
  'LogWeights' | 'WeightLogDetail' | 'AllLogs' | 'GraphsWorkoutSelection'
>;

export default function MyProgress() {
  const navigation = useNavigation<WeightLogNavigationProp>();
  const db = useSQLiteContext();

  const { theme } = useTheme(); // Add the theme hook here
  const { t } = useTranslation(); // Initialize translations
  

  const [workouts, setWorkouts] = useState<string[]>([]);


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



  useFocusEffect(
    React.useCallback(() => {
      addColumn0()
      addColumn1()
      fetchWorkoutsWithLogs();
    }, [db])
  );

  const fetchWorkoutsWithLogs = async () => {
    try {
      const result = await db.getAllAsync<{ workout_name: string }>(
        `SELECT DISTINCT Workout_Log.workout_name
         FROM Weight_Log
         INNER JOIN Workout_Log 
         ON Weight_Log.workout_log_id = Workout_Log.workout_log_id;`
      );

      const workouts = result.map((row) => row.workout_name);
      setWorkouts(workouts);
    } catch (error) {
      console.error('Error fetching workouts with logs:', error);
    }
  };

  const handleWorkoutPress = (workoutName: string) => {
    navigation.navigate('WeightLogDetail', { workoutName });
  };

  const deleteAssociatedDays = async (workoutName: string) => {
    try {
      // Get associated workout_log_ids for the given workout
      const workoutLogs = await db.getAllAsync<{ workout_log_id: number }>(
        `SELECT workout_log_id FROM Workout_Log WHERE workout_name = ?`,
        [workoutName]
      );

      const workoutLogIds = workoutLogs.map((log) => log.workout_log_id);

      if (workoutLogIds.length > 0) {
        // Delete Weight_Log entries associated with these workout_log_ids
        await db.runAsync(
          `DELETE FROM Weight_Log WHERE workout_log_id IN (${workoutLogIds.join(',')});`
        );
        fetchWorkoutsWithLogs(); // Refresh the list after deletion
      }
    } catch (error) {
      console.error('Error deleting associated days:', error);
      Alert.alert(t('errorTitle'), t('failedToDeleteDays'));
    }
  };

  const handleWorkoutLongPress = (workoutName: string) => {
    Alert.alert(
      t('deleteLogsTitle'),
      t('deleteLogsMessage'),
      [
        { text: t('alertCancel'), style: 'cancel' },
        {
          text: t('alertDelete'),
          style: 'destructive',
          onPress: () => deleteAssociatedDays(workoutName),
        },
      ]
    );
  };

  return (
<View style={[styles.container, { backgroundColor: theme.background }]}>
  {/* Title */}
  <Text style={[styles.title, { color: theme.text }]}>{t('myProgress')}</Text>

  {/* Buttons Row */}
  <View style={styles.buttonRow}>
  

    {/* Log Weights Button */}
    <TouchableOpacity
      style={[styles.actionButton, { backgroundColor: theme.buttonBackground }]}
      onPress={() => navigation.navigate('LogWeights')}
    >
      <Ionicons name="stats-chart" size={24} color={theme.buttonText} />
      <Text style={[styles.actionButtonText, { color: theme.buttonText }]}>
        {t('trackAWorkout')}
      </Text>
    </TouchableOpacity>

  {/* Graphs Button */}
  <TouchableOpacity
      style={[styles.actionButton, { backgroundColor: theme.buttonBackground }]}
      onPress={() => navigation.navigate('GraphsWorkoutSelection')}
    >
      <Ionicons name="trending-up" size={24} color={theme.buttonText} />
      <Text style={[styles.actionButtonText, { color: theme.buttonText }]}>
        {t('Graphs')}
      </Text>
    </TouchableOpacity>





  </View>

  <TouchableOpacity
        style={[styles.workoutCard, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={() => navigation.navigate('AllLogs')}
        >
        {/* Container to align the icon and text */}
        <View style={styles.workoutCardContent}>
          <Text style={[styles.workoutText, { color: theme.text }]}>{t('allTracks')}</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.text} />
        </View>
        
      </TouchableOpacity>


  <TouchableOpacity
        style={[styles.workoutCard, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={() => navigation.navigate('AllLogs')}
        >
        {/* Container to align the icon and text */}
        <View style={styles.workoutCardContent}>
          <Text style={[styles.workoutText, { color: theme.text }]}>{t('allTracks')}</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.text} />
        </View>
        
      </TouchableOpacity>


  {/* List of Workouts with Logs */}
  <FlatList
    data={workouts}
    keyExtractor={(item) => item}
    renderItem={({ item }) => (
      <TouchableOpacity
        style={[styles.workoutCard, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={() => handleWorkoutPress(item)}
        onLongPress={() => handleWorkoutLongPress(item)}
      >
        {/* Container to align the icon and text */}
        <View style={styles.workoutCardContent}>
          <Text style={[styles.workoutText, { color: theme.text }]}>{item}</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.text} />
        </View>
        
      </TouchableOpacity>
      
    )}

    

    ListEmptyComponent={
      <Text style={[styles.emptyText, { color: theme.text }]}>
        {t('notTracking')}
      </Text>
    }
  />
<Text style={[styles.tipText, { color: theme.text }]}>
  {t('myProgressTip')}  
  </Text>

  




</View>

  );
}


// MyProgress.tsx

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 20,
    marginTop: 40,
    textAlign: 'center',
    color: '#000000',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: '#000000',
    borderRadius: 20,
    paddingVertical: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 0.48, // Take up slightly less than half the available space
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16, // Slightly smaller to fit
    marginLeft: 8,
  },
  tipText: {
    marginTop: 20, // Space above the text
    paddingBottom:20,
    textAlign: 'center', // Center align
    fontSize: 14, // Smaller font size
    fontStyle: 'italic', // Italic for emphasis
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
    shadowOpacity: 0.8,
    shadowRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  workoutCardContent: {
    flexDirection: 'row', // Align items in a row
    paddingHorizontal: 16,
    justifyContent: 'space-between', // Space between the text and the icon
    alignItems: 'center', // Align vertically in the center
    width: '100%', // Ensure content takes up the full width
  },
  workoutText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666666',
    fontSize: 16,
    marginTop: 20,
  },
  adContainer: {
    alignItems: 'center',
    
  },
});
