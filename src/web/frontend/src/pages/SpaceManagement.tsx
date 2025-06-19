import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, Edit, Globe, FileText, Settings, CheckCircle, XCircle, Activity, Clock, AlertCircle, Database, MoreVertical, CheckSquare, X, Zap, Code2, Box } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { spacesApi } from '@/api/spaces/spaces.api';
import { toast } from '@/components/ui/toast';
import { useSpace } from '@/contexts/SpaceContext';
import { parametersApi } from '@/api/parameters/parameters.api';
import { PageLayout, EmptyState } from '@/components/shared';

interface SpaceStats {
  endpoints: number;
  parameters: number;
  snapshots: number;
  recentSnapshots: number;
  successRate: number;
}

interface Space {
  id: number;
  name: string;
  display_name?: string;
  description?: string;
  environment?: string;
  snapshot_dir: string;
  baseline_dir: string;
  created_at: string;
  updated_at: string;
  stats: SpaceStats;
}

// Smart environment detection for spaces (same as SpaceSelector)
function getSpaceEnvironment(space: string): {
  icon: React.ReactNode
  bgColor: string
  hoverBgColor: string
  textColor: string
  borderColor: string
  label: string
  className: string
} {
  const lowerSpace = space.toLowerCase()
  
  // Production variants (red theme)
  if (lowerSpace.includes('prod') || lowerSpace.includes('live') || lowerSpace.includes('release')) {
    return {
      icon: <AlertCircle className="h-5 w-5" />,
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      hoverBgColor: 'hover:bg-red-100 dark:hover:bg-red-900/30',
      textColor: 'text-red-700 dark:text-red-400',
      borderColor: 'border-red-300/50 dark:border-red-600/30',
      label: 'Production',
      className: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30'
    }
  }
  
  // Staging/QA variants (yellow theme) 
  if (lowerSpace.includes('stag') || lowerSpace.includes('qa') || lowerSpace.includes('test') || lowerSpace.includes('uat') || lowerSpace.includes('sandbox')) {
    return {
      icon: <Zap className="h-5 w-5" />,
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      hoverBgColor: 'hover:bg-yellow-100 dark:hover:bg-yellow-900/30',
      textColor: 'text-yellow-700 dark:text-yellow-400',
      borderColor: 'border-yellow-300/50 dark:border-yellow-600/30',
      label: 'Staging',
      className: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
    }
  }
  
  // Development variants (green theme)
  if (lowerSpace.includes('dev') || lowerSpace.includes('local')) {
    return {
      icon: <Code2 className="h-5 w-5" />,
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      hoverBgColor: 'hover:bg-green-100 dark:hover:bg-green-900/30',
      textColor: 'text-green-700 dark:text-green-400',
      borderColor: 'border-green-300/50 dark:border-green-600/30',
      label: 'Development',
      className: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30'
    }
  }
  
  // Default/other (blue theme)
  return {
    icon: <Box className="h-5 w-5" />,
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    hoverBgColor: 'hover:bg-blue-100 dark:hover:bg-blue-900/30',
    textColor: 'text-blue-700 dark:text-blue-400',
    borderColor: 'border-blue-300/50 dark:border-blue-600/30',
    label: 'Default',
    className: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30'
  }
}

