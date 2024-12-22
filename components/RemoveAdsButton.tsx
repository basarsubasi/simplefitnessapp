import React from 'react';
import { View, Button, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { useAdContext } from '../context/AdContext'; // Import the context
import { requestPurchase } from 'react-native-iap';
import { TouchableOpacity, Text, StyleSheet } from 'react-native'; // Add these imports
import { useTheme } from '../context/ThemeContext';


const RemoveAdsButton = () => {
  const { adsRemoved, setAdsRemoved } = useAdContext(); // Access context state
  const  {theme} = useTheme();

  const handlePurchase = async () => {
    try {
      await requestPurchase({ sku: 'remove_ads' }); // Replace with your real product ID REPLACE WITH REMOVEAD PRODUCT ID ID AFTER YOU GET IT
      const path = `${FileSystem.documentDirectory}ads_removed.json`;
      await FileSystem.writeAsStringAsync(
        path,
        JSON.stringify({ adsRemoved: true })
      );
      setAdsRemoved(true); // Update the global context state
      Alert.alert('Success', 'Ads have been removed!');
    } catch (error) {
      Alert.alert('Error', 'Purchase failed. Please try again.');
    }
  };

  if (adsRemoved) return null; // Hide button if ads are already removed

  return (
<TouchableOpacity style= {[styles.button, { backgroundColor: theme.buttonBackground }]} onPress={handlePurchase}>
  <Text style={[styles.buttonText, { color: theme.buttonText }]}>Remove Ads</Text>
</TouchableOpacity>
  );

  
};


const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#000000',
    alignItems: 'center', // Center the text
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});


export default RemoveAdsButton;