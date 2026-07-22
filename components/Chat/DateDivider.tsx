interface DateDividerProps {
  label: string;
}

export function DateDivider({ label }: DateDividerProps) {
  return (
    <div className="flex items-center gap-3 py-2 px-1 select-none">
      <div className="h-px flex-1 bg-zinc-700/60" />
      <span className="text-xs font-medium text-zinc-400">{label}</span>
      <div className="h-px flex-1 bg-zinc-700/60" />
    </div>
  );
}
