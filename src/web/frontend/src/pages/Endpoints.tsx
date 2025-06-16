import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  RefreshCw,
  Loader2,
  Home,
  FileDown,
  MoreVertical,
  CheckSquare,
  X,
  Globe,
  Play,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// API imports
import { endpointsApi } from "@/api/endpoints/endpoints.api";
import { snapshotsApi } from "@/api/snapshots/snapshots.api";

// Context imports
import { useSpace } from "@/contexts/SpaceContext";
import { useCaptureEvents } from "@/contexts/WebSocketContext";
import { useCaptureProgress } from "@/contexts/CaptureProgressContext";

// Component imports
import { EndpointCard, EndpointForm } from "@/components/endpoints";
import {
  BulkActions,
  DeleteConfirmDialog,
  EmptyState,
} from "@/components/shared";
import { ThinStatusBar } from "@/components/StatusBar";
import OpenAPIImport from "@/components/OpenAPIImport";

// Hook imports
import { useEndpointWebSocket } from "@/hooks/endpoints";
import { useSelection, useHighlight, useAutoRefresh } from "@/hooks/shared";

// Utility imports
import { toast } from "@/components/ui/toast";
import { queuedToast } from "@/utils/toastQueue";
import type { ApiEndpoint } from "@/types";

export default function Endpoints() {
  const { currentSpace } = useSpace();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const captureEvents = useCaptureEvents();
  const captureProgress = useCaptureProgress();

  // State management
  const [isCreating, setIsCreating] = useState(false);
  const [editingEndpoint, setEditingEndpoint] = useState<ApiEndpoint | null>(
    null
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [snapshotting, setSnapshotting] = useState<Set<string>>(new Set());
  const [bulkSnapshotting, setBulkSnapshotting] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteSnapshots, setDeleteSnapshots] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "single" | "bulk";
    endpoint?: ApiEndpoint;
  }>({ type: "bulk" });
  const [showOpenAPIImport, setShowOpenAPIImport] = useState(false);

  // Data fetching
  const {
    data: endpointsResponse,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["endpoints", currentSpace],
    queryFn: () => endpointsApi.getAll(currentSpace),
    refetchOnWindowFocus: true,
  });

  const { data: snapshotsResponse, refetch: refetchSnapshots } = useQuery({
    queryKey: ["snapshots", currentSpace],
    queryFn: () => snapshotsApi.getAll(currentSpace),
    refetchOnWindowFocus: true,
    staleTime: 5000,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: true,
    refetchOnReconnect: "always",
  });

  const endpoints = Array.isArray(endpointsResponse) ? endpointsResponse : [];
  const snapshots = Array.isArray(snapshotsResponse) ? snapshotsResponse : [];

  // Selection management
  const selection = useSelection({
    items: endpoints,
    getItemId: (endpoint) => endpoint.name,
  });

  // URL highlight handling
  useHighlight({
    paramName: "highlight",
    highlightDuration: 3000,
  });

  // WebSocket event handling
  useEndpointWebSocket({
    currentSpace,
    captureEvents,
    onSnapshotStarted: (endpointNames) => {
      setSnapshotting((prev) => {
        const newSet = new Set(prev);
        endpointNames.forEach((name) => newSet.add(name));
        return newSet;
      });
    },
    onSnapshotCompleted: () => {
      setSnapshotting(new Set());
      setBulkSnapshotting(false);
    },
    onBulkSnapshotStarted: () => {
      setBulkSnapshotting(true);
    },
    onBulkSnapshotCompleted: () => {
      setBulkSnapshotting(false);
    },
  });

  // Smart refresh
  const handleRefresh = useCallback(
    async (showLoading = true) => {
      if (showLoading) setIsRefreshing(true);

      try {
        await Promise.all([refetch(), refetchSnapshots()]);
      } catch (error) {
        console.error("Failed to refresh data:", error);
        toast.error("Failed to refresh data. Check your connection.");
      } finally {
        if (showLoading) setIsRefreshing(false);
      }
    },
    [refetch, refetchSnapshots]
  );

  // Auto-refresh
  useAutoRefresh({
    enabled: true,
    interval: captureEvents.isConnected ? 60000 : 15000,
    onRefresh: () => handleRefresh(false),
    dependencies: [currentSpace, captureEvents.isConnected],
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (endpoint: ApiEndpoint) =>
      endpointsApi.create(currentSpace, endpoint),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["endpoints", currentSpace] });
      toast.success("Endpoint created successfully");
      setIsCreating(false);
      setEditingEndpoint(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create endpoint");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ name, endpoint }: { name: string; endpoint: ApiEndpoint }) =>
      endpointsApi.update(currentSpace, name, endpoint),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["endpoints", currentSpace] });
      toast.success("Endpoint updated successfully");
      setEditingEndpoint(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update endpoint");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({
      name,
      deleteSnapshots,
    }: {
      name: string;
      deleteSnapshots?: boolean;
    }) => endpointsApi.delete(currentSpace, name, deleteSnapshots),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["endpoints", currentSpace] });
      const snapshotMessage = variables.deleteSnapshots
        ? " (snapshots also deleted)"
        : "";
      toast.success(`Endpoint deleted successfully${snapshotMessage}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete endpoint");
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async ({
      endpointNames,
      deleteSnapshots,
    }: {
      endpointNames: string[];
      deleteSnapshots: boolean;
    }) => {
      const results = [];
      for (const name of endpointNames) {
        try {
          await endpointsApi.delete(currentSpace, name, deleteSnapshots);
          results.push({ name, success: true });
        } catch (error) {
          results.push({ name, success: false, error });
        }
      }
      return results;
    },
    onSuccess: (results) => {
      const successful = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;

      queryClient.invalidateQueries({ queryKey: ["endpoints", currentSpace] });

      if (failed === 0) {
        const snapshotMessage = deleteSnapshots
          ? " (snapshots also deleted)"
          : "";
        toast.success(
          `Successfully deleted ${successful} endpoint(s)${snapshotMessage}`
        );
      } else {
        toast.error(`Deleted ${successful} endpoint(s), ${failed} failed`);
      }

      selection.clearSelection();
      selection.exitSelectionMode();
    },
    onError: () => {
      toast.error("Failed to delete endpoints");
    },
  });

  const importOpenAPIMutation = useMutation({
    mutationFn: ({ schema, options }: { schema: any; options: any }) =>
      endpointsApi.importOpenAPI(currentSpace, schema, options),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["endpoints", currentSpace] });
      toast.success(result.message || "OpenAPI schema imported successfully");
      setShowOpenAPIImport(false);
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to import OpenAPI schema"
      );
    },
  });

  // Action handlers
  const handleSnapshot = async (endpointName: string) => {
    const operationId = captureProgress.startOperation({
      space: currentSpace,
      type: "single",
      endpoints: [endpointName],
      total: 1,
      completed: 0,
      failed: 0,
    });

    setSnapshotting((prev) => new Set(prev).add(endpointName));

    try {
      await snapshotsApi.capture(currentSpace, [endpointName]);
      captureProgress.updateProgress(operationId, { completed: 1 });
      captureProgress.completeOperation(operationId);

      setTimeout(async () => {
        queryClient.invalidateQueries({
          queryKey: ["snapshots", currentSpace],
        });
        await refetchSnapshots();
      }, 1000);
    } catch (error: any) {
      captureProgress.updateProgress(operationId, { failed: 1 });
      captureProgress.completeOperation(operationId);
      queuedToast.error(
        error.response?.data?.message ||
          `Failed to create snapshot for ${endpointName}`
      );
    } finally {
      setSnapshotting((prev) => {
        const newSet = new Set(prev);
        newSet.delete(endpointName);
        return newSet;
      });
    }
  };

  const handleBulkSnapshot = async (endpointNames?: string[]) => {
    const targets = endpointNames || endpoints.map((e) => e.name);

    const operationId = captureProgress.startOperation({
      space: currentSpace,
      type: "bulk",
      endpoints: targets,
      total: targets.length,
      completed: 0,
      failed: 0,
    });

    setBulkSnapshotting(true);

    try {
      await snapshotsApi.capture(currentSpace, targets);
      captureProgress.updateProgress(operationId, {
        completed: targets.length,
      });
      captureProgress.completeOperation(operationId);

      setTimeout(async () => {
        queryClient.invalidateQueries({
          queryKey: ["snapshots", currentSpace],
        });
        await refetchSnapshots();
      }, 1500);
    } catch (error: any) {
      captureProgress.updateProgress(operationId, { failed: targets.length });
      captureProgress.completeOperation(operationId);
      queuedToast.error(
        error.response?.data?.message || "Failed to create bulk snapshots"
      );
    } finally {
      setBulkSnapshotting(false);
    }
  };

  const handleDelete = (endpoint: ApiEndpoint) => {
    setDeleteTarget({ type: "single", endpoint });
    setDeleteSnapshots(false);
    setShowDeleteConfirm(true);
  };

  const handleBulkDelete = () => {
    if (selection.selectedCount === 0) return;
    setDeleteTarget({ type: "bulk" });
    setDeleteSnapshots(false);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (deleteTarget.type === "single" && deleteTarget.endpoint) {
      deleteMutation.mutate({
        name: deleteTarget.endpoint.name,
        deleteSnapshots,
      });
    } else {
      const endpointNames = Array.from(selection.selectedItems);
      bulkDeleteMutation.mutate({ endpointNames, deleteSnapshots });
    }
    setShowDeleteConfirm(false);
  };

  const handleDuplicate = (endpoint: ApiEndpoint) => {
    const duplicatedEndpoint = {
      ...endpoint,
      name: `${endpoint.name} - Copy`,
    };
    setEditingEndpoint(duplicatedEndpoint);
  };

  const handleSmartSnapshot = () => {
    if (selection.selectedCount === 0 || selection.isAllSelected) {
      handleBulkSnapshot();
    } else {
      handleBulkSnapshot(Array.from(selection.selectedItems));
    }
  };

  // Get active operation status
  const activeOperation = captureProgress.getActiveOperation(currentSpace);
  const isCapturing =
    activeOperation?.isActive || bulkSnapshotting || snapshotting.size > 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight dark:text-muted-foreground">Endpoints</h1>
          <p className="text-muted-foreground">Loading endpoints...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ThinStatusBar
        isActive={isCapturing}
        status={isCapturing ? "loading" : "idle"}
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 lg:gap-4">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button
              onClick={() => navigate("/")}
              className="p-1 rounded hover:bg-gray-100 text-muted-foreground hover:text-foreground transition-colors shrink-0"
              title="Go back to the main dashboard overview"
            >
              <Home className="h-4 w-4" />
            </button>
            <span className="text-lg text-muted-foreground shrink-0">/</span>
            <h1 className="text-xl lg:text-2xl font-bold tracking-tight flex items-center gap-1 lg:gap-2 min-w-0 dark:text-muted-foreground">
              <span className="truncate">Endpoints</span>
              {isCapturing && (
                <Loader2 className="h-4 w-4 lg:h-5 lg:w-5 animate-spin text-blue-600 shrink-0" />
              )}
              {/* Mobile connection indicator */}
              <div
                className={`w-2 h-2 rounded-full shrink-0 sm:hidden ${
                  captureEvents.isConnected
                    ? "bg-green-500"
                    : captureEvents.isReconnecting
                    ? "bg-yellow-500 animate-pulse"
                    : "bg-red-500"
                }`}
                title={`Connection: ${
                  captureEvents.isConnected
                    ? "Live connection active"
                    : captureEvents.isReconnecting
                    ? `Reconnecting (attempt ${captureEvents.reconnectAttempts}/10)`
                    : "Offline - no real-time updates"
                }`}
              />
            </h1>
            <div className="flex items-center gap-2 shrink-0 hidden sm:block">
              <div
                className="text-muted-foreground text-xs lg:text-sm px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded cursor-help flex items-center gap-2"
                title={`Space: ${currentSpace} - Manage your API endpoints for this environment`}
              >
                <span>{currentSpace}</span>
                <div
                  className={`w-2 h-2 rounded-full ${
                    captureEvents.isConnected
                      ? "bg-green-500"
                      : captureEvents.isReconnecting
                      ? "bg-yellow-500 animate-pulse"
                      : "bg-red-500"
                  }`}
                  title={`Connection: ${
                    captureEvents.isConnected
                      ? "Live connection active"
                      : captureEvents.isReconnecting
                      ? `Reconnecting (attempt ${captureEvents.reconnectAttempts}/10)`
                      : "Offline - no real-time updates"
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 lg:gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRefresh(true)}
              disabled={isRefreshing || isCapturing}
              className={`h-8 w-8 lg:h-9 lg:w-auto lg:px-3 p-0 lg:gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                !captureEvents.isConnected && !captureEvents.isReconnecting
                  ? "border-orange-300 text-orange-600 hover:bg-orange-50 dark:border-orange-600 dark:text-orange-400 dark:hover:bg-orange-900/20"
                  : captureEvents.isReconnecting
                  ? "border-yellow-300 text-yellow-600 hover:bg-yellow-50 dark:border-yellow-600 dark:text-yellow-400 dark:hover:bg-yellow-900/20"
                  : "hover:bg-white/50 dark:hover:bg-white/5 hover:backdrop-blur-sm dark:text-muted-foreground dark:border-muted-foreground/50"
              }`}
              title={
                isCapturing
                  ? "Please wait for current operations to complete"
                  : captureEvents.isReconnecting
                  ? "Reconnecting to server..."
                  : !captureEvents.isConnected
                  ? "WebSocket disconnected - click to refresh data and reconnect"
                  : "Refresh data (auto-refresh is active)"
              }
            >
              {isRefreshing ? (
                <Loader2 className="h-3 w-3 lg:h-4 lg:w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3 lg:h-4 lg:w-4" />
              )}
              <span className="hidden lg:inline text-xs">
                {isRefreshing
                  ? "Refreshing..."
                  : isCapturing
                  ? "Wait..."
                  : captureEvents.isReconnecting
                  ? "Reconnecting..."
                  : !captureEvents.isConnected
                  ? "Offline"
                  : "Refresh"}
              </span>
            </Button>

            <Button
              variant="outline"
              onClick={() => setIsCreating(true)}
              size="sm"
              disabled={isCapturing}
              className="h-8 w-8 lg:h-9 lg:w-auto lg:px-3 p-0 lg:gap-2 transition-all duration-200 hover:bg-white/50 dark:hover:bg-white/5 hover:backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed dark:text-muted-foreground dark:border-muted-foreground/50"
              title={
                isCapturing
                  ? "Please wait for current operations to complete"
                  : "Create a new API endpoint to monitor"
              }
            >
              <Plus className="h-3 w-3 lg:h-4 lg:w-4" />
              <span className="hidden lg:inline text-xs">Add</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowOpenAPIImport(true)}
              disabled={isCapturing}
              className="h-8 w-8 lg:h-9 lg:w-auto lg:px-3 p-0 lg:gap-2 transition-all duration-200 hover:bg-white/50 dark:hover:bg-white/5 hover:backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed dark:text-muted-foreground dark:border-muted-foreground/50"
              title={
                isCapturing
                  ? "Please wait for current operations to complete"
                  : "Import endpoints from OpenAPI/Swagger schema file"
              }
            >
              <FileDown className="h-3 w-3 lg:h-4 lg:w-4" />
              <span className="hidden lg:inline text-xs">Import</span>
            </Button>

            {/* Three Dots Menu */}
            {endpoints.length > 0 && (
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowActionsMenu(!showActionsMenu)}
                  className="h-8 w-8 lg:h-9 lg:w-9 p-0 transition-all duration-200 hover:bg-white/50 dark:hover:bg-white/5 hover:backdrop-blur-sm dark:text-muted-foreground dark:border-muted-foreground/50"
                  title="More actions: Enable selection mode for bulk operations"
                >
                  <MoreVertical className="h-3 w-3 lg:h-4 lg:w-4" />
                </Button>

                {showActionsMenu && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-popover text-popover-foreground border border-border rounded-md shadow-lg z-50">
                    <button
                      onClick={() => {
                        selection.toggleSelectionMode();
                        setShowActionsMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      {selection.selectionMode ? (
                        <>
                          <X className="h-4 w-4" />
                          Exit Selection Mode
                        </>
                      ) : (
                        <>
                          <CheckSquare className="h-4 w-4" />
                          Selection Mode
                        </>
                      )}
                    </button>
                  </div>
                )}

                {showActionsMenu && (
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowActionsMenu(false)}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bulk Actions */}
        <BulkActions
          isVisible={selection.selectionMode}
          selectedCount={selection.selectedCount}
          totalCount={endpoints.length}
          isAllSelected={selection.isAllSelected}
          isLoading={isCapturing}
          onSelectAll={selection.selectAll}
          onClearSelection={selection.clearSelection}
          onExit={selection.exitSelectionMode}
          actions={
            <>
              <Button
                onClick={handleSmartSnapshot}
                disabled={
                  bulkSnapshotting ||
                  selection.selectedCount === 0 ||
                  isCapturing
                }
                className="gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                size="sm"
                title={
                  isCapturing
                    ? "Please wait for current operations to complete"
                    : selection.selectedCount === 0 || selection.isAllSelected
                    ? `Capture snapshots for all ${endpoints.length} endpoints`
                    : `Capture snapshots for the ${selection.selectedCount} selected endpoints`
                }
              >
                {bulkSnapshotting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                <span className="hidden md:inline">
                  {selection.selectedCount === 0
                    ? `Snapshot All (${endpoints.length})`
                    : selection.isAllSelected
                    ? `Snapshot All (${endpoints.length})`
                    : `Snapshot Selected (${selection.selectedCount})`}
                </span>
                <span className="md:hidden">Snapshot</span>
              </Button>

              <Button
                onClick={handleBulkDelete}
                disabled={
                  bulkDeleteMutation.isPending ||
                  selection.selectedCount === 0 ||
                  isCapturing
                }
                variant="outline"
                className="gap-2 border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                size="sm"
                title={
                  isCapturing
                    ? "Please wait for current operations to complete"
                    : `Permanently delete the ${selection.selectedCount} selected endpoints (you can choose whether to also delete their snapshots)`
                }
              >
                {bulkDeleteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                <span className="hidden md:inline">
                  {selection.isAllSelected
                    ? `Delete All (${endpoints.length})`
                    : `Delete Selected (${selection.selectedCount})`}
                </span>
                <span className="md:hidden">Delete</span>
              </Button>
            </>
          }
        />

        {/* Endpoints List */}
        <div className="grid gap-4">
          {endpoints.length === 0 ? (
            <EmptyState
              icon={Globe}
              title="No endpoints configured"
              description="Add your first API endpoint to start monitoring"
              action={{
                label: "Add Endpoint",
                onClick: () => setIsCreating(true),
                icon: Plus,
              }}
            />
          ) : (
            endpoints.map((endpoint: ApiEndpoint) => (
              <EndpointCard
                key={endpoint.name}
                endpoint={endpoint}
                snapshots={snapshots}
                isSelected={selection.isSelected(endpoint.name)}
                selectionMode={selection.selectionMode}
                isSnapshotting={snapshotting.has(endpoint.name)}
                isCapturing={isCapturing}
                onToggleSelection={() =>
                  selection.toggleSelection(endpoint.name)
                }
                onSnapshot={() => handleSnapshot(endpoint.name)}
                onEdit={() => setEditingEndpoint(endpoint)}
                onDuplicate={() => handleDuplicate(endpoint)}
                onDelete={() => handleDelete(endpoint)}
              />
            ))
          )}
        </div>

        {/* Modals */}
        {(isCreating || editingEndpoint) && (
          <EndpointForm
            endpoint={editingEndpoint}
            endpoints={endpoints}
            onSave={(endpoint) => {
              const isDuplicate = editingEndpoint?.name?.includes(" - Copy");
              if (editingEndpoint && !isDuplicate) {
                updateMutation.mutate({ name: editingEndpoint.name, endpoint });
              } else {
                createMutation.mutate(endpoint);
              }
            }}
            onCancel={() => {
              setIsCreating(false);
              setEditingEndpoint(null);
            }}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        )}

        <DeleteConfirmDialog
          isOpen={showDeleteConfirm}
          title={
            deleteTarget.type === "single"
              ? "Confirm Deletion"
              : "Confirm Bulk Deletion"
          }
          message={
            deleteTarget.type === "single" && deleteTarget.endpoint ? (
              <>
                Are you sure you want to delete endpoint{" "}
                <strong
                  className="inline-block max-w-[300px] truncate align-bottom"
                  title={deleteTarget.endpoint.name}
                >
                  "{deleteTarget.endpoint.name}"
                </strong>
                ?
              </>
            ) : (
              <>
                Are you sure you want to delete{" "}
                <strong>{selection.selectedCount}</strong> selected endpoint(s)?
              </>
            )
          }
          itemsToDelete={
            deleteTarget.type === "single" && deleteTarget.endpoint
              ? [deleteTarget.endpoint.name]
              : Array.from(selection.selectedItems)
          }
          isDeleting={deleteMutation.isPending || bulkDeleteMutation.isPending}
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          confirmText={
            deleteTarget.type === "single"
              ? "Delete Endpoint"
              : `Delete ${selection.selectedCount} Endpoint(s)`
          }
          additionalOptions={
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <input
                type="checkbox"
                id="deleteSnapshots"
                checked={deleteSnapshots}
                onChange={(e) => setDeleteSnapshots(e.target.checked)}
                className="w-4 h-4 text-yellow-600 bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-yellow-500 mt-0.5"
              />
              <div>
                <label
                  htmlFor="deleteSnapshots"
                  className="text-sm font-medium text-yellow-800 cursor-pointer"
                >
                  {deleteTarget.type === "single"
                    ? "Also delete all snapshots for this endpoint"
                    : "Also delete all snapshots for these endpoints"}
                </label>
                <p className="text-xs text-yellow-700 mt-1">
                  {deleteTarget.type === "single"
                    ? "If checked, all snapshot files associated with this endpoint will be permanently deleted from storage."
                    : "If checked, all snapshot files associated with these endpoints will be permanently deleted from storage."}
                </p>
              </div>
            </div>
          }
        />

        {showOpenAPIImport && (
          <OpenAPIImport
            onImport={(schema, options) => {
              importOpenAPIMutation.mutate({ schema, options });
            }}
            onClose={() => setShowOpenAPIImport(false)}
            existingEndpoints={endpoints}
            currentSpace={currentSpace}
          />
        )}
      </div>
    </>
  );
}
