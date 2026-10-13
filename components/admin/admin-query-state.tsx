import { Skeleton } from "@/components/ui/skeleton";

/** Loading skeleton or error line for a query; renders nothing once data is there. */
export function AdminQueryState({
  isPending,
  error,
}: {
  isPending: boolean;
  error: Error | null;
}) {
  if (error) {
    return (
      <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
        {error.message}
      </p>
    );
  }

  if (isPending) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-2/3" />
      </div>
    );
  }

  return null;
}
