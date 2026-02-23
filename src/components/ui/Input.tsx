"use client";

import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className = "", ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-medium text-slate-400">{label}</label>
      )}
      <input
        className={`
          w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white
          placeholder-slate-500 transition-colors
          focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50
          ${className}
        `}
        {...props}
      />
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function Textarea({ label, className = "", ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-medium text-slate-400">{label}</label>
      )}
      <textarea
        className={`
          w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white
          placeholder-slate-500 transition-colors resize-none
          focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50
          ${className}
        `}
        {...props}
      />
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: Array<{ value: string; label: string }>;
}

export function Select({ label, options, className = "", ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-medium text-slate-400">{label}</label>
      )}
      <select
        className={`
          w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white
          transition-colors cursor-pointer
          focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50
          ${className}
        `}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-slate-900">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
