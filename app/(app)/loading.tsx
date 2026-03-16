import { LoadingState } from "@/components/loading-state";

export default function AppLoading() {
  return (
    <div className="p-6">
      <div className="h-8 w-48 bg-muted animate-pulse rounded mb-6" />
      <LoadingState />
    </div>
  );
}
