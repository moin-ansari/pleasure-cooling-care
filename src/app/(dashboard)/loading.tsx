export default function Loading() {
  return (
    <div className="mx-auto grid max-w-2xl gap-4 px-3 py-10" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-2/3 animate-pulse rounded bg-slate-200" />
      <div className="h-24 animate-pulse rounded-xl bg-slate-200" />
      <div className="h-24 animate-pulse rounded-xl bg-slate-200" />
    </div>
  );
}