export default function SpaceManagement() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { spacesInfo } = useSpace();
  const [selectedSpaces, setSelectedSpaces] = useState<Set<number>>(new Set());
  const [editingSpace, setEditingSpace] = useState<number | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editDisplayName, setEditDisplayName] = useState('');
  const [selectionMode, setSelectionMode] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  // Fetch spaces with parameter counts
  const { data: spacesData, isLoading } = useQuery({
    queryKey: ["spaces-with-params", spacesInfo],
    queryFn: async () => {
      if (!spacesInfo) return [];
      
      const spacesWithStats = await Promise.all(
        spacesInfo.map(async (spaceInfo, index) => {
          try {
            // Fetch parameters for this space
            const params = await parametersApi.getAll(spaceInfo.name);
            const paramCount = Object.keys(params).length;
            
            return {
              id: index + 1,
              name: spaceInfo.name,
              display_name: spaceInfo.name,
              description: '',
              environment: undefined,
              snapshot_dir: `snapshots/${spaceInfo.name}`,
              baseline_dir: `baselines/${spaceInfo.name}`,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              stats: {
                endpoints: spaceInfo.endpoint_count || 0,
                parameters: paramCount,
                snapshots: 0,
                recentSnapshots: 0,
                successRate: 0
              }
            };
          } catch (error) {
            console.warn(`Failed to fetch parameters for space ${spaceInfo.name}:`, error);
            return {
              id: index + 1,
              name: spaceInfo.name,
              display_name: spaceInfo.name,
              description: '',
              environment: undefined,
              snapshot_dir: `snapshots/${spaceInfo.name}`,
              baseline_dir: `baselines/${spaceInfo.name}`,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              stats: {
                endpoints: spaceInfo.endpoint_count || 0,
                parameters: 0,
                snapshots: 0,
                recentSnapshots: 0,
                successRate: 0
              }
            };
          }
        })
      );
      
      return spacesWithStats;
    },
    enabled: !!spacesInfo,
    staleTime: 0 // Always refetch to get latest counts
  });
  
  const spaces = spacesData || [];

  // spaces is already defined above

  const handleSelectSpace = (spaceId: number) => {
    const newSelected = new Set(selectedSpaces);
    if (newSelected.has(spaceId)) {
      newSelected.delete(spaceId);
    } else {
      newSelected.add(spaceId);
    }
    setSelectedSpaces(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedSpaces.size === spaces.length) {
      setSelectedSpaces(new Set());
    } else {
      setSelectedSpaces(new Set(spaces.map(s => s.id)));
    }
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setShowActionsMenu(false);
    if (!selectionMode) {
      // Entering selection mode - clear any existing selections
      setSelectedSpaces(new Set());
    } else {
      // Exiting selection mode - clear selections
      setSelectedSpaces(new Set());
    }
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedSpaces(new Set());
  };

  // Delete batch mutation
  const deleteBatchMutation = useMutation({
    mutationFn: async (spaceNames: string[]) => {
      // Delete spaces one by one since there's no batch API
      const results = { deleted: [] as string[], failed: [] as string[] };
      
      for (const spaceName of spaceNames) {
        try {
          await spacesApi.deleteSpace(spaceName);
          results.deleted.push(spaceName);
        } catch (error) {
          console.error(`Failed to delete space ${spaceName}:`, error);
          results.failed.push(spaceName);
        }
      }
      
      return results;
    },
    onSuccess: (data) => {
      if (data.deleted.length > 0) {
        toast.success(`Successfully deleted ${data.deleted.length} spaces`);
      }
      if (data.failed.length > 0) {
        toast.error(`Failed to delete: ${data.failed.join(', ')}`);
      }
      setSelectedSpaces(new Set());
      queryClient.invalidateQueries({ queryKey: ['spaces-management'] });
    },
    onError: (error) => {
      console.error('Error deleting spaces:', error);
      toast.error('Failed to delete spaces');
    }
  });

  const handleDeleteSelected = async () => {
    if (selectedSpaces.size === 0) return;

    const spaceNames = spaces
      .filter(s => selectedSpaces.has(s.id))
      .map(s => s.name);

    if (!confirm(`Are you sure you want to delete ${selectedSpaces.size} space(s)?\n\nSpaces to delete:\n${spaceNames.join('\n')}\n\nThis will also delete all associated endpoints, parameters, and snapshots.`)) {
      return;
    }

    const spaceNamesToDelete = spaces
      .filter(s => selectedSpaces.has(s.id))
      .map(s => s.name);
    
    deleteBatchMutation.mutate(spaceNamesToDelete);
  };

  // Delete single space mutation
  const deleteSingleMutation = useMutation({
    mutationFn: async (space: Space) => {
      await spacesApi.deleteSpace(space.name);
      return space;
    },
    onSuccess: (space) => {
      toast.success(`Space "${space.name}" deleted successfully`);
      queryClient.invalidateQueries({ queryKey: ['spaces-management'] });
    },
    onError: (error, space) => {
      console.error('Error deleting space:', error);
      toast.error(`Failed to delete space "${space.name}"`);
    }
  });

  const handleDeleteSingle = async (space: Space) => {
    if (!confirm(`Are you sure you want to delete the space "${space.name}"?\n\nThis will also delete:\n- ${space.stats?.endpoints || 0} endpoints\n- ${space.stats?.parameters || 0} parameters\n- ${space.stats?.snapshots || 0} snapshots`)) {
      return;
    }

    deleteSingleMutation.mutate(space);
  };

  const handleStartEdit = (space: Space) => {
    setEditingSpace(space.id);
    setEditDescription(space.description || '');
    setEditDisplayName(space.display_name || '');
  };

  // Update space mutation
  const updateSpaceMutation = useMutation({
    mutationFn: async ({ space, data }: { space: Space; data: any }) => {
      // Note: The API doesn't support updating spaces yet
      // This is a placeholder for when the feature is added
      toast.info('Space editing is not yet implemented in the backend');
      return { ...space, ...data };
    },
    onSuccess: (space) => {
      setEditingSpace(null);
      // Don't show success message since it's not actually saved
    },
    onError: (error, { space }) => {
      console.error('Error updating space:', error);
      toast.error(`Failed to update space "${space.name}"`);
    }
  });

  const handleSaveEdit = async (space: Space) => {
    updateSpaceMutation.mutate({
      space,
      data: {
        description: editDescription || undefined,
        display_name: editDisplayName || undefined
      }
    });
  };

  const handleCancelEdit = () => {
    setEditingSpace(null);
    setEditDescription('');
    setEditDisplayName('');
  };

  const getEnvironmentBadgeVariant = (environment?: string) => {
    switch (environment) {
      case 'production': return 'destructive';
      case 'staging': return 'outline';
      case 'development': return 'default';
      default: return 'secondary';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <PageLayout 
        title="Space Management"
        description="Manage your API snapshot spaces and their configurations"
      >
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground">Loading spaces...</div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout 
      title="Space Management"
      description="Manage your API snapshot spaces and their configurations"
    >
      <div className="mb-6">
        <div className="flex items-center justify-end">
          {/* Three Dots Menu */}
          {spaces.length > 0 && (
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowActionsMenu(!showActionsMenu)}
                className="h-9 w-9 p-0"
                title="More actions: Enable selection mode for bulk operations"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>

              {/* Dropdown Menu */}
              {showActionsMenu && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-popover text-popover-foreground border border-border rounded-md shadow-lg z-50">
                  <button
                    onClick={toggleSelectionMode}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                  >
                    {selectionMode ? (
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

              {/* Close menu when clicking outside */}
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

      {/* Bulk Actions - Only show when in selection mode */}
      {selectionMode && spaces.length > 0 && (
        <div className="mb-4 bg-accent/50 border border-accent rounded p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={
                    selectedSpaces.size === spaces.length && spaces.length > 0
                  }
                  onChange={handleSelectAll}
                  className="cursor-pointer"
                />
                <span className="text-sm font-medium text-primary cursor-pointer hover:text-primary/80">
                  {selectedSpaces.size === spaces.length
                    ? "Deselect All"
                    : "Select All"}
                  {selectedSpaces.size > 0 &&
                    ` (${selectedSpaces.size}/${spaces.length})`}
                </span>
              </label>
            </div>
            <div className="flex items-center gap-2">
              {selectedSpaces.size > 0 && (
                <Button
                  onClick={handleDeleteSelected}
                  disabled={deleteBatchMutation.isPending}
                  variant="outline"
                  size="sm"
                  className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/10 dark:text-destructive dark:border-destructive/50"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden md:inline">Delete Selected ({selectedSpaces.size})</span>
                  <span className="md:hidden">Delete</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={exitSelectionMode}
                className="gap-2 border-primary/50 text-primary hover:bg-primary/10 dark:text-primary dark:border-primary/50"
              >
                <X className="h-4 w-4" />
                <span className="hidden md:inline">Exit</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4 text-sm text-muted-foreground text-right">
        Total: {spaces.length} spaces
      </div>

      <div className="grid gap-4">
        {spaces.map((space) => {
          const env = getSpaceEnvironment(space.name);
          return (
            <div
              key={space.id}
              className={`border-2 rounded-lg p-4 ${
                selectedSpaces.has(space.id)
                  ? "border-primary bg-primary/10"
                  : env.borderColor
              }`}
            >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                {/* Only show checkbox in selection mode */}
                {selectionMode && (
                  <input
                    type="checkbox"
                    checked={selectedSpaces.has(space.id)}
                    onChange={() => handleSelectSpace(space.id)}
                    className="mt-1 w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary"
                    aria-label={`Select space ${space.name}`}
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {(() => {
                      const env = getSpaceEnvironment(space.name);
                      return env.icon;
                    })()}
                    <h3 className="text-lg font-semibold dark:text-muted-foreground">{space.name}</h3>
                    {space.display_name &&
                      space.display_name !== space.name && (
                        <span className="text-muted-foreground">
                          ({space.display_name})
                        </span>
                      )}
                    {space.environment && (
                      <Badge
                        variant={getEnvironmentBadgeVariant(space.environment)}
                      >
                        {space.environment}
                      </Badge>
                    )}
                  </div>

                  {editingSpace === space.id ? (
                    <div className="space-y-2 mb-3">
                      <input
                        type="text"
                        value={editDisplayName}
                        onChange={(e) => setEditDisplayName(e.target.value)}
                        placeholder="Display name"
                        className="w-full px-3 py-1 border border-border rounded bg-background text-foreground"
                      />
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Description"
                        className="w-full px-3 py-1 border border-border rounded bg-background text-foreground"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(space)}
                          className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-3 py-1 bg-muted text-muted-foreground rounded text-sm hover:bg-muted/80 dark:bg-muted dark:text-muted-foreground"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    space.description && (
                      <p className="text-muted-foreground mb-3">{space.description}</p>
                    )
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-3">
                    <button
                      onClick={() => navigate(`/endpoints?space=${space.name}`)}
                      className="flex items-center gap-2 p-2 rounded text-left transition-all duration-200 hover:bg-white/50 dark:hover:bg-white/5 hover:backdrop-blur-sm hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/20 dark:hover:shadow-blue-400/20 border border-transparent hover:border-blue-500/50 dark:hover:border-blue-400/50"
                      title="View endpoints"
                    >
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">
                          {space.stats?.endpoints || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">Endpoints</div>
                      </div>
                    </button>
                    <button
                      onClick={() =>
                        navigate(`/parameters?space=${space.name}`)
                      }
                      className="flex items-center gap-2 p-2 rounded text-left transition-all duration-200 hover:bg-white/50 dark:hover:bg-white/5 hover:backdrop-blur-sm hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/20 dark:hover:shadow-blue-400/20 border border-transparent hover:border-blue-500/50 dark:hover:border-blue-400/50"
                      title="View parameters"
                    >
                      <Settings className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">
                          {space.stats?.parameters || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">Parameters</div>
                      </div>
                    </button>
                    <button
                      onClick={() => navigate(`/snapshots?space=${space.name}`)}
                      className="flex items-center gap-2 p-2 rounded text-left transition-all duration-200 hover:bg-white/50 dark:hover:bg-white/5 hover:backdrop-blur-sm hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/20 dark:hover:shadow-blue-400/20 border border-transparent hover:border-blue-500/50 dark:hover:border-blue-400/50"
                      title="View snapshots"
                    >
                      <Database className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">
                          {space.stats.snapshots}
                        </div>
                        <div className="text-xs text-muted-foreground">Snapshots</div>
                      </div>
                    </button>
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">
                          {space.stats.recentSnapshots}
                        </div>
                        <div className="text-xs text-muted-foreground">Last 24h</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {space.stats.successRate >= 90 ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : space.stats.successRate >= 70 ? (
                        <AlertCircle className="w-4 h-4 text-yellow-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <div>
                        <div className="text-sm font-medium">
                          {space.stats.successRate}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Success Rate
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Created: {formatDate(space.created_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Updated: {formatDate(space.updated_at)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-4">
                {editingSpace !== space.id && (
                  <>
                    <button
                      onClick={() => handleStartEdit(space)}
                      className="p-2 text-muted-foreground rounded transition-all duration-200 hover:bg-white/50 dark:hover:bg-white/5 hover:backdrop-blur-sm hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/20 dark:hover:shadow-blue-400/20 border border-transparent hover:border-blue-500/50 dark:hover:border-blue-400/50"
                      title="Edit space"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => navigate(`/endpoints?space=${space.name}`)}
                      className="p-2 text-primary rounded transition-all duration-200 hover:bg-white/50 dark:hover:bg-white/5 hover:backdrop-blur-sm hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/20 dark:hover:shadow-blue-400/20 border border-transparent hover:border-blue-500/50 dark:hover:border-blue-400/50"
                      title="View endpoints"
                    >
                      <Globe className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSingle(space)}
                      className="p-2 text-destructive rounded transition-all duration-200 hover:bg-white/50 dark:hover:bg-white/5 hover:backdrop-blur-sm hover:-translate-y-0.5 hover:shadow-lg hover:shadow-red-500/20 dark:hover:shadow-red-400/20 border border-transparent hover:border-red-500/50 dark:hover:border-red-400/50"
                      title="Delete space"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {spaces.length === 0 && (
        <EmptyState
          icon={Database}
          title="No spaces found"
          description="Create your first space to get started"
        />
      )}
    </PageLayout>
  );
}