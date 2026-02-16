import { Card } from "@/components/ui/card";

export function ProductCardSkeleton() {
  return (
    <Card className="border border-border/50 bg-card rounded-3xl overflow-hidden flex flex-col shadow-sm animate-pulse">
      {/* Visual Top Section Skeleton */}
      <div className="relative aspect-[4/3] bg-muted" />

      {/* Content Section Skeleton */}
      <div className="p-5 flex flex-col flex-grow space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-start gap-2">
            <div className="h-5 bg-muted rounded-md w-2/3" />
            <div className="h-4 bg-muted rounded-md w-12" />
          </div>
          <div className="h-3 bg-muted rounded-md w-1/2" />
        </div>

        <div className="flex flex-col items-start gap-2 py-2">
          <div className="h-4 bg-muted rounded-md w-16 opacity-50" />
          <div className="h-8 bg-muted rounded-md w-24" />
        </div>

        <div className="mt-auto space-y-3">
          <div className="h-2 bg-muted rounded-full w-full" />
          <div className="h-12 bg-muted rounded-2xl w-full" />
        </div>
      </div>
    </Card>
  );
}
