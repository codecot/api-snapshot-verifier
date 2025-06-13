import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, Edit, Globe, FileText, Settings, CheckCircle, XCircle, Activity, Clock, AlertCircle, Database, MoreVertical, CheckSquare, X } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import apiClient from '../api/client';
import toast from 'react-hot-toast';

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

export function SpaceManagement() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedSpaces, setSelectedSpaces] = useState<Set<number>>(new Set());
  const [editingSpace, setEditingSpace] = useState<number | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editDisplayName, setEditDisplayName] = useState('');
  const [selectionMode, setSelectionMode] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  // Fetch spaces with React Query
  const { data: spacesData, isLoading, refetch } = useQuery({
    queryKey: ['spaces-management'],
    queryFn: async () => {
      const response = await apiClient.get('/spaces');
      return response.data.spaces as Space[];
    },
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0, // Always consider data stale to ensure fresh stats
  });

  const spaces = spacesData || [];

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
    mutationFn: async (spaceIds: number[]) => {
      const response = await apiClient.post('/spaces/delete-batch', { spaceIds });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Successfully deleted ${data.deleted.length} spaces`);
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

    deleteBatchMutation.mutate(Array.from(selectedSpaces));
  };

  // Delete single space mutation
  const deleteSingleMutation = useMutation({
    mutationFn: async (space: Space) => {
      await apiClient.delete(`/spaces/${space.id}`);
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
    if (!confirm(`Are you sure you want to delete the space "${space.name}"?\n\nThis will also delete:\n- ${space.stats.endpoints} endpoints\n- ${space.stats.parameters} parameters\n- ${space.stats.snapshots} snapshots`)) {
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
      await apiClient.patch(`/spaces/${space.id}`, data);
      return space;
    },
    onSuccess: (space) => {
      toast.success(`Space "${space.name}" updated successfully`);
      setEditingSpace(null);
      queryClient.invalidateQueries({ queryKey: ['spaces-management'] });
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
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading spaces...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Space Management</h1>
            <p className="text-gray-600">Manage your API snapshot spaces and their configurations</p>
          </div>
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
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                  <button
                    onClick={toggleSelectionMode}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
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
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedSpaces.size === spaces.length && spaces.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-blue-800 cursor-pointer hover:text-blue-900">
                  {selectedSpaces.size === spaces.length ? 'Deselect All' : 'Select All'}
                  {selectedSpaces.size > 0 && ` (${selectedSpaces.size}/${spaces.length})`}
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
                  className="gap-2 border-red-300 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Selected ({selectedSpaces.size})
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={exitSelectionMode}
                className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                <X className="h-4 w-4" />
                Exit
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4 text-sm text-gray-600 text-right">
        Total: {spaces.length} spaces
      </div>

      <div className="grid gap-4">
        {spaces.map(space => (
          <div
            key={space.id}
            className={`border rounded-lg p-4 ${selectedSpaces.has(space.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                {/* Only show checkbox in selection mode */}
                {selectionMode && (
                  <input
                    type="checkbox"
                    checked={selectedSpaces.has(space.id)}
                    onChange={() => handleSelectSpace(space.id)}
                    className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold">{space.name}</h3>
                    {space.display_name && space.display_name !== space.name && (
                      <span className="text-gray-500">({space.display_name})</span>
                    )}
                    {space.environment && (
                      <Badge variant={getEnvironmentBadgeVariant(space.environment)}>
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
                        className="w-full px-3 py-1 border rounded"
                      />
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Description"
                        className="w-full px-3 py-1 border rounded"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(space)}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    space.description && (
                      <p className="text-gray-600 mb-3">{space.description}</p>
                    )
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-3">
                    <button
                      onClick={() => navigate(`/endpoints?space=${space.name}`)}
                      className="flex items-center gap-2 hover:bg-gray-50 p-2 rounded transition-colors text-left"
                      title="View endpoints"
                    >
                      <FileText className="w-4 h-4 text-gray-500" />
                      <div>
                        <div className="text-sm font-medium">{space.stats.endpoints}</div>
                        <div className="text-xs text-gray-500">Endpoints</div>
                      </div>
                    </button>
                    <button
                      onClick={() => navigate(`/parameters?space=${space.name}`)}
                      className="flex items-center gap-2 hover:bg-gray-50 p-2 rounded transition-colors text-left"
                      title="View parameters"
                    >
                      <Settings className="w-4 h-4 text-gray-500" />
                      <div>
                        <div className="text-sm font-medium">{space.stats.parameters}</div>
                        <div className="text-xs text-gray-500">Parameters</div>
                      </div>
                    </button>
                    <button
                      onClick={() => navigate(`/snapshots?space=${space.name}`)}
                      className="flex items-center gap-2 hover:bg-gray-50 p-2 rounded transition-colors text-left"
                      title="View snapshots"
                    >
                      <Database className="w-4 h-4 text-gray-500" />
                      <div>
                        <div className="text-sm font-medium">{space.stats.snapshots}</div>
                        <div className="text-xs text-gray-500">Snapshots</div>
                      </div>
                    </button>
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-gray-500" />
                      <div>
                        <div className="text-sm font-medium">{space.stats.recentSnapshots}</div>
                        <div className="text-xs text-gray-500">Last 24h</div>
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
                        <div className="text-sm font-medium">{space.stats.successRate}%</div>
                        <div className="text-xs text-gray-500">Success Rate</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-500">
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
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                      title="Edit space"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => navigate(`/endpoints?space=${space.name}`)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      title="View endpoints"
                    >
                      <Globe className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSingle(space)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                      title="Delete space"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {spaces.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No spaces found</p>
        </div>
      )}
    </div>
  );
}