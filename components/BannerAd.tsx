import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize} from 'react-native-google-mobile-ads';

interface BannerAdProps {
  adUnitId?: string;
}

const BannerAdComponent: React.FC<BannerAdProps> = ({
  adUnitId = 'ca-app-pub-9707948896132362/4182399574',
}) => {

 const requestOptions = {requestNonPersonalizedAdsOnly: true,};


  return (
    <View style={styles.container}>
      <BannerAd unitId={adUnitId} size={BannerAdSize.BANNER} requestOptions={requestOptions} />
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 10,
  },
});

export default BannerAdComponent;
