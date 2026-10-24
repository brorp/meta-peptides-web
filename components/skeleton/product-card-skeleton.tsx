import { Card } from "@/components/ui/card";

export function ProductCardSkeleton() {
  return (
    <Card className="border border-border/50 bg-card rounded-3xl overflow-hidden flex flex-col shadow-sm animate-pulse">
      {/* Visual Top Section Skeleton */}
      <div className="h-56 bg-muted" />

      {/* Content Section Skeleton */}
      <div className="flex flex-grow flex-col space-y-4 p-4">
        <div className="space-y-2">
          <div className="h-5 w-2/3 rounded-md bg-muted" />
          <div className="h-3 w-20 rounded bg-muted" />
        </div>

        <div className="mt-auto space-y-3">
          <div className="h-2 bg-muted rounded-full w-full" />
          <div className="h-12 bg-muted rounded-2xl w-full" />
        </div>
      </div>
    </Card>
  );
}
