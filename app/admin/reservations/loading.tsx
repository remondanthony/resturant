import { LoadingRegion, SkeletonBlock, SkeletonLine } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <LoadingRegion label="Loading">
      <div className="space-y-8">
        <div className="border-b border-line pb-6">
          <SkeletonLine className="h-9 w-56" />
          <SkeletonLine className="mt-3 h-3 w-72" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-16" />
        ))}
      </div>
    </LoadingRegion>
  );
}
