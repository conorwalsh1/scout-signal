import { cn } from "@/lib/utils";

interface DashboardCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function DashboardCard({ title, children, className }: DashboardCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-5 transition-all duration-200 hover:border-data-blue/60 hover:shadow-card-hover hover:-translate-y-0.5",
        className
      )}
    >
      <h3 className="text-sm font-semibold uppercase tracking-wide text-secondary mb-4">
        {title}
      </h3>
      {children}
    </div>
  );
}
