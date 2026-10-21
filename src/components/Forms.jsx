import { forwardRef, useId } from 'react';
import { Check } from 'lucide-react';

export const FormInput = forwardRef(function FormInput({ label, error, helper, className = '', ...rest }, ref) {
  const id = useId();
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="label">
          {label}
          {rest.required && <span className="text-red-600"> *</span>}
        </label>
      )}
      <input id={id} ref={ref} className={`input ${error ? 'input-error' : ''}`} aria-invalid={!!error} aria-describedby={`${id}-d`} {...rest} />
      <p id={`${id}-d`} className={`mt-1 text-xs ${error ? 'font-semibold text-red-700' : 'muted'}`} role={error ? 'alert' : undefined}>
        {error || helper}
      </p>
    </div>
  );
});

export const FormTextarea = forwardRef(function FormTextarea({ label, error, helper, className = '', ...rest }, ref) {
  const id = useId();
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="label">
          {label}
        </label>
      )}
      <textarea id={id} ref={ref} rows={3} className={`input ${error ? 'input-error' : ''}`} aria-invalid={!!error} {...rest} />
      {(error || helper) && (
        <p className={`mt-1 text-xs ${error ? 'font-semibold text-red-700' : 'muted'}`} role={error ? 'alert' : undefined}>
          {error || helper}
        </p>
      )}
    </div>
  );
});

export const FormSelect = forwardRef(function FormSelect({ label, error, helper, options = [], placeholder, className = '', ...rest }, ref) {
  const id = useId();
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="label">
          {label}
          {rest.required && <span className="text-red-600"> *</span>}
        </label>
      )}
      <select id={id} ref={ref} className={`input pr-8 ${error ? 'input-error' : ''}`} aria-invalid={!!error} {...rest}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => {
          const v = typeof o === 'string' ? o : o.value;
          const l = typeof o === 'string' ? o : o.label;
          return (
            <option key={v} value={v}>
              {l}
            </option>
          );
        })}
      </select>
      {(error || helper) && (
        <p className={`mt-1 text-xs ${error ? 'font-semibold text-red-700' : 'muted'}`} role={error ? 'alert' : undefined}>
          {error || helper}
        </p>
      )}
    </div>
  );
});

export function ToggleSwitch({ checked, onChange, label, disabled }) {
  return (
    <label className={`inline-flex items-center gap-3 ${disabled ? 'opacity-60' : 'cursor-pointer'}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? 'bg-red-600' : 'bg-red-200'}`}
      >
        <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
      <span className="text-sm font-semibold text-red-900">{label}</span>
    </label>
  );
}

export function Stepper({ steps, current }) {
  const pct = (current / (steps.length - 1)) * 100;
  return (
    <nav aria-label="Progress" className="mb-6">
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-red-100" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={current + 1}>
        <div className="h-full rounded-full bg-red-600 transition-all duration-500" style={{ width: `${Math.max(8, pct)}%` }} />
      </div>
      <ol className="grid" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((s, i) => (
          <li key={s} className="flex flex-col items-center gap-1 text-center">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                i < current ? 'bg-red-800 text-white' : i === current ? 'bg-red-600 text-white ring-4 ring-red-200' : 'bg-red-100 text-red-800'
              }`}
              aria-current={i === current ? 'step' : undefined}
            >
              {i < current ? <Check size={14} /> : i + 1}
            </span>
            <span className={`text-xs font-semibold ${i === current ? 'text-red-900' : 'text-red-900/70'}`}>{s}</span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
