import { LoadingRegion, SkeletonBlock, SkeletonLine } from "@/components/ui/Skeleton";

export default function ReservationsLoading() {
  return (
    <LoadingRegion label="Loading the booking form">
      <div className="container-page page-top pb-20">
        <SkeletonLine className="h-3 w-40" />
        <SkeletonLine className="mt-8 h-16 w-full max-w-xl" />
        <SkeletonLine className="mt-5 h-4 w-72" />
        <div className="mt-16 grid gap-14 lg:grid-cols-12 lg:gap-20">
          <div className="space-y-6 lg:col-span-8">
            <SkeletonLine className="h-3 w-full max-w-md" />
            <SkeletonBlock className="h-12 w-full max-w-xs" />
            <SkeletonBlock className="h-40 w-full" />
          </div>
          <SkeletonBlock className="h-72 lg:col-span-4" />
        </div>
      </div>
    </LoadingRegion>
  );
}
