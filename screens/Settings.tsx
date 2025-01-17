import React, {useState, useEffect, useCallback} from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSettings } from '../context/SettingsContext';
import {useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext'; 
import i18n from '../i18n';
import { FlatList } from 'react-native-gesture-handler';
import { useTranslation } from 'react-i18next';
import { saveSettings, loadSettings } from '../settingsStorage'
import * as Localization from 'expo-localization';





export default function Settings() {
  const navigation = useNavigation();
  const { dateFormat, setDateFormat, weightFormat, setWeightFormat } = useSettings();
  const { theme, toggleTheme } = useTheme();

  const { t } = useTranslation(); // Initialize translations
  const [languageDropdownVisible, setLanguageDropdownVisible] = useState(false);


  const languages = [
    { code: 'en', label: 'English' },
    { code: 'tr', label: 'Türkçe' },
  ];

  const currentLanguage = i18n.language;




  useFocusEffect(
    useCallback(() => {
      const fetchSettings = async () => {
        const savedSettings = await loadSettings();
        if (savedSettings && savedSettings.dateFormat) {
          setDateFormat(savedSettings.dateFormat);
        } else {
          setDateFormat('dd-mm-yyyy'); // Default to 'dd-mm-yyyy'
        }
  
        if (savedSettings && savedSettings.weightFormat) {
          setWeightFormat(savedSettings.weightFormat);
        } else {
          setWeightFormat('kg'); // Default to 'kg'
        }
  
        if (savedSettings?.language) {
          i18n.changeLanguage(savedSettings.language);
        } else {
          const defaultLanguage = Localization.getLocales()[0]?.languageCode || 'en';
          i18n.changeLanguage(defaultLanguage);
        }
      };
      fetchSettings();
    }, [])
  );
  




// Automatically save settings when they change
useEffect(() => {
  const saveCurrentSettings = async () => {
    const settings = {
      dateFormat,
      weightFormat,
      language: currentLanguage,
    };
    await saveSettings(settings);
  };
  saveCurrentSettings();
}, [dateFormat, weightFormat, currentLanguage]);
  

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
    setLanguageDropdownVisible(false); // Close the dropdown after selection
    
  };

  const handleDateFormatChange = (format: string) => {
    setDateFormat(format);

  };

  const handleWeightFormatChange = (format: string) => {
    setWeightFormat(format);
  };



  const renderLanguageButton = () => (
    <TouchableOpacity
      style={styles.dropdownButton}
      onPress={() => setLanguageDropdownVisible((prev) => !prev)}
    >
      <Text style={[styles.buttonText, { color: 'white' }]}>
        {languages.find((lang) => lang.code === currentLanguage)?.label || 'Select Language'}
      </Text>
      <Ionicons
        name={languageDropdownVisible ? 'chevron-up' : 'chevron-down'}
        size={18}
        color='white'
        style={styles.dropdownIcon}
      />
    </TouchableOpacity>
  );

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
          color={"white"} // Adjust color based on your theme
          style={styles.tickIcon}
        />
      )}
    </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
    {/* Back Button */}
    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
      <Ionicons name="arrow-back" size={24} color={theme.text} />
    </TouchableOpacity>
  
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
                  
                  {item.label}

                
                  {currentLanguage === item.code && (
                  <Ionicons
                    name="checkmark"
                    size={18}
                    color='white'
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

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 70, // Add padding to move everything down
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
    backgroundColor: '#000000',
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
    gap:0,
  },
  tickIcon: {
    marginLeft: 10, // Add space between the text and icon
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
});
