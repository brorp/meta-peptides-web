import { Card } from "../ui/card";
import { Skeleton } from "../ui/skeleton";

export default function LabTestSkeleton() {
  return (
    <Card className="p-3 rounded-[2rem] border-none bg-slate-50/50 space-y-4">
      <Skeleton className="aspect-video rounded-[1.5rem] w-full" />
      <div className="grid grid-cols-3 gap-2 px-1">
        <Skeleton className="aspect-square rounded-xl" />
        <Skeleton className="aspect-square rounded-xl" />
        <Skeleton className="aspect-square rounded-xl" />
      </div>
      <div className="space-y-2 px-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-10 w-full rounded-xl mt-4" />
      </div>
    </Card>
  );
}
