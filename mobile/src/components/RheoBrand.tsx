import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Svg, { G, Path } from 'react-native-svg';
import brand from '../../assets/brand/rheo-brand.generated.json';

type RheoLotusProps = {
  width?: number;
  decorative?: boolean;
};

export function RheoLotus({ width = 56, decorative = false }: RheoLotusProps) {
  return (
    <Svg
      accessible={!decorative}
      accessibilityLabel={decorative ? undefined : 'Rheo lotus'}
      accessibilityRole="image"
      width={width}
      height={width * 0.7}
      viewBox="180 50 320 224"
      preserveAspectRatio="xMidYMid meet"
    >
      <G transform={brand.lotusTransform} fill="none" stroke={brand.background} strokeLinecap="round" strokeLinejoin="round">
        <Path d={brand.lotusPath} strokeWidth={6.5} opacity={0.11} />
        {/* Keep a 0.85-point stroke without Android's non-scaling-stroke transform offset. */}
        <Path d={brand.lotusPath} strokeWidth={0.85 * 320 / width} />
      </G>
    </Svg>
  );
}

export function RheoBrand({ compact = false }: { compact?: boolean }) {
  return (
    <View accessible accessibilityLabel="Rheo" accessibilityRole="image" style={styles.brand}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.artwork}>
        <RheoLotus decorative width={compact ? 40 : 56} />
        <Image
          accessible={false}
          source={require('../../assets/brand/wordmark.png')}
          contentFit="contain"
          style={compact ? styles.compactWordmark : styles.wordmark}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  brand: {
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  artwork: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  wordmark: {
    width: 68,
    height: 28,
  },
  compactWordmark: {
    width: 48,
    height: 20,
  },
});
