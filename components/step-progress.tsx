// A clean progress header for multi-step forms: a segmented bar plus the
// current step label and position.
export function StepProgress({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        {steps.map((label, i) => (
          <div
            key={label}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= current ? "bg-[var(--accent)]" : "bg-ink/10"
            }`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-[var(--accent)] font-medium">{steps[current]}</span>
        <span className="text-ink/40">Step {current + 1} of {steps.length}</span>
      </div>
    </div>
  );
}
