import React, { createContext, useEffect } from 'react';
import {
  initConnection,
  endConnection,
  purchaseUpdatedListener,
  purchaseErrorListener,
  Purchase,
  finishTransaction
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

    const purchaseUpdateSubscription = purchaseUpdatedListener(async (purchase: Purchase) => {
      try {
        console.log('Purchase updated:', purchase);
        
        if (purchase.transactionReceipt) {
          // Mark the transaction as complete
          await finishTransaction({
            purchase,
            isConsumable: false, // Adjust based on whether the product is consumable
          });

          // Add any additional logic here (e.g., update state)
          Alert.alert('Success', 'Purchase successful!');
        }
      } catch (error) {
        console.error('Error processing purchase:', error);
        Alert.alert('Error', 'Failed to process the purchase.');
      }
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
