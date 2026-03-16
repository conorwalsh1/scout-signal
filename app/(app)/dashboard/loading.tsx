import { LoadingState } from "@/components/loading-state";

export default function DashboardLoading() {
  return (
    <div>
      <div className="h-8 w-48 bg-muted animate-pulse rounded mb-6" />
      <div className="h-4 w-96 bg-muted animate-pulse rounded mb-6" />
      <LoadingState />
    </div>
  );
}
