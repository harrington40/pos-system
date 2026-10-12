import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Minimal shape shared with the viewer's stored-study list. The viewer's fuller
 * `ImagingItem` is assignable to this, so the same fetch helpers serve both.
 */
export interface StudyRef {
  id: number;
  originalName: string;
  mimeType?: string;
  description?: string;
  createdAt?: string;
}

type ThumbStatus = 'idle' | 'loading' | 'ready' | 'nodicom' | 'error';

interface StudyThumbnailProps {
  study: StudyRef;
  /** Zero-based position in the filmstrip (shown as a badge). */
  index: number;
  /** True when this study is the one currently in the main viewer. */
  active: boolean;
  /** True once the Cornerstone libraries are loaded. */
  ready: boolean;
  /** Resolve a study to a Cornerstone imageId (cached, side-effect-free). */
  getImageId: (study: StudyRef) => Promise<string | null>;
  onClick: () => void;
  /** Square edge length in pixels. */
  size?: number;
}

/**
 * A single filmstrip cell: a miniature Cornerstone viewport that renders one
 * stored study.
 *
 * It mirrors exactly what the main viewer does to display an image, so a study
 * that shows here is already decoded into Cornerstone's cache — clicking it in
 * the filmstrip swaps the main viewer instantly instead of re-downloading and
 * re-decoding.
 *
 * Decoding is lazy (IntersectionObserver) so a long study list only pays for the
 * thumbnails the radiologist can actually see, and the element is disabled again
 * on unmount so Cornerstone doesn't keep rendering a cell that scrolled away.
 */
export default function StudyThumbnail({
  study,
  index,
  active,
  ready,
  getImageId,
  onClick,
  size = 104,
}: StudyThumbnailProps) {
  const { t } = useTranslation();
  const boxRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<ThumbStatus>('idle');

  // Only decode once the cell is (near) visible. Fall back to eager when the
  // browser has no IntersectionObserver.
  useEffect(() => {
    if (visible) return;
    const el = boxRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setVisible(true);
      },
      { rootMargin: '200px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible || !ready) return;
    const el = boxRef.current;
    // Cornerstone is attached to `window` by the viewer bootstrap (typed by the
    // global declaration in DicomViewerPage).
    const cornerstone = window.cornerstone;
    if (!el || !cornerstone) return;

    let cancelled = false;
    setStatus('loading');
    (async () => {
      const imageId = await getImageId(study);
      if (cancelled) return;
      if (!imageId) {
        setStatus('nodicom');
        return;
      }
      try {
        cornerstone.enable(el);
      } catch {
        /* already enabled */
      }
      try {
        cornerstone.resize(el);
      } catch {
        /* ignore */
      }
      const image = await cornerstone.loadAndCacheImage(imageId);
      if (cancelled) return;
      const viewport = cornerstone.getDefaultViewportForImage(el, image);
      cornerstone.displayImage(el, image);
      cornerstone.setViewport(el, viewport);
      setStatus('ready');
    })().catch(() => {
      if (!cancelled) setStatus('error');
    });

    return () => {
      cancelled = true;
    };
  }, [visible, ready, study, getImageId]);

  // Release the Cornerstone element when the cell goes away.
  useEffect(
    () => () => {
      const el = boxRef.current;
      if (el && window.cornerstone) {
        try {
          window.cornerstone.disable(el);
        } catch {
          /* not enabled */
        }
      }
    },
    [],
  );

  return (
    <div
      ref={boxRef}
      role="button"
      tabIndex={0}
      aria-label={t('dicom.thumb.loadAria', { index: index + 1, name: study.originalName })}
      title={t('dicom.thumb.loadTitle', { index: index + 1, name: study.originalName, created: study.createdAt ? t('dicom.thumb.createdSuffix', { date: study.createdAt }) : '' }) + t('dicom.thumb.clickToLoad')}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        position: 'relative',
        flex: '0 0 auto',
        width: size,
        height: size,
        background: '#000',
        border: `2px solid ${active ? '#3b82f6' : '#1f2937'}`,
        borderRadius: 8,
        overflow: 'hidden',
        cursor: 'pointer',
        outline: 'none',
        boxShadow: active ? '0 0 0 2px rgba(59,130,246,0.35)' : 'none',
      }}
    >
      {status !== 'ready' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            color: '#9ca3af',
            fontSize: 10,
            textAlign: 'center',
            padding: 4,
          }}
        >
          {status === 'nodicom' ? (
            <>
              <i className="bi bi-file-earmark-medical" style={{ fontSize: 20 }}></i>
              <span>{t('dicom.thumb.notDicom')}</span>
            </>
          ) : status === 'error' ? (
            <>
              <i className="bi bi-exclamation-triangle" style={{ fontSize: 18 }}></i>
              <span>{t('dicom.thumb.previewFailed')}</span>
            </>
          ) : (
            <>
              <span className="spinner-border spinner-border-sm"></span>
              <span>{t('dicom.thumb.loading')}</span>
            </>
          )}
        </div>
      )}

      <span
        style={{
          position: 'absolute',
          top: 2,
          left: 4,
          fontSize: 10,
          fontFamily: 'monospace',
          color: '#e5e7eb',
          textShadow: '0 0 4px #000',
        }}
      >
        {index + 1}
      </span>

      {active && (
        <span
          style={{
            position: 'absolute',
            top: 2,
            right: 4,
            fontSize: 9,
            lineHeight: '14px',
            padding: '0 5px',
            borderRadius: 7,
            background: '#3b82f6',
            color: '#fff',
          }}
        >
          viewing
        </span>
      )}
    </div>
  );
}
