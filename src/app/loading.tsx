export default function Loading() {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <div className="text-center">
        <div className="relative w-20 h-20 mx-auto mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-[#0052FF]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#0052FF] animate-spin" />
          <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-[#0EA5E9] animate-spin" style={{ animationDuration: '1.5s' }} />
        </div>
        <p className="text-text-primary/60">Loading...</p>
      </div>
    </div>
  );
}