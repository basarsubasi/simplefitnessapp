import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StickyYAxisProps {
  chartHeight: number;
  yTickLabels: string[];
  labelColor: (opacity?: number) => string;
  chartPaddingTop?: number;
  fontSize?: number;
  yAxisLabel?: string;
  axisWidth?: number;
}

const StickyYAxis: React.FC<StickyYAxisProps> = ({
  chartHeight,
  yTickLabels,
  labelColor,
  chartPaddingTop = 16,
  fontSize = 10,
  axisWidth = 0,
}) => {
  if (!yTickLabels || yTickLabels.length === 0) {
    return <View style={[styles.yAxisContainer, { height: chartHeight, width: axisWidth }]} />;
  }

  const numberOfSegments = yTickLabels.length > 1 ? yTickLabels.length - 1 : 1;

  const xLabelsHeightApproximation = chartHeight * 0.16; // From AbstractChart DEFAULT_X_LABELS_HEIGHT_PERCENTAGE
  const baseHeightForLinesAndLabels = chartHeight - xLabelsHeightApproximation - chartPaddingTop;

  return (
    <View style={[styles.yAxisContainer, { height: chartHeight, width: axisWidth, position: 'absolute', left: 0, top: 0}]}>
      {yTickLabels.map((label, index) => {
        const yPosition = chartPaddingTop + (index * (baseHeightForLinesAndLabels / numberOfSegments));
        
        return (
          <Text
            key={`y-label-${index}`}
            style={[
              styles.yLabel,
              {
                color: labelColor(),
                fontSize: fontSize,
                position: 'absolute',
                top: yPosition + (fontSize) + 22, // Adjusted to shift labels down
                left: 0,
                right: 5,
                zIndex: 1000,
              },
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  yAxisContainer: {
    justifyContent: 'flex-start', // Align items to the top for absolute positioning context
    position: 'relative',
  },
  yLabel: {
    textAlign: 'right',
    // backgroundColor: 'rgba(200,0,0,0.1)', // For debugging layout
  },
});

export default StickyYAxis; 