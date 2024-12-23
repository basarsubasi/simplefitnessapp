import React, { createContext, useEffect } from 'react';
import {
  initConnection,
  endConnection,
  purchaseUpdatedListener,
  purchaseErrorListener,
} from 'react-native-iap';
import { Alert } from 'react-native';

export const IAPContext = createContext({});

export const IAPProvider = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    const initializeIAP = async () => {
      try {
        const result = await initConnection();
        console.log('IAP connection initialized:', result);
      } catch (error) {
        console.error('IAP initialization error:', error);
        Alert.alert('Error', 'Failed to initialize in-app purchases.');
      }
    };

    const purchaseUpdateSubscription = purchaseUpdatedListener((purchase) => {
      console.log('Purchase updated:', purchase);
      // Add logic for purchase verification and delivery
    });

    const purchaseErrorSubscription = purchaseErrorListener((error) => {
      console.error('Purchase error:', error);
      Alert.alert('Purchase Error', error.message);
    });

    initializeIAP();

    return () => {
      console.log('Cleaning up IAP...');
      endConnection();
      purchaseUpdateSubscription.remove();
      purchaseErrorSubscription.remove();
    };
  }, []);

  return (
    <IAPContext.Provider value={{}}>
      {children}
    </IAPContext.Provider>
  );
};
