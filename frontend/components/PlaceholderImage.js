import React from 'react';
import Svg, {
  Circle,
  Rect,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
  Text,
  Path,
} from 'react-native-svg';

/**
 * Premium Placeholder Image Component
 * Generates beautiful gradient-based placeholders with food emoji
 */

const GRADIENTS = {
  breakfast: ['#FF9A76', '#FF6B6B'],
  lunch: ['#DD9B1D', '#C48A1A'],
  dinner: ['#E040FB', '#7C4DFF'],
  drinks: ['#53E79D', '#00BFA5'],
  desserts: ['#FF80AB', '#FF4081'],
  default: ['#DD9B1D', '#C48A1A'],
};

const EMOJIS = {
  breakfast: '🥐',
  lunch: '🍔',
  dinner: '🍜',
  drinks: '🥤',
  desserts: '🍰',
  default: '🍽️',
};

export const PlaceholderImage = ({
  width = 200,
  height = 200,
  text,
  category = 'default',
}) => {
  const gradient = GRADIENTS[category] || GRADIENTS.default;
  const emoji = text || EMOJIS[category] || EMOJIS.default;
  const gradientId = `grad-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        <SvgGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={gradient[0]} stopOpacity="0.3" />
          <Stop offset="100%" stopColor={gradient[1]} stopOpacity="0.1" />
        </SvgGradient>
      </Defs>

      {/* Background shape */}
      <Rect
        x="0"
        y="0"
        width={width}
        height={height}
        fill={`url(#${gradientId})`}
      />

      {/* Decorative circles */}
      <Circle
        cx={width * 0.2}
        cy={height * 0.15}
        r={width * 0.08}
        fill={gradient[0]}
        opacity="0.15"
      />
      <Circle
        cx={width * 0.85}
        cy={height * 0.85}
        r={width * 0.12}
        fill={gradient[1]}
        opacity="0.12"
      />
      <Circle
        cx={width * 0.75}
        cy={height * 0.2}
        r={width * 0.05}
        fill={gradient[0]}
        opacity="0.1"
      />

      {/* Subtle grid pattern lines */}
      <Path
        d={`M ${width * 0.3} 0 L ${width * 0.3} ${height}`}
        stroke={gradient[0]}
        strokeWidth="0.5"
        opacity="0.08"
      />
      <Path
        d={`M ${width * 0.7} 0 L ${width * 0.7} ${height}`}
        stroke={gradient[0]}
        strokeWidth="0.5"
        opacity="0.08"
      />
      <Path
        d={`M 0 ${height * 0.4} L ${width} ${height * 0.4}`}
        stroke={gradient[0]}
        strokeWidth="0.5"
        opacity="0.08"
      />
      <Path
        d={`M 0 ${height * 0.7} L ${width} ${height * 0.7}`}
        stroke={gradient[0]}
        strokeWidth="0.5"
        opacity="0.08"
      />

      {/* Emoji */}
      <Text
        x={width / 2}
        y={height / 2 + 10}
        fontSize={width * 0.35}
        textAnchor="middle"
        alignmentBaseline="central"
        fill={gradient[0]}
        opacity="0.9"
      >
        {emoji}
      </Text>
    </Svg>
  );
};

export default PlaceholderImage;
