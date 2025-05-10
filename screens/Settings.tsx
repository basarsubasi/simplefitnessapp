import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { FlatList } from 'react-native-gesture-handler';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '../utils/useNotifications';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

export default function Settings() {

  const { 
    dateFormat, 
    setDateFormat, 
    weightFormat, 
    setWeightFormat, 
    language, 
    setLanguage,
    notificationPermissionGranted,
    setNotificationPermissionGranted
  } = useSettings();
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation(); // for translations
  
  // Use the notifications hook to access all notification-related functionality
  const { 
    requestNotificationPermission,
    cancelAllNotifications
  } = useNotifications();

  // Manages whether the language dropdown is visible
  const [languageDropdownVisible, setLanguageDropdownVisible] = useState(false);

  // Languages array with i18n-compatible codes
  const languages = [
    { code: 'cs', label: 'Čeština' },
    { code: 'de', label: 'Deutsch' },
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Español' },
    { code: 'fi', label: 'Suomi' },
    { code: 'fr', label: 'Français' },
    { code: 'it', label: 'Italiano' },
    { code: 'nl', label: 'Nederlands' },
    { code: 'no', label: 'Norsk' },
    { code: 'pl', label: 'Polski' },
    { code: 'pt', label: 'Português' },
    { code: 'ru', label: 'Русский' },
    { code: 'sl', label: 'Slovenščina' },
    { code: 'sv', label: 'Svenska' },
    { code: 'tr', label: 'Türkçe' },
    { code: 'uk', label: 'Українська' },
    // add more languages here #2
  ];
  

  // We'll display the label corresponding to the current context language
  const currentLanguage = language;

  /**
   * Handle user selecting a language. We just call setLanguage;
   * the context will automatically sync i18n for us.
   */
  const handleLanguageChange = (languageCode: string) => {
    setLanguage(languageCode);
    setLanguageDropdownVisible(false); // close dropdown
  };

  const handleDateFormatChange = (format: string) => {
    setDateFormat(format);
  };

  const handleWeightFormatChange = (format: string) => {
    setWeightFormat(format);
  };

  // Handle notification main toggle change
  const handleNotificationToggle = async (value: boolean) => {
    if (value) {
      // Request permission when toggle is turned on
      const granted = await requestNotificationPermission();
      setNotificationPermissionGranted(granted);
    } else {
      // Show confirmation alert when turning off
      Alert.alert(
        t('notificationsDisableTitle') || 'Disable Notifications', 
        t('notificationsDisableMessage') || 'Turning off notifications will cancel all scheduled workout reminders. Are you sure?',
        [
          {
            text: t('cancel') || 'Cancel',
            style: 'cancel',
          },
          { 
            text: t('confirm') || 'Confirm', 
            onPress: async () => {
              // Cancel all notifications and update settings
              await cancelAllNotifications();
              setNotificationPermissionGranted(false);
            }
          },
        ],
        { cancelable: true }
      );
    }
  };

  // Renders the button that toggles the language dropdown
  const renderLanguageButton = () => (
    <TouchableOpacity
      style={styles.dropdownButton}
      onPress={() => setLanguageDropdownVisible((prev) => !prev)}
    >
      <Text style={[styles.buttonText, { color: 'white' }]}>
        {
          languages.find((lang) => lang.code === currentLanguage)?.label 
          || 'Select Language'
        }
      </Text>
      <Ionicons
        name={languageDropdownVisible ? 'chevron-up' : 'chevron-down'}
        size={18}
        color="white"
        style={styles.dropdownIcon}
      />
    </TouchableOpacity>
  );

  /**
   * Renders each format button (for Date & Weight).
   * `label` is the string to display (e.g. 'dd-mm-yyyy'),
   * `current` is the current format from context,
   * `onPress` is the callback to set that format.
   */
  const renderButton = (label: string, current: string, onPress: () => void) => (
    <TouchableOpacity
      style={[styles.button, current === label && styles.activeButton]}
      onPress={onPress}
    >
      <View style={styles.buttonContent}>
        <Text style={[styles.buttonText, current === label && styles.activeButtonText]}>
          {label}
        </Text>
        {current === label && (
          <Ionicons
            name="checkmark"
            size={18}
            color="white"
            style={styles.tickIcon}
          />
        )}
      </View>
    </TouchableOpacity>
  );

  // Database management functions
  const exportDatabase = async () => {
    try {
      const dbName = "SimpleDB.db";
      const dbFilePath = `${FileSystem.documentDirectory}SQLite/${dbName}`;
      
      const fileInfo = await FileSystem.getInfoAsync(dbFilePath);
      
      if (!fileInfo.exists) {
        Alert.alert(
          t('exportFailedTitle') || 'Export Failed',
          t('databaseNotFound') || 'Database file not found',
          [{ text: 'OK' }]
        );
        return;
      }
      
      const tempExportPath = `${FileSystem.cacheDirectory}${dbName}`;
      await FileSystem.copyAsync({
        from: dbFilePath,
        to: tempExportPath
      });
      
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (!isAvailable) {
        Alert.alert(
          t('exportFailedTitle') || 'Export Failed',
          t('sharingNotAvailable') || 'Sharing is not available on this device',
          [{ text: 'OK' }]
        );
        return;
      }
      
      await Sharing.shareAsync(tempExportPath, {
        mimeType: 'application/x-sqlite3', // Standard MIME type
        dialogTitle: t('exportDatabaseTitle') || 'Export Workout Database',
        UTI: 'public.database'
      });
      
    } catch (error) {
      console.error("Error exporting database:", error);
      Alert.alert(
        t('exportFailedTitle') || 'Export Failed',
        t('exportErrorMessage') || 'Failed to export database. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };
  
  const importDatabase = async () => {
    Alert.alert(
      t('importConfirmTitle') || 'Import Database',
      t('importConfirmMessage') || 'Importing a database will replace your current data. This action cannot be undone. Continue?',
      [
        { text: t('cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('confirm') || 'Confirm',
          onPress: async () => {
            const dbName = "SimpleDB.db";
            const dbDirectory = `${FileSystem.documentDirectory}SQLite/`;
            const dbFilePath = `${dbDirectory}${dbName}`;
            const backupDbFilePath = `${dbFilePath}.backup`;

            let documentPickerResult;
            try {
              documentPickerResult = await DocumentPicker.getDocumentAsync({
                type: ['application/x-sqlite3', 'application/octet-stream', 'application/vnd.sqlite3'],
                copyToCacheDirectory: true,
              });

              if (documentPickerResult.canceled || !documentPickerResult.assets || documentPickerResult.assets.length === 0 || !documentPickerResult.assets[0].uri) {
                Alert.alert(
                  t('importFailedTitle') || 'Import Failed',
                  t('fileNotSelectedError') || 'No file was selected or the file is invalid.'
                );
                return;
              }
            } catch (pickerError) {
              console.error("DocumentPicker error:", pickerError);
              Alert.alert(
                t('importFailedTitle') || 'Import Failed',
                t('filePickerError') || 'An error occurred while selecting the file. Please try again.'
              );
              return;
            }

            const sourceUri = documentPickerResult.assets[0].uri;
            let originalDbExists = false;
            let backupSuccessfullyCreated = false;

            try {
              const originalDbInfo = await FileSystem.getInfoAsync(dbFilePath);
              originalDbExists = originalDbInfo.exists;

              if (originalDbExists) {
                await FileSystem.copyAsync({ from: dbFilePath, to: backupDbFilePath });
                backupSuccessfullyCreated = true;
              }

              await FileSystem.deleteAsync(dbFilePath, { idempotent: true });
              await FileSystem.copyAsync({ from: sourceUri, to: dbFilePath });

              Alert.alert(
                t('importSuccessTitle') || 'Import Successful',
                t('importSuccessMessage') || 'Database imported successfully. Please restart the app for changes to take effect.',
                [{ text: 'OK' }]
              );

              if (backupSuccessfullyCreated) {
                await FileSystem.deleteAsync(backupDbFilePath, { idempotent: true });
              }

            } catch (error) {
              console.error("Error during database replacement:", error);
              let finalAlertMessage = t('importErrorMessageDefault') || 'Database import failed. An unexpected error occurred.';

              if (backupSuccessfullyCreated) {
                try {
                  await FileSystem.deleteAsync(dbFilePath, { idempotent: true });
                  await FileSystem.copyAsync({ from: backupDbFilePath, to: dbFilePath });
                  finalAlertMessage = t('importFailedRestoreSuccess') || 'Import failed, but your original data has been successfully restored.';
                  await FileSystem.deleteAsync(backupDbFilePath, { idempotent: true });
                } catch (restoreError) {
                  console.error("CRITICAL: Error restoring database from backup:", restoreError);
                  const baseMsg = t('importFailedRestoreErrorBase') || 'Import failed. CRITICAL: Could not restore original data. Backup may be available at: ';
                  finalAlertMessage = baseMsg + backupDbFilePath;
                  // IMPORTANT: Do NOT delete backupDbFilePath in this critical failure case.
                }
              } else if (originalDbExists) {
                finalAlertMessage = t('importFailedOriginalIntact') || 'Import failed (error during backup step). Your original data should be intact.';
              } else {
                finalAlertMessage = t('importFailedNewFileError') || 'Import failed while copying the new database. No prior data existed.';
              }
              Alert.alert(t('importFailedTitle') || 'Import Failed', finalAlertMessage, [{ text: 'OK' }]);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>


      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Title */}
        <Text style={[styles.title, { color: theme.text }]}>{t('settingsTitle')}</Text>


        {/* Language Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('settingsLanguage')}</Text>
          {renderLanguageButton()}
          {languageDropdownVisible && (
            <FlatList
              data={languages}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.dropdownItem,
                    currentLanguage === item.code && styles.activeDropdownItem,
                  ]}
                  onPress={() => handleLanguageChange(item.code)}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      currentLanguage === item.code && styles.activeDropdownItemText,
                    ]}
                  >
                    {item.label}{' '}
                    {currentLanguage === item.code && (
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color="white"
                        style={styles.tickIcon}
                      />
                    )}
                  </Text>
                </TouchableOpacity>
              )}
              style={styles.dropdownList}
            />
          )}
        </View>

{/* Notification Settings Section / Translate this to the other languages */}
<View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('notifications')}</Text>
          
          {/* Main Notification Toggle */}
          <View style={styles.toggleRow}>
            <Text style={[styles.toggleText, { color: '#FFFFFF' }]}>{t('remindScheduledWorkouts')}</Text>
            <Switch
              value={notificationPermissionGranted}
              onValueChange={handleNotificationToggle}
              trackColor={{ false: '#767577', true: '#FFFFFF' }}
              thumbColor={notificationPermissionGranted ? '#ffffff' : '#f4f3f4'}
            />
          </View>
        </View>












        {/* Date Format Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('settingsDateFormat')}</Text>
          <View style={styles.buttonGroup}>
            {renderButton('dd-mm-yyyy', dateFormat, () => handleDateFormatChange('dd-mm-yyyy'))}
            {renderButton('mm-dd-yyyy', dateFormat, () => handleDateFormatChange('mm-dd-yyyy'))}
          </View>
        </View>

        {/* Weight Format Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('settingsWeightFormat')}</Text>
          <View style={styles.buttonGroup}>
            {renderButton('kg', weightFormat, () => handleWeightFormatChange('kg'))}
            {renderButton('lbs', weightFormat, () => handleWeightFormatChange('lbs'))}
          </View>
        </View>

        

        {/* Theme Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('settingsTheme')}</Text>
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={[
                styles.button,
                theme.background === '#FFFFFF' && styles.activeButton,
              ]}
              onPress={toggleTheme}
            >
              <Text
                style={[
                  styles.buttonText,
                  theme.background === '#FFFFFF' && styles.activeButtonText,
                ]}
              >
                {theme.background === '#FFFFFF' ? t('settingsSwitchDark') : t('settingsSwitchLight')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Data Management Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('dataManagement') || 'Data Management'}</Text>
          
          <View style={styles.dataManagementButtonGroup}>
            {/* Export Database Button */}
            <TouchableOpacity 
              style={[
                styles.dataManagementButton,
                { backgroundColor:'#121212' }
              ]} 
              onPress={exportDatabase}
            >
              <View style={styles.dataManagementButtonContent}>
                <Ionicons 
                  name="share-outline" 
                  size={18} 
                  color={'#FFFFFF'} 
                  style={styles.dataButtonIcon} 
                />
                <Text 
                  style={[
                    styles.dataManagementButtonText, 
                    { color:'#FFFFFF' }
                  ]}
                  numberOfLines={2}
                >
                  {t('exportData') || 'Export Data'}
                </Text>
              </View>
            </TouchableOpacity>
            
            {/* Import Database Button */}
            <TouchableOpacity 
              style={[
                styles.dataManagementButton,
                { backgroundColor:'#FFFFFF' }
              ]} 
              onPress={importDatabase}
            >
              <View style={styles.dataManagementButtonContent}>
                <Ionicons 
                  name="download-outline" 
                  size={18} 
                  color={'#000000'} 
                  style={styles.dataButtonIcon} 
                />
                <Text 
                  style={[
                    styles.dataManagementButtonText, 
                    { color:'#000000' }
                  ]}
                  numberOfLines={2}
                >
                  {t('importData') || 'Import Data'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 10,
    zIndex: 10,
    padding: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    marginBottom: 30,
    textAlign: 'center',
    color: '#000000',
  },
  section: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 15,
    color: '#000000',
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  button: {
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
  },
  activeButton: {
    backgroundColor: '#121212',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  activeButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tickIcon: {
    marginLeft: 10,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'black',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#121212',
  },
  dropdownIcon: {
    marginLeft: 10,
  },
  dropdownList: {
    maxHeight: 200,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'black',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  activeDropdownItem: {
    backgroundColor: '#121212',
  },
  dropdownItemText: {
    fontSize: 18,
    fontWeight: '600',
  },
  activeDropdownItemText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#121212',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#000000',
    marginBottom: 10,
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  dataButtonIcon: {
    marginRight: 5,
  },
  dataManagementButtonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 10,
  },
  dataManagementButton: {
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    minWidth: 130,
    flex: 1,
    marginHorizontal: 5,
  },
  dataManagementButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  dataManagementButtonText: {
    fontSize: 18,
    fontWeight: '600',
    flexShrink: 1,
  },
});
