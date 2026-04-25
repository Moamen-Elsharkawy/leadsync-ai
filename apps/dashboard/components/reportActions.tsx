"use client";

export function ReportActions({ reportText }: { reportText: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => void navigator.clipboard.writeText(reportText)}
        className="rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-ink hover:bg-slate-50"
      >
        Copy report text
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-ink hover:bg-slate-50"
      >
        Print page
      </button>
      <a
        href={`data:text/csv;charset=utf-8,${encodeURIComponent(toCsv(reportText))}`}
        download="smartflow-report.csv"
        className="rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-ink hover:bg-slate-50"
      >
        Export CSV
      </a>
    </div>
  );
}

function toCsv(reportText: string): string {
  return reportText
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [label, ...rest] = line.split(":");
      return `"${label.replaceAll('"', '""')}","${rest.join(":").trim().replaceAll('"', '""')}"`;
    })
    .join("\n");
}
