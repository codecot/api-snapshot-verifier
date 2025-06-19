import React from "react";
import { cn } from "@/lib/utils";

interface PageSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  headerActions?: React.ReactNode;
  spacing?: "sm" | "md" | "lg";
}

const PageSection: React.FC<PageSectionProps> = ({
  title,
  description,
  children,
  className,
  headerActions,
  spacing = "md",
}) => {
  const spacingClasses = {
    sm: "space-y-3",
    md: "space-y-4",
    lg: "space-y-6",
  };

  return (
    <section className={cn(spacingClasses[spacing], className)}>
      {(title || description || headerActions) && (
        <div className="flex items-start justify-between gap-4">
          {(title || description) && (
            <div className="space-y-1 min-w-0 flex-1">
              {title && <h2 className="text-lg font-semibold">{title}</h2>}
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
            </div>
          )}
          {headerActions && <div className="shrink-0">{headerActions}</div>}
        </div>
      )}
      <div>{children}</div>
    </section>
  );
};

export default PageSection;
