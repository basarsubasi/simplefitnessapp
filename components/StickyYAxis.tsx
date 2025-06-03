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
  yAxisLabel = '',
  axisWidth = 50,
}) => {
  if (!yTickLabels || yTickLabels.length === 0) {
    return <View style={[styles.yAxisContainer, { height: chartHeight, width: axisWidth }]} />;
  }

  const numberOfSegments = yTickLabels.length > 1 ? yTickLabels.length - 1 : 1;

  const xLabelsHeightApproximation = chartHeight * 0.16; // From AbstractChart DEFAULT_X_LABELS_HEIGHT_PERCENTAGE
  const baseHeightForLinesAndLabels = chartHeight - xLabelsHeightApproximation - chartPaddingTop;

  return (
    <View style={[styles.yAxisContainer, { height: chartHeight, width: axisWidth }]}>
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
                right: 5,
                left: 0, // Ensure it takes up space for textAlign
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
    paddingRight: 5, // Padding for the text inside
    position: 'relative',
  },
  yLabel: {
    textAlign: 'right',
    // backgroundColor: 'rgba(200,0,0,0.1)', // For debugging layout
  },
});

export default StickyYAxis; 