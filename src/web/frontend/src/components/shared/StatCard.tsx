import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color?: string;
  bg?: string;
  borderColor?: string;
  className?: string;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  color = "text-primary",
  bg = "bg-primary/10",
  borderColor = "border-primary/20",
  className,
  subtitle,
  trend,
}) => {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-6 shadow-sm transition-colors hover:bg-card/80",
        borderColor,
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold">{value}</p>
            {trend && (
              <span
                className={cn(
                  "text-xs font-medium",
                  trend.isPositive
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                )}
              >
                {trend.isPositive ? "+" : ""}
                {trend.value}%
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div
          className={cn(
            "rounded-full p-3",
            bg,
            borderColor && `border ${borderColor}`
          )}
        >
          <Icon className={cn("h-5 w-5", color)} />
        </div>
      </div>
    </div>
  );
};

export default StatCard;
