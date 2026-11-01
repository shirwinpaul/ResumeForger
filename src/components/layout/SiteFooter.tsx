export function SiteFooter() {
  return (
    <footer className="no-print border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-muted flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-semibold text-text">Built by Anand Raj</p>
        <p>
          🔒 Your resume stays in your browser. AI requests have your phone, email and address
          removed, and nothing is stored on our server.
        </p>
      </div>
    </footer>
  );
}
