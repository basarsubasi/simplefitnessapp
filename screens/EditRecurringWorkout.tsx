import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, TextInput, Platform, Modal, Alert, ActivityIndicator, Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { WorkoutLogStackParamList } from '../App';
import { useSQLiteContext } from 'expo-sqlite';
import { useRecurringWorkouts } from '../utils/recurringWorkoutUtils';
import { useSettings } from '../context/SettingsContext';
import DateTimePicker from '@react-native-community/datetimepicker';

// Add this to your WorkoutLogStackParamList in App.tsx
// EditRecurringWorkout: { recurring_workout_id: number };

type NavigationProp = StackNavigationProp<
  WorkoutLogStackParamList,
  'EditRecurringWorkout'
>;

type RouteProps = RouteProp<
  WorkoutLogStackParamList,
  'EditRecurringWorkout'
>;



interface RecurringWorkout {
  recurring_workout_id: number;
  workout_id: number;
  workout_name: string;
  day_name: string;
  recurring_interval: number;
  recurring_days: string | null;
  notification_enabled: number;
  notification_time: string | null;
}

export default function EditRecurringWorkout() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const db = useSQLiteContext();
  const { updateRecurringWorkout } = useRecurringWorkouts();
  const { notificationPermissionGranted, timeFormat } = useSettings();


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
    

  // State
  const [recurringWorkout, setRecurringWorkout] = useState<RecurringWorkout | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state
  const [intervalType, setIntervalType] = useState<'everyday' | 'custom' | 'weekly'>('everyday');
  const [customDaysInterval, setCustomDaysInterval] = useState('2');
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationTime, setNotificationTime] = useState<Date>(() => {
    const date = new Date();
    date.setHours(8, 0, 0, 0);
    return date;
  });
  
  // UI state
  const [showWeekdaySelector, setShowWeekdaySelector] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Get recurring workout ID from route params
  const recurring_workout_id = route.params?.recurring_workout_id;

  // Fetch recurring workout data
  const fetchRecurringWorkout = useCallback(async () => {
    if (!recurring_workout_id) return;
    
    setIsLoading(true);
    try {
      console.log(`DEBUG: Fetching recurring workout ID: ${recurring_workout_id}`);
      const result = await db.getAllAsync<RecurringWorkout>(
        `SELECT 
          recurring_workout_id, 
          workout_id,
          workout_name, 
          day_name, 
          recurring_interval, 
          recurring_days,
          notification_enabled,
          notification_time
        FROM Recurring_Workouts 
        WHERE recurring_workout_id = ?`,
        [recurring_workout_id]
      );
      
      if (result.length > 0) {
        const workout = result[0];
        console.log('DEBUG: Found recurring workout:', workout);
        setRecurringWorkout(workout);
        
        // Set form state based on workout data
        initializeFormState(workout);
      } else {
        console.log('DEBUG: No recurring workout found with that ID');
        Alert.alert(
          t('error'),
          t('recurringWorkoutNotFound'),
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      console.error('Error fetching recurring workout:', error);
      Alert.alert(
        t('error'),
        t('errorLoadingRecurringWorkout'),
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } finally {
      setIsLoading(false);
    }
  }, [db, recurring_workout_id, navigation, t]);

  // Initialize form state based on fetched data
  const initializeFormState = (workout: RecurringWorkout) => {
    // Handle interval type
    if (workout.recurring_interval === 0 && workout.recurring_days) {
      // Weekly schedule
      setIntervalType('weekly');
      if (workout.recurring_days) {
        setSelectedWeekdays(workout.recurring_days.split(',').map(d => parseInt(d, 10)));
      }
    } else if (workout.recurring_interval === 1) {
      // Daily
      setIntervalType('everyday');
    } else {
      // Custom interval
      setIntervalType('custom');
      setCustomDaysInterval(workout.recurring_interval.toString());
    }
    
    // Handle notifications
    setNotificationsEnabled(workout.notification_enabled === 1);
    
    // Handle notification time
    if (workout.notification_time) {
      const [hours, minutes] = workout.notification_time.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      setNotificationTime(date);
    }
  };

  // Load data when component mounts
  useEffect(() => {
    fetchRecurringWorkout();
  }, [fetchRecurringWorkout]);
  
  // Format time for display
  const formatTime = (date: Date): string => {
    if (timeFormat === 'AM/PM') {
      return date.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
    }
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  // Toggle weekday selection
  const toggleWeekday = (dayId: number) => {
    if (selectedWeekdays.includes(dayId)) {
      setSelectedWeekdays(selectedWeekdays.filter(d => d !== dayId));
    } else {
      setSelectedWeekdays([...selectedWeekdays, dayId]);
    }
  };

  // Handle time change from picker
  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setNotificationTime(selectedTime);
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

  // Check if notification permissions are granted before enabling
  const handleNotificationToggle = (value: boolean) => {
    if (value && !notificationPermissionGranted) {
      // User is trying to enable notifications but doesn't have permission
      Alert.alert(
        t('notificationPermissions'),
        t('notificationPermissionsRequired'),
        [
          {
            text: t('cancel'),
            style: 'cancel'
          },
          {
            text: t('goToSettings'),
            onPress: () => navigation.navigate('Settings' as never)
          }
        ]
      );
    } else {
      // Either turning off notifications or has permission
      setNotificationsEnabled(value);
    }
  };

  // Save updated workout
  const saveChanges = async () => {
    if (!recurringWorkout) return;
    
    setIsSaving(true);
    console.log('DEBUG: Saving recurring workout changes');
    
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

      // Format notification time as string (HH:MM)
      const timeString = notificationsEnabled 
        ? `${String(notificationTime.getHours()).padStart(2, '0')}:${String(notificationTime.getMinutes()).padStart(2, '0')}` 
        : undefined;
      
      console.log(`DEBUG: Notifications Enabled: ${notificationsEnabled}`);
      if (notificationsEnabled) {
        console.log(`DEBUG: Notification Time: ${timeString}`);
      }
      
      const updates = {
        recurring_interval: recurringInterval,
        recurring_days: recurringDays,
        notification_enabled: notificationsEnabled,
        notification_time: timeString
      };
      
      console.log('DEBUG: Updating recurring workout with parameters:', updates);
      
      // Update recurring workout
      const success = await updateRecurringWorkout(recurringWorkout.recurring_workout_id, updates);

      if (success) {
        console.log('DEBUG: Successfully updated recurring workout');
        navigation.navigate('MyCalendar');
      } else {
        console.error('DEBUG: Failed to update recurring workout - returned false');
        Alert.alert(
          t('error'),
          t('failedToUpdateRecurringWorkout')
        );
      }
    } catch (error) {
      console.error('DEBUG: Error updating recurring workout:', error);
      Alert.alert(
        t('error'),
        t('anErrorOccurred')
      );
    } finally {
      console.log('DEBUG: Finished recurring workout update process');
      setIsSaving(false);
    }
  };

  // Check if form is valid and can be submitted
  const isFormValid = (): boolean => {
    if (intervalType === 'custom') {
      const interval = parseInt(customDaysInterval);
      if (isNaN(interval) || interval < 1) return false;
    }

    if (intervalType === 'weekly' && selectedWeekdays.length === 0) {
      return false;
    }

    return true;
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.buttonBackground} />
      </View>
    );
  }

  if (!recurringWorkout) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.text }]}>
          {t('workoutNotFound')}
        </Text>
        <TouchableOpacity 
          style={[styles.backButtonLarge, { backgroundColor: theme.buttonBackground }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.backButtonText, { color: theme.buttonText }]}>
            {t('goBack')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

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
        {t('editRecurringWorkout')}
      </Text>
      
      <View style={styles.formContainer}>
        {/* Workout Information (read-only) */}
        <View style={[styles.infoSection, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {t('workoutDetails')}
          </Text>
          
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: theme.text }]}>
              {t('workout')}:
            </Text>
            <Text style={[styles.value, { color: theme.text }]}>
              {recurringWorkout.workout_name}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: theme.text }]}>
              {t('day')}:
            </Text>
            <Text style={[styles.value, { color: theme.text }]}>
              {recurringWorkout.day_name}
            </Text>
          </View>
        </View>
        
        {/* Recurring Interval Selection */}
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
                {t('everyXDays')}
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
                {t('days')}
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
        
        {/* Notification Settings */}
        <View style={[styles.notificationSection, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {t('notifications')}
          </Text>
          
          <View style={styles.switchRow}>
            <Text style={[styles.switchLabel, { color: theme.text }]}>
              {t('enableNotifications')}
            </Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationToggle}
              trackColor={{ false: '#767577', true: theme.buttonBackground }}
              thumbColor={'#f4f3f4'}
            />
          </View>
          
          {notificationsEnabled && (
            <TouchableOpacity 
              style={styles.timeSelector}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={[styles.timeSelectorText, { color: theme.text }]}>
                {t('notificationTime')}: {formatTime(notificationTime)}
              </Text>
              <Ionicons name="time-outline" size={22} color={theme.text} />
            </TouchableOpacity>
          )}
          
          {showTimePicker && (
            <DateTimePicker
              value={notificationTime}
              mode="time"
              is24Hour={timeFormat === '24h'}
              display="default"
              onChange={handleTimeChange}
            />
          )}
        </View>

        {/* Save Button */}
        {isFormValid() && (
          <TouchableOpacity
            style={[
              styles.saveButton, 
              { backgroundColor: theme.buttonBackground },
              isSaving && { opacity: 0.7 }
            ]}
            onPress={saveChanges}
            disabled={isSaving}
          >
            <Text style={[styles.saveButtonText, { color: theme.buttonText }]}>
              {isSaving ? t('saving') : t('saveChanges')}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  backButtonLarge: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
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
  infoSection: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
  notificationSection: {
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  value: {
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
  saveButton: {
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
  saveButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
