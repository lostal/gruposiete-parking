import { Skeleton } from "@/components/ui/skeleton";

export function SpotCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-6 brutal-border brutal-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Spot number badge */}
          <Skeleton className="w-14 h-14 rounded-xl" />
          <div>
            {/* Spot title */}
            <Skeleton className="w-24 h-5 mb-2" />
            {/* Location */}
            <Skeleton className="w-16 h-3" />
          </div>
        </div>
        {/* Status badge */}
        <Skeleton className="w-20 h-6 rounded-lg" />
      </div>
      {/* Assigned to */}
      <div className="mb-4">
        <Skeleton className="w-16 h-3 mb-1" />
        <Skeleton className="w-28 h-4" />
      </div>
      {/* Button */}
      <Skeleton className="w-full h-12 rounded-xl" />
    </div>
  );
}

export function ReservationCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-4 brutal-border brutal-shadow-sm">
      <div className="flex items-center gap-3">
        {/* Date badge */}
        <Skeleton className="w-12 h-12 rounded-xl" />
        <div className="flex-1">
          {/* Spot info */}
          <Skeleton className="w-20 h-4 mb-2" />
          {/* Date */}
          <Skeleton className="w-32 h-3" />
        </div>
        {/* Status */}
        <Skeleton className="w-16 h-6 rounded-lg" />
      </div>
    </div>
  );
}

export function CalendarSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-4 brutal-border brutal-shadow min-h-[280px]">
      {/* Month header */}
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="w-8 h-8 rounded-lg" />
        <Skeleton className="w-32 h-5" />
        <Skeleton className="w-8 h-8 rounded-lg" />
      </div>
      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-6 rounded" />
        ))}
      </div>
      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-lg" />
        ))}
      </div>
    </div>
  );
}
