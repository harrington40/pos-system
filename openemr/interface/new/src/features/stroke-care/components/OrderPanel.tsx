import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  acknowledgeStrokeOrder,
  type StrokeOrder,
  type StrokeOrderSet,
} from '../../../api/endpoints/strokeCare';
import { formatWhen } from '../nihss';
import { apiErrorMessage } from '../errors';

interface Props {
  activationId: number;
  orderSets: StrokeOrderSet[];
  orders: StrokeOrder[];
  canOrder: boolean;
  onChanged: () => void;
}

/**
 * Versioned order sets.
 *
 * The payload is a checklist the clinician reviews and signs; it does not place
 * medication or imaging orders by itself. Both acknowledgements are mandatory.
 */
export default function OrderPanel({
  activationId,
  orderSets,
  orders,
  canOrder,
  onChanged,
}: Props) {
  const [orderSetKey, setOrderSetKey] = useState(orderSets[0]?.key ?? '');
  const [acknowledged, setAcknowledged] = useState(false);
  const [contraindications, setContraindications] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const selected = orderSets.find((s) => s.key === orderSetKey);

  const acknowledge = useMutation({
    mutationFn: () =>
      acknowledgeStrokeOrder(activationId, {
        orderSetKey,
        clinicianAcknowledged: acknowledged,
        contraindicationsReviewed: contraindications,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      setAcknowledged(false);
      setContraindications(false);
      setNotes('');
      setError('');
      onChanged();
    },
    onError: (e) =>
      setError(apiErrorMessage(e, 'Could not acknowledge the order set')),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!orderSetKey) {
      setError('Select an order set.');
      return;
    }
    acknowledge.mutate();
  };

  return (
    <div>
      {error && <div className="alert alert-danger py-2 small">{error}</div>}

      {canOrder ? (
        <form onSubmit={submit} className="mb-3">
          <label className="form-label small fw-semibold" htmlFor="order-set">
            Order set
          </label>
          <select
            id="order-set"
            className="form-select form-select-sm mb-2"
            value={orderSetKey}
            onChange={(e) => setOrderSetKey(e.target.value)}
          >
            {orderSets.map((set) => (
              <option key={set.key} value={set.key}>
                {set.label} (v{set.protocol.version})
              </option>
            ))}
          </select>

          {selected && (
            <div className="border rounded p-2 mb-2 small" style={{ maxHeight: 220, overflowY: 'auto' }}>
              <p className="text-muted mb-2">{selected.description}</p>
              <ul className="list-unstyled mb-0">
                {selected.items.map((item) => (
                  <li key={item.key} className="mb-1">
                    <span className="badge bg-secondary-subtle text-secondary me-2">
                      {item.category}
                    </span>
                    <span className="fw-semibold">{item.label}</span>
                    <div className="text-muted">{item.detail}</div>
                    {item.requiresExplicitDoseConfirmation && (
                      <div className="text-danger small">
                        Requires an explicit clinician dosing decision.
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              id="order-ack"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
            />
            <label className="form-check-label small" htmlFor="order-ack">
              I have reviewed every item and will place the orders myself.
            </label>
          </div>
          <div className="form-check mb-2">
            <input
              className="form-check-input"
              type="checkbox"
              id="order-contra"
              checked={contraindications}
              onChange={(e) => setContraindications(e.target.checked)}
            />
            <label className="form-check-label small" htmlFor="order-contra">
              I have reviewed contraindications for this patient.
            </label>
          </div>
          <input
            className="form-control form-control-sm mb-2"
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <button
            className="btn btn-sm btn-outline-primary"
            type="submit"
            disabled={acknowledge.isPending}
          >
            {acknowledge.isPending ? 'Saving…' : 'Acknowledge order set'}
          </button>
        </form>
      ) : (
        <p className="text-muted small">
          Only a physician or administrator can acknowledge an order set.
        </p>
      )}

      <h6 className="small fw-semibold text-uppercase text-muted mt-3">
        Acknowledged sets
      </h6>
      {orders.length === 0 ? (
        <p className="text-muted small mb-0">
          No order set has been signed yet.
        </p>
      ) : (
        <ul className="list-group list-group-flush small">
          {orders.map((order) => (
            <li key={order.id} className="list-group-item px-0">
              <div className="d-flex justify-content-between">
                <span className="fw-semibold">{order.order_set_label}</span>
                <span className="badge bg-success-subtle text-success">
                  {order.status}
                </span>
              </div>
              <div className="text-muted">
                v{order.protocol_version} · {order.ordered_by_name || 'unknown'} ·{' '}
                {formatWhen(order.acknowledged_at)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
