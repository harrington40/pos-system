import type { NihssTrendPoint } from '../../../api/endpoints/strokeCare';
import { formatWhen, severityLabel } from '../nihss';

interface Props {
  points: NihssTrendPoint[];
}

/**
 * NIHSS score trend for one patient across finalized assessments.
 * A small SVG chart keeps the dependency surface minimal; amendments appear as
 * separate points because they are separate signed versions.
 */
export default function NihssTrendChart({ points }: Props) {
  if (points.length === 0) {
    return (
      <p className="text-muted small mb-0">
        No finalized NIHSS assessment yet; a trend appears after the first
        signature.
      </p>
    );
  }

  const width = 640;
  const height = 190;
  const pad = { top: 16, right: 20, bottom: 34, left: 34 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const maxScore = 42;

  const xFor = (index: number): number =>
    points.length === 1
      ? pad.left + innerW / 2
      : pad.left + (index / (points.length - 1)) * innerW;
  const yFor = (score: number): number =>
    pad.top + innerH - (Math.min(score, maxScore) / maxScore) * innerH;

  const path = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${xFor(index)},${yFor(point.total_score)}`)
    .join(' ');

  return (
    <div className="overflow-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', minWidth: 420, maxWidth: width }}
        role="img"
        aria-label="NIHSS total score over time"
      >
        {[0, 10, 20, 30, 42].map((score) => (
          <g key={score}>
            <line
              x1={pad.left}
              x2={width - pad.right}
              y1={yFor(score)}
              y2={yFor(score)}
              stroke="#e5e7eb"
              strokeWidth={1}
            />
            <text x={pad.left - 6} y={yFor(score) + 4} textAnchor="end" fontSize={10} fill="#6b7280">
              {score}
            </text>
          </g>
        ))}

        <path d={path} fill="none" stroke="#0d6efd" strokeWidth={2} />
        {points.map((point, index) => (
          <g key={point.id}>
            <circle
              cx={xFor(index)}
              cy={yFor(point.total_score)}
              r={5}
              fill={
                point.severity === 'severe'
                  ? '#dc3545'
                  : point.severity === 'moderate_severe'
                    ? '#fd7e14'
                    : point.severity === 'moderate'
                      ? '#ffc107'
                      : '#198754'
              }
            >
              <title>
                {`${formatWhen(point.assessed_at)} · NIHSS ${point.total_score} (${severityLabel(
                  point.severity,
                )}) · v${point.version}${point.amends_id ? ' amendment' : ''}`}
              </title>
            </circle>
            <text
              x={xFor(index)}
              y={yFor(point.total_score) - 9}
              textAnchor="middle"
              fontSize={10}
              fill="#374151"
            >
              {point.total_score}
            </text>
            <text
              x={xFor(index)}
              y={height - 14}
              textAnchor="middle"
              fontSize={9}
              fill="#6b7280"
            >
              {new Date(point.assessed_at).toLocaleDateString()}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
