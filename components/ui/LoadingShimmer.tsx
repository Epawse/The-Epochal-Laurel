/**
 * Loading shimmer placeholder for AI-generated content.
 * Uses CSS animation defined in globals.css (.loading-shimmer).
 */

interface LoadingShimmerProps {
  /** Number of shimmer lines to display */
  lines?: number;
  /** Additional CSS classes */
  className?: string;
}

export function LoadingShimmer({ lines = 3, className = "" }: LoadingShimmerProps) {
  return (
    <div
      className={`flex flex-col gap-2.5 ${className}`}
      role="status"
      aria-label="Loading content"
    >
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className="loading-shimmer h-4 rounded-sm"
          style={{ width: i === lines - 1 ? "60%" : "100%" }}
        />
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
}
