import { useMemo, useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  amendStrokeAssessment,
  finalizeStrokeAssessment,
  signStrokeAssessment,
  updateStrokeAssessmentDraft,
  type NihssItemDef,
  type StrokeAssessment,
} from '../../../api/endpoints/strokeCare';
import {
  scoreNihssPreview,
  severityBadge,
  severityLabel,
} from '../nihss';
import { apiErrorMessage } from '../errors';

interface Props {
  activationId: number;
  definitions: NihssItemDef[];
  untestableKeys: string[];
  canDocument: boolean;
  existing?: StrokeAssessment | null;
  amendMode?: boolean;
  onSaved: () => void;
}

type SaveAction = 'draft' | 'finalize' | 'amend';

/**
 * NIHSS documentation with draft, finalize and amendment paths.
 *
 * The server recomputes the total and refuses a signature on an incomplete
 * assessment. An untestable item must carry a reason and is never scored zero.
 */
export default function NihssForm({
  activationId,
  definitions,
  untestableKeys,
  canDocument,
  existing = null,
  amendMode = false,
  onSaved,
}: Props) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      Object.entries(existing?.items ?? {}).map(([key, value]) => [
        key,
        String(value),
      ]),
    ),
  );
  const [untestable, setUntestable] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      Object.entries(existing?.untestable ?? {})
        .filter(([, value]) => typeof value === 'string')
        .map(([key, value]) => [key, String(value)]),
    ),
  );
  const [draftId, setDraftId] = useState<number | null>(
    existing?.status === 'draft' ? existing.id : null,
  );
  const [signedByName, setSignedByName] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [amendmentReason, setAmendmentReason] = useState('');
  const [error, setError] = useState('');

  const preview = useMemo(
    () => scoreNihssPreview(values, definitions, untestable, untestableKeys),
    [values, definitions, untestable, untestableKeys],
  );

  const numericItems = (): Record<string, number> =>
    Object.fromEntries(
      definitions
        .filter((def) => values[def.key] !== undefined && values[def.key] !== '')
        .map((def) => [def.key, Number(values[def.key])]),
    );

  const save = useMutation({
    mutationFn: async (action: SaveAction): Promise<StrokeAssessment> => {
      const payload = {
        items: numericItems(),
        untestable,
        notes: notes.trim() || null,
      };
      if (action === 'draft') {
        if (draftId !== null) {
          return updateStrokeAssessmentDraft(draftId, payload);
        }
        const created = await signStrokeAssessment(activationId, {
          ...payload,
          finalize: false,
        });
        setDraftId(created.id);
        return created;
      }
      if (action === 'amend') {
        if (!existing) throw new Error('No assessment selected to amend.');
        return amendStrokeAssessment(existing.id, {
          ...payload,
          amendmentReason: amendmentReason.trim(),
          signedByName: signedByName.trim(),
          signatureConfirmed: confirmed,
        });
      }
      if (draftId !== null) {
        await updateStrokeAssessmentDraft(draftId, payload);
        return finalizeStrokeAssessment(draftId, {
          notes: notes.trim() || null,
          signedByName: signedByName.trim(),
          signatureConfirmed: confirmed,
        });
      }
      return signStrokeAssessment(activationId, {
        ...payload,
        signedByName: signedByName.trim(),
        signatureConfirmed: confirmed,
      });
    },
    onSuccess: () => {
      setError('');
      onSaved();
    },
    onError: (e) => setError(apiErrorMessage(e, 'Could not save the assessment')),
  });

  const submit = (event: FormEvent, action: SaveAction) => {
    event.preventDefault();
    if (action !== 'draft') {
      if (!preview.complete) {
        setError('Complete every item or document it as untestable before signing.');
        return;
      }
      if (!signedByName.trim()) {
        setError('Enter the name of the clinician signing the assessment.');
        return;
      }
      if (!confirmed) {
        setError('Confirm the signature before submitting.');
        return;
      }
    }
    if (action === 'amend' && !amendmentReason.trim()) {
      setError('An amendment requires a reason.');
      return;
    }
    save.mutate(action);
  };

  const toggleUntestable = (key: string, checked: boolean) => {
    setUntestable((current) => {
      const next = { ...current };
      if (checked) next[key] = '';
      else delete next[key];
      return next;
    });
    if (checked) {
      setValues((current) => ({ ...current, [key]: '' }));
    }
  };

  if (!canDocument) {
    return (
      <p className="text-muted small mb-0">
        Your role can read the stroke record but not document a signed NIHSS.
      </p>
    );
  }

  return (
    <form onSubmit={(e) => submit(e, amendMode ? 'amend' : 'finalize')}>
      {error && <div className="alert alert-danger py-2 small">{error}</div>}
      {draftId !== null && !amendMode && (
        <div className="alert alert-info py-1 small">
          Editing draft #{draftId}. Finalizing locks it; later changes require an amendment.
        </div>
      )}
      {amendMode && existing && (
        <div className="alert alert-warning py-1 small">
          Amending finalized assessment #{existing.id} (v{existing.version}). The
          original stays in the signed history.
        </div>
      )}

      <div className="row g-2">
        {definitions.map((def) => {
          const canBeUntestable = untestableKeys.includes(def.key);
          const isUntestable = untestable[def.key] !== undefined;
          return (
            <div className="col-md-6" key={def.key}>
              <label
                className="form-label small fw-semibold mb-1"
                htmlFor={`nihss-${def.key}`}
              >
                {def.label}
              </label>
              <select
                id={`nihss-${def.key}`}
                className="form-select form-select-sm"
                value={values[def.key] ?? ''}
                disabled={isUntestable}
                onChange={(e) =>
                  setValues((current) => ({
                    ...current,
                    [def.key]: e.target.value,
                  }))
                }
              >
                <option value="">Not assessed</option>
                {def.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="form-text small">{def.guidance}</div>
              {canBeUntestable && (
                <div className="mt-1">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={`untestable-${def.key}`}
                      checked={isUntestable}
                      onChange={(e) =>
                        toggleUntestable(def.key, e.target.checked)
                      }
                    />
                    <label
                      className="form-check-label small"
                      htmlFor={`untestable-${def.key}`}
                    >
                      Untestable
                    </label>
                  </div>
                  {isUntestable && (
                    <input
                      className="form-control form-control-sm mt-1"
                      placeholder="Reason (required), e.g. amputation"
                      value={untestable[def.key] ?? ''}
                      onChange={(e) =>
                        setUntestable((current) => ({
                          ...current,
                          [def.key]: e.target.value,
                        }))
                      }
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="d-flex align-items-center gap-3 my-3 p-2 bg-light rounded flex-wrap">
        <span className="fw-semibold">
          Total: {preview.total} / {preview.maxTotal}
        </span>
        <span className={`badge ${severityBadge(preview.severity)}`}>
          {severityLabel(preview.severity)}
        </span>
        {preview.partial && (
          <span className="text-warning-emphasis small">
            Partial: {preview.untestable.length} untestable item(s) not scored
          </span>
        )}
        {!preview.complete && (
          <span className="text-danger small">
            {preview.invalid.length
              ? `Out of range: ${preview.invalid.join(', ')}`
              : preview.untestableWithoutReason.length
                ? `Reason required: ${preview.untestableWithoutReason.join(', ')}`
                : `${preview.missing.length} item(s) not assessed`}
          </span>
        )}
      </div>

      <div className="row g-2 align-items-end">
        <div className="col-md-4">
          <label className="form-label small fw-semibold" htmlFor="nihss-signer">
            Signed by
          </label>
          <input
            id="nihss-signer"
            className="form-control form-control-sm"
            value={signedByName}
            onChange={(e) => setSignedByName(e.target.value)}
            placeholder="Clinician name (required to finalize)"
          />
        </div>
        <div className="col-md-4">
          <label className="form-label small fw-semibold" htmlFor="nihss-notes">
            Notes (optional)
          </label>
          <input
            id="nihss-notes"
            className="form-control form-control-sm"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div className="col-md-4">
          {amendMode ? (
            <input
              className="form-control form-control-sm"
              placeholder="Reason for amendment (required)"
              value={amendmentReason}
              onChange={(e) => setAmendmentReason(e.target.value)}
            />
          ) : (
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                disabled={save.isPending}
                onClick={(e) => submit(e, 'draft')}
              >
                {draftId !== null ? 'Update draft' : 'Save draft'}
              </button>
              <button
                className="btn btn-sm btn-primary"
                type="submit"
                disabled={save.isPending}
              >
                {save.isPending ? 'Saving…' : 'Finalize'}
              </button>
            </div>
          )}
        </div>
      </div>
      {amendMode && (
        <button
          className="btn btn-sm btn-warning mt-2"
          type="submit"
          disabled={save.isPending}
        >
          {save.isPending ? 'Saving…' : 'Save amendment'}
        </button>
      )}
      <div className="form-check mt-2">
        <input
          className="form-check-input"
          type="checkbox"
          id="nihss-confirm"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        <label className="form-check-label small" htmlFor="nihss-confirm">
          I performed this examination and confirm the recorded scores.
        </label>
      </div>
    </form>
  );
}
