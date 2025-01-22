// screens/Workouts.tsx

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { TemplateWorkouts, Workout } from '../types';
import { useSQLiteContext } from 'expo-sqlite';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import TemplateList from '../components/TemplateList';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { WorkoutStackParamList } from '../App';
import { StackNavigationProp } from '@react-navigation/stack';


type WorkoutListNavigationProp = StackNavigationProp<WorkoutStackParamList, 'Template'>;


export default function Template() {
  const [workouts, setWorkouts] = React.useState<TemplateWorkouts[]>([]);
  const db = useSQLiteContext();
    const { theme } = useTheme();
    const { t } = useTranslation(); // Initialize translations
    const navigation = useNavigation<WorkoutListNavigationProp>();
    const route = useRoute();
    


   // Use useFocusEffect to fetch workouts when the screen is focused
   useFocusEffect(
    React.useCallback(() => {
      db.withTransactionAsync(getWorkouts);
    }, [db])
  );

  async function getWorkouts() {
    const result = await db.getAllAsync<TemplateWorkouts>('SELECT * FROM Template_Workouts;');
    console.log(result);
    setWorkouts(result);
  }

  

  return (


    


    <View style={[styles.container, { backgroundColor: theme.background }]}>
           <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
      <TemplateList workouts={workouts}/>
    </View>
    
  );
}

// Workouts.tsx

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  adContainer: {
    alignItems: 'center',
    marginBottom:10,
  },

  backButton: { 
    position: 'absolute', 
    top: 20, 
    left: 10, 
    padding: 8, 
    zIndex: 10 },

  
});
