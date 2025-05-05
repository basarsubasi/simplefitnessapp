import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
   
  TextInput,
  
  Modal,
  
  Keyboard,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { WorkoutLogStackParamList } from '../App';
import { useSQLiteContext } from 'expo-sqlite';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRecurringWorkouts } from '../utils/recurringWorkoutUtils';

type NavigationProp = StackNavigationProp<
  WorkoutLogStackParamList,
  'CreateRecurringWorkout'
>;

type Workout = {
  workout_id: number;
  workout_name: string;
};

type Day = {
  day_id: number;
  day_name: string;
};

export default function CreateRecurringWorkout() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const db = useSQLiteContext();
  const { createRecurringWorkout } = useRecurringWorkouts();

  // Using t() for day names inside the component
  const DAYS_OF_WEEK = [
    { id: 1, name: t('Monday') },
    { id: 2, name: t('Tuesday') },
    { id: 3, name: t('Wednesday') },
    { id: 4, name: t('Thursday') },
    { id: 5, name: t('Friday') },
    { id: 6, name: t('Saturday') },
    { id: 0, name: t('Sunday') },
  ];

  // State for form elements
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [days, setDays] = useState<Day[]>([]);
  const [selectedWorkout, setSelectedWorkout] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedWorkoutName, setSelectedWorkoutName] = useState<string>('');
  const [selectedDayName, setSelectedDayName] = useState<string>('');
  
  // Interval selection states
  const [intervalType, setIntervalType] = useState<'everyday'|'custom'|'weekly'>('everyday');
  const [customDaysInterval, setCustomDaysInterval] = useState<string>('2');
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);
  const [showWeekdaySelector, setShowWeekdaySelector] = useState<boolean>(false);
  
  // UI states
  const [showWorkoutList, setShowWorkoutList] = useState<boolean>(false);
  const [showDayList, setShowDayList] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Fetch workouts on component mount
  useEffect(() => {
    fetchWorkouts();
  }, []);

  // Fetch workouts from database
  const fetchWorkouts = async () => {
    try {
      const result = await db.getAllAsync<Workout>(
        'SELECT workout_id, workout_name FROM Workouts ORDER BY workout_name;'
      );
      setWorkouts(result);
    } catch (error) {
      console.error('Error fetching workouts:', error);
    }
  };

  // Fetch days for selected workout
  const fetchDays = useCallback(async (workoutId: number) => {
    try {
      const result = await db.getAllAsync<Day>(
        'SELECT day_id, day_name FROM Days WHERE workout_id = ? ORDER BY day_id;',
        [workoutId]
      );
      setDays(result);
    } catch (error) {
      console.error('Error fetching days:', error);
    }
  }, [db]);

  // When workout selection changes, fetch days and reset day selection
  useEffect(() => {
    if (selectedWorkout) {
      fetchDays(selectedWorkout);
      setSelectedDay(null);
      setSelectedDayName('');
      
      // Find and set selected workout name
      const workout = workouts.find(w => w.workout_id === selectedWorkout);
      if (workout) {
        setSelectedWorkoutName(workout.workout_name);
      }
    }
  }, [selectedWorkout, fetchDays, workouts]);

  // Update selected day name when selected day changes
  useEffect(() => {
    if (selectedDay) {
      const day = days.find(d => d.day_id === selectedDay);
      if (day) {
        setSelectedDayName(day.day_name);
      }
    }
  }, [selectedDay, days]);

  // Toggle weekday selection
  const toggleWeekday = (dayId: number) => {
    if (selectedWeekdays.includes(dayId)) {
      setSelectedWeekdays(selectedWeekdays.filter(d => d !== dayId));
    } else {
      setSelectedWeekdays([...selectedWeekdays, dayId]);
    }
  };

  // Calculate recurring interval based on selection
  const getRecurringInterval = (): number => {
    switch (intervalType) {
      case 'everyday':
        return 1; // Everyday = 1 day interval
      case 'custom':
        return parseInt(customDaysInterval) || 2; // Parse custom interval, default to 2
      case 'weekly':
        return 0; // 0 indicates to use recurring_days instead
      default:
        return 1;
    }
  };

  // Get recurring days string for weekly selection
  const getRecurringDays = (): string | undefined => {
    if (intervalType === 'weekly' && selectedWeekdays.length > 0) {
      return selectedWeekdays.sort().join(',');
    }
    return undefined;
  };

  // Save recurring workout
  const saveRecurringWorkout = async () => {
    if (!selectedWorkout || !selectedDay) {
      console.log('DEBUG: Missing workout or day selection');
      return;
    }

    setIsLoading(true);
    console.log('DEBUG: Starting recurring workout creation process');
    console.log(`DEBUG: Selected Workout ID: ${selectedWorkout}, Name: ${selectedWorkoutName}`);
    console.log(`DEBUG: Selected Day ID: ${selectedDay}, Name: ${selectedDayName}`);
    
    try {
      // Calculate interval and days
      const recurringInterval = getRecurringInterval();
      const recurringDays = getRecurringDays();
      
      console.log(`DEBUG: Interval Type: ${intervalType}`);
      console.log(`DEBUG: Recurring Interval Value: ${recurringInterval}`);
      
      if (intervalType === 'weekly') {
        console.log(`DEBUG: Selected Weekdays: ${selectedWeekdays.join(',')}`);
        console.log(`DEBUG: Recurring Days String: ${recurringDays}`);
      } else if (intervalType === 'custom') {
        console.log(`DEBUG: Custom Days Interval: ${customDaysInterval}`);
      }
      
      console.log('DEBUG: Creating recurring workout with parameters:', {
        workout_id: selectedWorkout,
        workout_name: selectedWorkoutName,
        day_name: selectedDayName,
        recurring_interval: recurringInterval,
        recurring_days: recurringDays,
      });
      
      // Create recurring workout
      const success = await createRecurringWorkout({
        workout_id: selectedWorkout,
        workout_name: selectedWorkoutName,
        day_name: selectedDayName,
        recurring_interval: recurringInterval,
        recurring_days: recurringDays,
      });

      if (success) {
        console.log('DEBUG: Successfully created recurring workout');
        navigation.navigate('MyCalendar');
      } else {
        console.error('DEBUG: Failed to create recurring workout - returned false');
      }
    } catch (error) {
      console.error('DEBUG: Error creating recurring workout:', error);
    } finally {
      console.log('DEBUG: Finished recurring workout creation process');
      setIsLoading(false);
    }
  };

  // Check if form is valid and can be submitted
  const isFormValid = (): boolean => {
    if (!selectedWorkout || !selectedDay) return false;
    
    if (intervalType === 'custom') {
      const interval = parseInt(customDaysInterval);
      if (isNaN(interval) || interval < 1) return false;
    }

    if (intervalType === 'weekly' && selectedWeekdays.length === 0) {
      return false;
    }

    return true;
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.background }]}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: 40 }}
      onScrollBeginDrag={Keyboard.dismiss}
    >
      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color={theme.text} />
      </TouchableOpacity>

      <Text style={[styles.title, { color: theme.text }]}>
        {t('createRecurringWorkout')}
      </Text>
      
      <View style={styles.formContainer}>
        {/* Workout Selection */}
        <View style={[styles.selectionSection, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {t('selectWorkout')}
          </Text>
          <TouchableOpacity 
            style={styles.selector}
            onPress={() => setShowWorkoutList(!showWorkoutList)}
          >
            <Text style={[styles.selectorText, { color: theme.text }]}>
              {selectedWorkoutName || t('selectWorkout')}
            </Text>
            <Ionicons 
              name={showWorkoutList ? "chevron-up" : "chevron-down"} 
              size={22} 
              color={theme.text} 
            />
          </TouchableOpacity>
          
          {showWorkoutList && (
            <View style={styles.dropdownList}>
              {workouts.map(workout => (
                <TouchableOpacity
                  key={workout.workout_id}
                  style={[
                    styles.dropdownItem,
                    selectedWorkout === workout.workout_id && 
                    {backgroundColor: theme.buttonBackground}
                  ]}
                  onPress={() => {
                    setSelectedWorkout(workout.workout_id);
                    setShowWorkoutList(false);
                  }}
                >
                  <View style={styles.dropdownItemContent}>
                    <Text
                      style={[
                        styles.dropdownText,
                        { color: theme.text },
                        selectedWorkout === workout.workout_id && {color: theme.buttonText}
                      ]}
                    >
                      {workout.workout_name}
                    </Text>
                    {selectedWorkout === workout.workout_id && (
                      <Ionicons name="checkmark" size={22} color={theme.buttonText} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        
        {/* Day Selection - only show if workout is selected */}
        {selectedWorkout && (
          <View style={[styles.selectionSection, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {t('selectDay')}
            </Text>
            <TouchableOpacity 
              style={styles.selector}
              onPress={() => setShowDayList(!showDayList)}
            >
              <Text style={[styles.selectorText, { color: theme.text }]}>
                {selectedDayName || t('selectDay')}
              </Text>
              <Ionicons 
                name={showDayList ? "chevron-up" : "chevron-down"} 
                size={22} 
                color={theme.text} 
              />
            </TouchableOpacity>
            
            {showDayList && (
              <View style={styles.dropdownList}>
                {days.map(day => (
                  <TouchableOpacity
                    key={day.day_id}
                    style={[
                      styles.dropdownItem,
                      selectedDay === day.day_id && 
                      {backgroundColor: theme.buttonBackground}
                    ]}
                    onPress={() => {
                      setSelectedDay(day.day_id);
                      setShowDayList(false);
                    }}
                  >
                    <View style={styles.dropdownItemContent}>
                      <Text
                        style={[
                          styles.dropdownText,
                          { color: theme.text },
                          selectedDay === day.day_id && {color: theme.buttonText}
                        ]}
                      >
                        {day.day_name}
                      </Text>
                      {selectedDay === day.day_id && (
                        <Ionicons name="checkmark" size={22} color={theme.buttonText} />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
        
        {/* Recurring Interval Selection - only show if day is selected */}
        {selectedDay && (
          <View style={[styles.selectionSection, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {t('recurringInterval')}
            </Text>
            
            {/* Everyday option */}
            <TouchableOpacity
              style={[
                styles.intervalOption,
                intervalType === 'everyday' && 
                {backgroundColor: theme.buttonBackground, borderColor: theme.buttonBackground}
              ]}
              onPress={() => setIntervalType('everyday')}
            >
              <Text
                style={[
                  styles.intervalText,
                  { color: theme.text },
                  intervalType === 'everyday' && {color: theme.buttonText}
                ]}
              >
                {t('everyday')}
              </Text>
              {intervalType === 'everyday' && (
                <Ionicons name="checkmark" size={22} color={theme.buttonText} />
              )}
            </TouchableOpacity>
            
            {/* Custom interval option */}
            <TouchableOpacity
              style={[
                styles.intervalOptionWithInput,
                intervalType === 'custom' && 
                {backgroundColor: theme.buttonBackground, borderColor: theme.buttonBackground}
              ]}
              onPress={() => setIntervalType('custom')}
            >
              <View style={styles.customIntervalRow}>
                <Text
                  style={[
                    styles.intervalText,
                    { color: intervalType === 'custom' ? theme.buttonText : theme.text },
                  ]}
                >
                  {t('dayInterval')}
                </Text>
                <TextInput
                  style={[
                    styles.dayInput,
                    { 
                      color: intervalType === 'custom' ? theme.buttonText : theme.text,
                      borderColor: intervalType === 'custom' ? theme.buttonText : 'rgba(0, 0, 0, 0.1)',
                    }
                  ]}
                  value={customDaysInterval}
                  onChangeText={setCustomDaysInterval}
                  keyboardType="numeric"
                  onFocus={() => setIntervalType('custom')}
                  maxLength={3}
                />
                <Text
                  style={[
                    styles.intervalText,
                    { color: intervalType === 'custom' ? theme.buttonText : theme.text },
                  ]}
                >
                </Text>
              </View>
              {intervalType === 'custom' && (
                <Ionicons name="checkmark" size={22} color={theme.buttonText} />
              )}
            </TouchableOpacity>
            
            {/* Weekly selection option */}
            <TouchableOpacity
              style={[
                styles.intervalOption,
                intervalType === 'weekly' && 
                {backgroundColor: theme.buttonBackground, borderColor: theme.buttonBackground}
              ]}
              onPress={() => {
                setIntervalType('weekly');
                setShowWeekdaySelector(true);
              }}
            >
              <Text
                style={[
                  styles.intervalText,
                  { color: theme.text },
                  intervalType === 'weekly' && {color: theme.buttonText}
                ]}
              >
                {t('specificDaysOfWeek')}
              </Text>
              {intervalType === 'weekly' && (
                <Ionicons name="checkmark" size={22} color={theme.buttonText} />
              )}
            </TouchableOpacity>
            
            {/* Show selected days summary if weekly is selected */}
            {intervalType === 'weekly' && selectedWeekdays.length > 0 && (
              <TouchableOpacity 
                style={styles.selectedDaysSummary}
                onPress={() => setShowWeekdaySelector(true)}
              >
                <Text style={{ color: theme.text }}>
                  {selectedWeekdays
                    .sort()
                    .map(dayId => t(DAYS_OF_WEEK.find(d => d.id === dayId)?.name || ''))
                    .join(', ')}
                </Text>
              </TouchableOpacity>
            )}
            
            {/* Days of week selector modal */}
            <Modal
              visible={showWeekdaySelector}
              transparent={true}
              animationType="fade"
            >
              <View style={styles.modalOverlay}>
                <View style={[styles.weekdaySelectorModal, { backgroundColor: theme.card }]}>
                  <Text style={[styles.modalTitle, { color: theme.text }]}>
                    {t('selectDaysOfWeek')}
                  </Text>
                  
                  {DAYS_OF_WEEK.map(day => (
                    <TouchableOpacity
                      key={day.id}
                      style={[
                        styles.weekdayOption,
                        selectedWeekdays.includes(day.id) && 
                        { backgroundColor: theme.buttonBackground }
                      ]}
                      onPress={() => toggleWeekday(day.id)}
                    >
                      <Text 
                        style={[
                          styles.weekdayText, 
                          { color: selectedWeekdays.includes(day.id) ? theme.buttonText : theme.text }
                        ]}
                      >
                        {t(day.name)}
                      </Text>
                      {selectedWeekdays.includes(day.id) && (
                        <Ionicons name="checkmark" size={22} color={theme.buttonText} />
                      )}
                    </TouchableOpacity>
                  ))}
                  
                  <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: theme.buttonBackground }]}
                    onPress={() => setShowWeekdaySelector(false)}
                  >
                    <Text style={[styles.saveButtonText, { color: theme.buttonText }]}>
                      {t('done')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          </View>
        )}

        {/* Create Button - only enable if all selections are made */}
        {isFormValid() && (
          <TouchableOpacity
            style={[
              styles.createButton, 
              { backgroundColor: theme.buttonBackground },
              isLoading && { opacity: 0.7 }
            ]}
            onPress={saveRecurringWorkout}
            disabled={isLoading}
          >
            <Text style={[styles.createButtonText, { color: theme.buttonText }]}>
              {isLoading ? t('creating') : t('createRecurringWorkout')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  backButton: {
    marginTop: 10,
    marginBottom: 20,
    padding: 8,
    zIndex: 10,
    alignSelf: 'flex-start',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 20,
    textAlign: 'center',
  },
  formContainer: {
    marginTop: 10,
  },
  selectionSection: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  selector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 8,
  },
  selectorText: {
    fontSize: 16,
  },
  dropdownList: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 8,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  dropdownItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  dropdownText: {
    fontSize: 16,
  },
  intervalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 8,
    marginBottom: 8,
  },
  intervalOptionWithInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 8,
    marginBottom: 8,
  },
  customIntervalRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  intervalText: {
    fontSize: 16,
  },
  dayInput: {
    width: 40,
    height: 30,
    borderWidth: 1,
    borderRadius: 4,
    marginHorizontal: 8,
    textAlign: 'center',
    fontSize: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 16,
  },
  timeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 8,
  },
  timeSelectorText: {
    fontSize: 16,
  },
  selectedDaysSummary: {
    padding: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekdaySelectorModal: {
    width: '80%',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  weekdayOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 8,
    marginBottom: 8,
  },
  weekdayText: {
    fontSize: 16,
  },
  createButton: {
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  saveButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});