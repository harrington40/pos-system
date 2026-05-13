import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Rect, Text as SvgText, G } from 'react-native-svg';
import { Colors, BorderRadius } from '../theme';

/**
 * QRCodeDisplay — Renders a QR code from an SVG string
 * or generates a fallback visual representation.
 *
 * Props:
 *   svg: string — SVG markup from the API
 *   size: number — display size (default: 120)
 *   label: string — optional label below QR
 *   style: object — container style override
 */
export default function QRCodeDisplay({ svg, size = 120, label, style }) {
  // If we have an SVG string, render it
  if (svg && svg.includes('<svg')) {
    // Extract viewBox or dimensions from SVG
    const viewBoxMatch = svg.match(/viewBox=["']([^"']+)["']/);
    const widthMatch = svg.match(/width=["'](\d+)["']/);
    const heightMatch = svg.match(/height=["'](\d+)["']/);
    const vb = viewBoxMatch ? viewBoxMatch[1] : `0 0 ${widthMatch?.[1] || 200} ${heightMatch?.[1] || 200}`;

    // Extract rects (QR code modules)
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

    // Parse viewBox
    const [vbX, vbY, vbW, vbH] = vb.split(' ').map(Number);

    // Scale factor
    const scale = size / Math.max(vbW, vbH);

    return (
      <View style={[styles.container, style]}>
        <Svg width={size} height={size} viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}>
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
        </Svg>
        {label && (
          <SvgText
            x={size / 2}
            y={size + 16}
            textAnchor="middle"
            fontSize={10}
            fill={Colors.textSecondary}
          >
            {label}
          </SvgText>
        )}
      </View>
    );
  }

  // Fallback: render a placeholder QR-like pattern
  return (
    <View style={[styles.container, style]}>
      <Svg width={size} height={size} viewBox="0 0 21 21">
        <G fill={Colors.primary}>
          {/* Position patterns */}
          <Rect x="0" y="0" width="7" height="7" rx="1" />
          <Rect x="14" y="0" width="7" height="7" rx="1" />
          <Rect x="0" y="14" width="7" height="7" rx="1" />
          {/* Inner position pattern details */}
          <Rect x="2" y="2" width="3" height="3" fill={Colors.background} />
          <Rect x="16" y="2" width="3" height="3" fill={Colors.background} />
          <Rect x="2" y="16" width="3" height="3" fill={Colors.background} />
          {/* Random data modules */}
          <Rect x="8" y="0" width="1" height="1" />
          <Rect x="10" y="1" width="1" height="1" />
          <Rect x="12" y="2" width="1" height="1" />
          <Rect x="9" y="3" width="1" height="1" />
          <Rect x="11" y="4" width="1" height="1" />
          <Rect x="8" y="5" width="1" height="1" />
          <Rect x="10" y="6" width="1" height="1" />
          <Rect x="8" y="8" width="1" height="1" />
          <Rect x="10" y="8" width="1" height="1" />
          <Rect x="12" y="8" width="1" height="1" />
          <Rect x="9" y="9" width="1" height="1" />
          <Rect x="11" y="9" width="1" height="1" />
          <Rect x="8" y="10" width="1" height="1" />
          <Rect x="10" y="10" width="1" height="1" />
          <Rect x="12" y="10" width="1" height="1" />
          <Rect x="14" y="8" width="1" height="1" />
          <Rect x="14" y="10" width="1" height="1" />
          <Rect x="16" y="9" width="1" height="1" />
          <Rect x="8" y="12" width="1" height="1" />
          <Rect x="10" y="12" width="1" height="1" />
          <Rect x="12" y="12" width="1" height="1" />
          <Rect x="9" y="13" width="1" height="1" />
          <Rect x="11" y="14" width="1" height="1" />
          <Rect x="8" y="15" width="1" height="1" />
          <Rect x="10" y="16" width="1" height="1" />
          <Rect x="12" y="15" width="1" height="1" />
          <Rect x="14" y="14" width="1" height="1" />
          <Rect x="16" y="15" width="1" height="1" />
          <Rect x="15" y="12" width="1" height="1" />
          <Rect x="17" y="13" width="1" height="1" />
        </G>
      </Svg>
      {label && (
        <SvgText
          x={size / 2}
          y={size + 16}
          textAnchor="middle"
          fontSize={10}
          fill={Colors.textSecondary}
        >
          {label}
        </SvgText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BorderRadius.sm,
    padding: 4,
  },
});
