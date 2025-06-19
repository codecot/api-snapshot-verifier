import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { RefreshCw, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PageLayoutProps {
  title: string;
  children: React.ReactNode;
  className?: string;

  // Header actions
  actions?: React.ReactNode;
  showBackButton?: boolean;
  showRefreshButton?: boolean;
  onRefresh?: () => void | Promise<void>;
  isRefreshing?: boolean;

  // Optional subtitle or description
  subtitle?: string;
  description?: string;

  // Loading state for the entire page
  loading?: boolean;

  // Error state
  error?: string | null;
  onRetry?: () => void;
}

const PageLayout: React.FC<PageLayoutProps> = ({
  title,
  children,
  className,
  actions,
  showBackButton = false,
  showRefreshButton = false,
  onRefresh,
  isRefreshing = false,
  subtitle,
  description,
  loading = false,
  error,
  onRetry,
}) => {
  const navigate = useNavigate();

  const handleRefresh = async () => {
    if (onRefresh && !isRefreshing) {
      await onRefresh();
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="h-8 w-64 bg-muted animate-pulse rounded" />
            {subtitle && (
              <div className="h-4 w-48 bg-muted animate-pulse rounded" />
            )}
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-32 bg-muted animate-pulse rounded-lg" />
          <div className="h-48 bg-muted animate-pulse rounded-lg" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
          </div>
          {(showBackButton || showRefreshButton || actions) && (
            <div className="flex items-center gap-3">
              {showBackButton && (
                <Button variant="outline" onClick={() => navigate(-1)}>
                  <Home className="h-4 w-4 mr-2" />
                  Back
                </Button>
              )}
              {onRetry && <Button onClick={onRetry}>Try Again</Button>}
              {actions}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <h3 className="font-medium text-destructive mb-2">Error occurred</h3>
          <p className="text-sm text-destructive/80">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
          {description && (
            <p className="text-sm text-muted-foreground max-w-2xl">
              {description}
            </p>
          )}
        </div>

        {/* Actions */}
        {(showBackButton || showRefreshButton || actions) && (
          <div className="flex items-center gap-3 shrink-0">
            {showBackButton && (
              <Button variant="outline" onClick={() => navigate(-1)}>
                <Home className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
            {showRefreshButton && onRefresh && (
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw
                  className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")}
                />
                Refresh
              </Button>
            )}
            {actions}
          </div>
        )}
      </div>

      {/* Page Content */}
      <div className="space-y-6">{children}</div>
    </div>
  );
};

export default PageLayout;
