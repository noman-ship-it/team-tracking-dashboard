'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Check, Pencil, X } from 'lucide-react';

type Props = {
  icon: React.ReactNode;
  label: string;
  displayValue: string;
  rawValue: number;
  sub: string;
  isOverridden: boolean;
  kpiKey: string;
  updateAction: (key: string, value: number) => Promise<void>;
};

export function EditableKpiTile({
  icon,
  label,
  displayValue,
  rawValue,
  sub,
  isOverridden,
  kpiKey,
  updateAction,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function startEdit() {
    setInputVal(rawValue.toString());
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
  }

  function save() {
    const n = parseInt(inputVal.replace(/[^0-9]/g, ''), 10);
    if (isNaN(n) || n < 0) {
      cancel();
      return;
    }
    startTransition(async () => {
      await updateAction(kpiKey, n);
      setEditing(false);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') save();
    if (e.key === 'Escape') cancel();
  }

  return (
    <div className="group relative flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-sm">
      {/* header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {icon}
          <span>{label}</span>
        </div>
        {!editing && (
          <button
            onClick={startEdit}
            title="Edit value"
            className="rounded-md p-1 text-muted-foreground/40 transition-all hover:text-foreground group-hover:text-muted-foreground"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* body */}
      {editing ? (
        <div className="space-y-2.5">
          <input
            ref={inputRef}
            type="number"
            min="0"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="0"
            className="w-full rounded-lg border bg-background px-3 py-2 font-display text-2xl font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-ring [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={isPending}
              className="flex items-center gap-1 rounded-lg bg-foreground px-3 py-1.5 text-xs font-semibold text-background transition-opacity disabled:opacity-60"
            >
              <Check className="h-3 w-3" />
              {isPending ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={cancel}
              disabled={isPending}
              className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-opacity disabled:opacity-60"
            >
              <X className="h-3 w-3" />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="font-display text-4xl font-bold tabular-nums leading-none tracking-tight">
            {displayValue}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span>{sub}</span>
            {isOverridden && (
              <span className="rounded-full bg-muted px-1.5 py-px text-[10px] font-medium uppercase tracking-wider">
                manual
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
