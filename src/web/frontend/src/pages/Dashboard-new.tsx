import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Share2,
  Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { snapshotsApi } from "@/api/snapshots/snapshots.api";
import { endpointsApi } from "@/api/endpoints/endpoints.api";
import { useSpace } from "@/contexts/SpaceContext";
import { useCaptureEvents } from "@/contexts/WebSocketContext";
import { useCaptureProgress } from "@/contexts/CaptureProgressContext";
import { ThinStatusBar } from "@/components/StatusBar";
import { formatRelativeTime } from "@/utils/dateUtils";
import { useState, useEffect } from "react";
import { toast } from "@/components/ui/toast";
import { useNavigate } from "react-router-dom";
import { PageLayout, StatCard, PageSection } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";

export default function Dashboard() {
  const { currentSpace, shareUrl } = useSpace();
  const navigate = useNavigate();
  const captureEvents = useCaptureEvents();
  const captureProgress = useCaptureProgress();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    data: snapshotsResponse,
    refetch: refetchSnapshots,
    isLoading: loadingSnapshots,
  } = useQuery({
    queryKey: ["snapshots", currentSpace],
    queryFn: () => snapshotsApi.getAllBySpace(currentSpace!),
    refetchOnWindowFocus: true,
    enabled: !!currentSpace,
  });

  const {
    data: endpointsResponse,
    refetch: refetchEndpoints,
    isLoading: loadingEndpoints,
  } = useQuery({
    queryKey: ["endpoints", currentSpace],
    queryFn: () => endpointsApi.getAll(currentSpace),
    refetchOnWindowFocus: true,
    enabled: !!currentSpace,
  });

  // Auto-refresh timer
  useEffect(() => {
    const refreshInterval = captureEvents.isConnected ? 30000 : 10000;

    const interval = setInterval(async () => {
      await handleRefresh(false);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [currentSpace, captureEvents.isConnected]);

  // Handle manual refresh
  const handleRefresh = async (showLoading = true) => {
    if (showLoading) setIsRefreshing(true);

    try {
      await Promise.all([refetchSnapshots(), refetchEndpoints()]);
    } catch (error) {
      console.error("Failed to refresh data:", error);
    } finally {
      if (showLoading) setIsRefreshing(false);
    }
  };

  // Handle share URL copy
  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Share URL copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy share URL");
    }
  };

  // Extract data from API response format
  const snapshots = Array.isArray(snapshotsResponse) ? snapshotsResponse : [];
  const endpoints = Array.isArray(endpointsResponse) ? endpointsResponse : [];

  // Calculate stats
  const successfulSnapshots = snapshots.filter(
    (s: any) => s.status === "success"
  ).length;
  const failedSnapshots = snapshots.filter(
    (s: any) => s.status === "error" || s.error
  ).length;

  const snapshotsWithTime = snapshots.filter(
    (s: any) => s.duration && s.status === "success"
  );
  const avgResponseTime =
    snapshotsWithTime.length > 0
      ? Math.round(
          snapshotsWithTime.reduce(
            (acc: number, s: any) => acc + s.duration,
            0
          ) / snapshotsWithTime.length
        )
      : 0;

  const stats = [
    {
      title: "Total Endpoints",
      value: endpoints.length,
      icon: Activity,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-100 dark:bg-transparent",
      borderColor: "dark:border-blue-400",
    },
    {
      title: "Successful Snapshots",
      value: successfulSnapshots,
      icon: CheckCircle,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-100 dark:bg-transparent",
      borderColor: "dark:border-green-400",
    },
    {
      title: "Failed Snapshots",
      value: failedSnapshots,
      icon: AlertCircle,
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-100 dark:bg-transparent",
      borderColor: "dark:border-red-400",
    },
    {
      title: "Avg Response Time",
      value: `${avgResponseTime}ms`,
      icon: Clock,
      color: "text-yellow-600 dark:text-yellow-400",
      bg: "bg-yellow-100 dark:bg-transparent",
      borderColor: "dark:border-yellow-400",
    },
  ];

  // Get active operation status
  const activeOperation = captureProgress.getActiveOperation(currentSpace);
  const isCapturing = activeOperation?.isActive || false;

  // Show message if no space is selected
  if (!currentSpace) {
    return (
      <PageLayout title="Dashboard">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No Space Selected</p>
            <p className="text-sm text-muted-foreground mt-2">
              Please select a space from the dropdown above to view dashboard
              statistics.
            </p>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  // Create header actions
  const headerActions = (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${
            captureEvents.isConnected ? "bg-green-500" : "bg-red-500"
          }`}
        />
        <span className="text-sm text-muted-foreground">
          {captureEvents.isConnected ? "Connected" : "Disconnected"}
        </span>
      </div>

      {shareUrl && (
        <Button variant="outline" size="sm" onClick={handleShare}>
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      )}
    </div>
  );

  return (
    <PageLayout
      title="Dashboard"
      subtitle="Monitor your API endpoints and snapshot performance"
      loading={loadingSnapshots || loadingEndpoints}
      showRefreshButton
      onRefresh={() => handleRefresh(true)}
      isRefreshing={isRefreshing}
      actions={headerActions}
    >
      {/* Status Bar */}
      {isCapturing && (
        <ThinStatusBar
          isActive={isCapturing}
          status={isCapturing ? "loading" : "idle"}
          message={`Capturing ${
            activeOperation?.type === "bulk" ? "multiple" : "single"
          } snapshot(s)...`}
        />
      )}

      {/* Stats Grid */}
      <PageSection title="Overview">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <StatCard
              key={stat.title}
              title={stat.title}
              icon={stat.icon}
              value={loadingSnapshots || loadingEndpoints ? "-" : stat.value}
              color={stat.color}
              bg={stat.bg}
              borderColor={stat.borderColor}
            />
          ))}
        </div>
      </PageSection>

      {/* Recent Activity */}
      <PageSection title="Recent Snapshots">
        <Card>
          <CardContent>
            {snapshots.length === 0 ? (
              <div className="py-12 text-center">
                <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No snapshots captured yet
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Go to the Endpoints page to capture your first snapshot
                </p>
                <Button onClick={() => navigate("/endpoints")} className="mt-4">
                  Go to Endpoints
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {snapshots.slice(0, 5).map((snapshot: any) => (
                  <div
                    key={snapshot.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          snapshot.status === "success"
                            ? "bg-green-500"
                            : "bg-red-500"
                        }`}
                      />
                      <div>
                        <p className="font-medium">
                          {snapshot.endpoint || snapshot.method}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatRelativeTime(
                            snapshot.timestamp || snapshot.created_at
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">
                        {snapshot.duration ? `${snapshot.duration}ms` : "-"}
                      </p>
                      <p
                        className={`text-xs ${
                          snapshot.status === "success"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {snapshot.status || "completed"}
                      </p>
                    </div>
                  </div>
                ))}

                {snapshots.length > 5 && (
                  <div className="text-center pt-4">
                    <Button
                      variant="outline"
                      onClick={() => navigate("/snapshots")}
                    >
                      View All Snapshots ({snapshots.length})
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </PageSection>
    </PageLayout>
  );
}
