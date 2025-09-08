import { HTMLInputTypeAttribute } from 'react';

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block mb-3">
      <div className="text-xs font-medium text-slate-600 mb-1">{label}</div>
      {children}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; type?: HTMLInputTypeAttribute; error?: boolean }) {
  const el = (
    <input
      {...props}
      aria-required={props.required ? "true" : undefined}
      aria-invalid={props.error ? "true" : undefined}
      className={`w-full border rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/50 ${props.className || ''} ${props.error ? 'border-red-500' : ''}`}
    />
  );
  if (!props.label) return el;
  return <Field label={props.label}>{el}</Field>;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: boolean }) {
  const el = (
    <textarea
      {...props}
      aria-required={props.required ? "true" : undefined}
      aria-invalid={props.error ? "true" : undefined}
      className={`w-full border rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/50 ${props.className || ''} ${props.error ? 'border-red-500' : ''}`}
    />
  );
  if (!props.label) return el;
  return <Field label={props.label}>{el}</Field>;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; options?: {label: string, value: string}[]; error?: boolean }) {
  const el = (
    <select
      {...props}
      aria-required={props.required ? "true" : undefined}
      aria-invalid={props.error ? "true" : undefined}
      className={`w-full border rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/50 bg-white ${props.className || ''} ${props.error ? 'border-red-500' : ''}`}
    >
      {props.children || props.options?.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
  if (!props.label) return el;
  return <Field label={props.label}>{el}</Field>;
}

export function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      aria-disabled={props.disabled ? "true" : undefined}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 ${props.className || ''}`}
    />
  );
}
