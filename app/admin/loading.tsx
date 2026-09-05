import { LoadingRegion, SkeletonBlock, SkeletonLine } from "@/components/ui/Skeleton";

export default function AdminLoading() {
  return (
    <LoadingRegion label="Loading">
      <div className="space-y-10">
        <div className="border-b border-line pb-6">
          <SkeletonLine className="h-9 w-48" />
          <SkeletonLine className="mt-3 h-3 w-64" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-32" />
          ))}
        </div>

        <div className="space-y-4">
          <SkeletonLine className="h-7 w-56" />
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-20" />
          ))}
        </div>
      </div>
    </LoadingRegion>
  );
}
