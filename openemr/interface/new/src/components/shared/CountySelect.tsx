import { LIBERIA_COUNTIES } from '../../utils/liberia';

interface CountySelectProps {
  value?: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

/**
 * Liberia county dropdown — the country's 15 first-level administrative
 * divisions. If the current value is not in the list (legacy data or a
 * free-text entry), it is rendered as an extra option so it is never lost.
 */
export default function CountySelect({ value, onChange, disabled, className, placeholder = '— Select County —' }: CountySelectProps) {
  const current = (value || '').trim();
  const hasCustomValue = current !== '' && !LIBERIA_COUNTIES.includes(current);

  return (
    <select
      className={`form-select ${className || ''}`}
      value={current}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    >
      <option value="">{placeholder}</option>
      {hasCustomValue && <option value={current}>{current}</option>}
      {LIBERIA_COUNTIES.map((county) => (
        <option key={county} value={county}>{county}</option>
      ))}
    </select>
  );
}
