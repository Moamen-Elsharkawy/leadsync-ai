"use client";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6">
      <h1 className="text-lg font-semibold text-hot">
        Dashboard data could not be loaded
      </h1>
      <p className="mt-2 text-sm text-hot">
        Check the Apps Script Web App deployment, shared secret, and network
        access. Secret values are never shown here.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-4 rounded-md bg-hot px-4 py-2 text-sm font-medium text-white"
      >
        Try again
      </button>
    </div>
  );
}
