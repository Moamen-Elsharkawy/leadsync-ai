export default function DashboardLoading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-56 animate-pulse rounded bg-slate-200" />
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="h-28 animate-pulse rounded-lg border border-line bg-slate-100"
          />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-lg border border-line bg-slate-100" />
    </div>
  );
}
