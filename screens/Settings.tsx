import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSettings } from '../context/SettingsContext';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext'; 


export default function Settings() {
  const navigation = useNavigation();
  const { language, setLanguage, dateFormat, setDateFormat, weightFormat, setWeightFormat } = useSettings();
  const { theme, toggleTheme } = useTheme();

  const renderButton = (label: string, current: string, onPress: () => void) => (
    <TouchableOpacity
      style={[styles.button, current === label && styles.activeButton]}
      onPress={onPress}
    >
      <Text style={[styles.buttonText, current === label && styles.activeButtonText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
    {/* Back Button */}
    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
      <Ionicons name="arrow-back" size={24} color={theme.text} />
    </TouchableOpacity>
  
    {/* Title */}
    <Text style={[styles.title, { color: theme.text }]}>Settings</Text>
  
    {/* Language Section */}
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Language</Text>
      <View style={styles.buttonGroup}>
        {renderButton('English', language, () => setLanguage('English'))}
      </View>
    </View>
  
    {/* Date Format Section */}
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Date Format</Text>
      <View style={styles.buttonGroup}>
        {renderButton('dd-mm-yyyy', dateFormat, () => setDateFormat('dd-mm-yyyy'))}
        {renderButton('mm-dd-yyyy', dateFormat, () => setDateFormat('mm-dd-yyyy'))}
      </View>
    </View>
  
    {/* Weight Format Section */}
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Weight Format</Text>
      <View style={styles.buttonGroup}>
        {renderButton('kg', weightFormat, () => setWeightFormat('kg'))}
        {renderButton('lbs', weightFormat, () => setWeightFormat('lbs'))}
      </View>
    </View>
  
    {/* Theme Section */}
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Theme</Text>
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
            {theme.background === '#FFFFFF' ? 'Switch to Dark' : 'Switch to Light'}
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
    paddingTop: 60, // Add padding to move everything down
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
});
