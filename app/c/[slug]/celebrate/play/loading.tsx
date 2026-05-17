export default function PlayLoading() {
  return (
    <div
      data-theme="ivory"
      className="fixed inset-0 theme-mesh flex flex-col items-center justify-center gap-8 select-none"
    >
      <div className="relative size-20">
        <div className="absolute inset-0 rounded-full border-[3px] border-ink/10 border-t-ink/70 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center text-3xl">✨</div>
      </div>
      <div className="text-center">
        <p className="serif text-3xl text-ink">Opening…</p>
        <p className="text-ink/45 text-sm mt-2">Preparing your surprise</p>
      </div>
    </div>
  );
}
