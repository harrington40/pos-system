import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Text as SvgText, G } from 'react-native-svg';
import { Colors, BorderRadius } from '../theme';

/**
 * BarcodeDisplay — Renders a barcode from an SVG string
 * or generates a visual barcode representation.
 *
 * Props:
 *   svg: string — SVG markup from the API
 *   code: string — barcode text to display
 *   width: number — display width (default: 200)
 *   height: number — display height (default: 60)
 *   style: object — container style override
 */
export default function BarcodeDisplay({ svg, code, width = 200, height = 60, style }) {
  // If we have an SVG string, render it
  if (svg && svg.includes('<svg')) {
    // Extract rects from SVG
    const rects = [];
    const rectRegex = /<rect\s+[^>]*\/?>/g;
    let match;
    while ((match = rectRegex.exec(svg)) !== null) {
      const x = parseFloat(match[0].match(/x=["']([\d.]+)["']/)?.[1] || 0);
      const y = parseFloat(match[0].match(/y=["']([\d.]+)["']/)?.[1] || 0);
      const w = parseFloat(match[0].match(/width=["']([\d.]+)["']/)?.[1] || 0);
      const h = parseFloat(match[0].match(/height=["']([\d.]+)["']/)?.[1] || 0);
      const fill = match[0].match(/fill=["']([^"']+)["']/)?.[1] || '#000';
      if (w > 0 && h > 0) {
        rects.push({ x, y, w, h, fill });
      }
    }

    // Extract text elements
    const texts = [];
    const textRegex = /<text[^>]*>([^<]*)<\/text>/g;
    while ((match = textRegex.exec(svg)) !== null) {
      const x = parseFloat(match[0].match(/x=["']([\d.]+)["']/)?.[1] || 0);
      const y = parseFloat(match[0].match(/y=["']([\d.]+)["']/)?.[1] || 0);
      texts.push({ x, y, content: match[1] });
    }

    return (
      <View style={[styles.container, style]}>
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          {rects.map((r, i) => (
            <Rect
              key={i}
              x={r.x}
              y={r.y}
              width={r.w}
              height={r.h}
              fill={r.fill === '#ffffff' ? 'transparent' : r.fill}
            />
          ))}
          {texts.map((t, i) => (
            <SvgText
              key={`t${i}`}
              x={t.x}
              y={t.y}
              textAnchor="middle"
              fontSize={12}
              fill="#000"
            >
              {t.content}
            </SvgText>
          ))}
        </Svg>
      </View>
    );
  }

  // Fallback: generate a visual barcode pattern
  const bars = [];
  const barCount = 30;
  const barWidth = width / barCount;
  for (let i = 0; i < barCount; i++) {
    const barHeight = height * (0.4 + Math.random() * 0.6);
    bars.push(
      <Rect
        key={i}
        x={i * barWidth}
        y={height - barHeight}
        width={barWidth - 1}
        height={barHeight}
        fill={i % 3 === 0 ? '#000' : Colors.primary}
      />
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {bars}
        <SvgText
          x={width / 2}
          y={height - 4}
          textAnchor="middle"
          fontSize={10}
          fill="#000"
        >
          {code || 'ITEM-001'}
        </SvgText>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BorderRadius.xs,
    padding: 4,
  },
});
