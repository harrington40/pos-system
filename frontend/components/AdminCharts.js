import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  Path, Line, Circle, Rect, Text as SvgText, G, LinearGradient, Defs, Stop
} from 'react-native-svg';
import { Colors, Spacing, BorderRadius, Typography } from '../theme';

// ──────────────────────────────────────────────
// Line Chart
// ──────────────────────────────────────────────
export function LineChart({ data, width = 320, height = 180, color = Colors.chartLine, fillColor = Colors.chartFill, showGrid = true, labels = true }) {
  if (!data || data.length < 2) {
    return <EmptyChart width={width} height={height} label="Insufficient data" />;
  }

  const padding = { top: 20, right: 16, bottom: 30, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const values = data.map(d => d.value ?? d.revenue ?? d.avg ?? 0);
  const maxVal = Math.max(...values, 1);
  const minVal = Math.min(...values, 0);
  const range = maxVal - minVal || 1;

  const points = values.map((v, i) => ({
    x: padding.left + (i / (values.length - 1)) * chartW,
    y: padding.top + chartH - ((v - minVal) / range) * chartH
  }));

  // Build path
  const linePath = points.map((p, i) =>
    `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`
  ).join(' ');

  // Fill path (area under line)
  const fillPath = `${linePath} L${points[points.length - 1].x},${padding.top + chartH} L${points[0].x},${padding.top + chartH} Z`;

  // Grid lines
  const gridLines = 4;
  const grid = [];
  for (let i = 0; i <= gridLines; i++) {
    const y = padding.top + (chartH / gridLines) * i;
    const val = maxVal - (range / gridLines) * i;
    grid.push({ y, label: val.toFixed(0) });
  }

  return (
    <View style={styles.chartContainer}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.3" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* Grid */}
        {showGrid && grid.map((g, i) => (
          <React.Fragment key={`g${i}`}>
            <Line
              x1={padding.left} y1={g.y}
              x2={width - padding.right} y2={g.y}
              stroke={Colors.chartGrid}
              strokeWidth={0.5}
            />
            {labels && (
              <SvgText
                x={padding.left - 8} y={g.y + 4}
                textAnchor="end" fontSize={9}
                fill={Colors.chartLabel}
              >
                ${g.label}
              </SvgText>
            )}
          </React.Fragment>
        ))}

        {/* Fill area */}
        <Path d={fillPath} fill="url(#chartFill)" />

        {/* Line */}
        <Path d={linePath} stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" />

        {/* Dots */}
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={3} fill={color} stroke={Colors.background} strokeWidth={2} />
        ))}

        {/* X-axis labels */}
        {labels && data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 6)) === 0).map((d, i) => {
          const idx = data.indexOf(d);
          const p = points[idx];
          const label = d.label || d.date || '';
          const short = label.length > 5 ? label.slice(-5) : label;
          return (
            <SvgText
              key={`x${i}`}
              x={p.x} y={height - 6}
              textAnchor="middle" fontSize={8}
              fill={Colors.chartLabel}
            >
              {short}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}

// ──────────────────────────────────────────────
// Bar Chart
// ──────────────────────────────────────────────
export function BarChart({ data, width = 320, height = 180, colors = Colors.chartColors, showValues = true }) {
  if (!data || data.length === 0) {
    return <EmptyChart width={width} height={height} label="No data" />;
  }

  const padding = { top: 20, right: 16, bottom: 30, left: 8 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const values = data.map(d => d.value ?? d.revenue ?? d.quantity ?? d.percentage ?? 0);
  const maxVal = Math.max(...values, 1);

  const barWidth = Math.min(40, (chartW / data.length) * 0.7);
  const gap = (chartW - barWidth * data.length) / (data.length + 1);

  return (
    <View style={styles.chartContainer}>
      <Svg width={width} height={height}>
        {/* Bars */}
        {data.map((d, i) => {
          const barH = (values[i] / maxVal) * chartH;
          const x = padding.left + gap + i * (barWidth + gap);
          const y = padding.top + chartH - barH;
          const barColor = colors[i % colors.length];

          return (
            <G key={i}>
              <Rect
                x={x} y={y}
                width={barWidth} height={barH}
                fill={barColor}
                rx={3}
                ry={3}
              />
              {showValues && (
                <SvgText
                  x={x + barWidth / 2} y={y - 6}
                  textAnchor="middle" fontSize={9}
                  fill={Colors.chartLabel}
                >
                  {values[i] % 1 === 0 ? values[i] : values[i].toFixed(1)}
                </SvgText>
              )}
              <SvgText
                x={x + barWidth / 2} y={height - 6}
                textAnchor="middle" fontSize={8}
                fill={Colors.chartLabel}
              >
                {(d.label || d.category || d.name || '').slice(0, 8)}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

// ──────────────────────────────────────────────
// Donut Chart
// ──────────────────────────────────────────────
export function DonutChart({ data, size = 160, colors = Colors.chartColors, innerRadius = 0.6 }) {
  if (!data || data.length === 0) {
    return <EmptyChart width={size} height={size} label="No data" />;
  }

  const total = data.reduce((sum, d) => sum + (d.value ?? d.revenue ?? d.percentage ?? 1), 0);
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 10;
  const innerR = radius * innerRadius;

  // Calculate arc paths
  let currentAngle = -Math.PI / 2;
  const slices = data.map((d, i) => {
    const val = d.value ?? d.revenue ?? d.percentage ?? 1;
    const angle = (val / total) * 2 * Math.PI;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    // Arc path
    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);
    const largeArc = angle > Math.PI ? 1 : 0;

    const path = [
      `M ${cx + innerR * Math.cos(startAngle)} ${cy + innerR * Math.sin(startAngle)}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${cx + innerR * Math.cos(endAngle)} ${cy + innerR * Math.sin(endAngle)}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${cx + innerR * Math.cos(startAngle)} ${cy + innerR * Math.sin(startAngle)}`,
      'Z'
    ].join(' ');

    return { path, color: colors[i % colors.length], label: d.label || d.category || d.name || '', value: val, percentage: (val / total) * 100 };
  });

  return (
    <View style={styles.chartContainer}>
      <Svg width={size} height={size}>
        {slices.map((s, i) => (
          <Path key={i} d={s.path} fill={s.color} />
        ))}
        {/* Center text */}
        <SvgText
          x={cx} y={cy - 4}
          textAnchor="middle" fontSize={16} fontWeight="bold"
          fill={Colors.textPrimary}
        >
          {total % 1 === 0 ? total : total.toFixed(0)}
        </SvgText>
        <SvgText
          x={cx} y={cy + 12}
          textAnchor="middle" fontSize={9}
          fill={Colors.textSecondary}
        >
          Total
        </SvgText>
      </Svg>
      {/* Legend */}
      <View style={styles.legend}>
        {slices.slice(0, 5).map((s, i) => (
          <View key={i} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: s.color }]} />
            <Text style={styles.legendText} numberOfLines={1}>
              {s.label} ({s.percentage.toFixed(0)}%)
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ──────────────────────────────────────────────
// Mini Metric Card (for dashboard)
// ──────────────────────────────────────────────
export function MetricCard({ title, value, subtitle, color = Colors.primary, icon, trend }) {
  return (
    <View style={[styles.metricCard, { borderLeftColor: color }]}>
      <View style={styles.metricHeader}>
        {icon && <Text style={styles.metricIcon}>{icon}</Text>}
        <Text style={styles.metricLabel}>{title}</Text>
      </View>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
      {trend !== undefined && (
        <Text style={[styles.trend, { color: trend >= 0 ? Colors.success : Colors.error }]}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </Text>
      )}
    </View>
  );
}

// ──────────────────────────────────────────────
// Empty Chart Placeholder
// ──────────────────────────────────────────────
function EmptyChart({ width, height, label }) {
  return (
    <View style={[styles.emptyChart, { width, height }]}>
      <Text style={styles.emptyText}>{label || 'No data available'}</Text>
    </View>
  );
}

// ──────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────
const styles = StyleSheet.create({
  chartContainer: {
    alignItems: 'center',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    ...Typography.captionSmall,
    color: Colors.textSecondary,
    maxWidth: 80,
  },
  metricCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderLeftWidth: 3,
    minWidth: 140,
    flex: 1,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  metricIcon: {
    fontSize: 16,
  },
  metricLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  metricValue: {
    ...Typography.adminMetric,
    color: Colors.textPrimary,
  },
  metricSubtitle: {
    ...Typography.bodySmall,
    color: Colors.textMuted,
    marginTop: 2,
  },
  trend: {
    ...Typography.captionSmall,
    marginTop: 4,
  },
  emptyChart: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
  },
  emptyText: {
    ...Typography.bodySmall,
    color: Colors.textMuted,
  },
});
