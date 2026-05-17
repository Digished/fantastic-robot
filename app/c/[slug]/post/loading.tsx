export default function PostLoading() {
  return (
    <main className="min-h-[100dvh] bg-white flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="size-10 rounded-full border-2 border-ink/10 border-t-ink/70 animate-spin mx-auto" />
        <p className="text-ink/50 text-sm">Loading…</p>
      </div>
    </main>
  );
}
