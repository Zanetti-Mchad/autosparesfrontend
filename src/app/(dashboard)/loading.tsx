export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="text-center space-y-3">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent mx-auto" />
        <p className="text-sm text-muted-foreground">Loading page…</p>
      </div>
    </div>
  );
}
