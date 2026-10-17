import { useQuery } from '@tanstack/react-query';
import { getNihssTrend } from '../../../api/endpoints/strokeCare';
import NihssTrendChart from './NihssTrendChart';

interface Props {
  pid: number;
}

/** Finalized NIHSS history across all of a patient's stroke encounters. */
export default function NihssTrendPanel({ pid }: Props) {
  const { data = [], isLoading, error } = useQuery({
    queryKey: ['stroke-nihss-trend', pid],
    queryFn: () => getNihssTrend(pid),
  });

  if (isLoading) return <p className="text-muted small">Loading trend…</p>;
  if (error) {
    return <p className="text-danger small">The NIHSS trend could not be loaded.</p>;
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="small fw-semibold text-uppercase text-muted mb-0">
          NIHSS trend (finalized)
        </h6>
        <span className="text-muted small">{data.length} point(s)</span>
      </div>
      <NihssTrendChart points={data} />
    </div>
  );
}
