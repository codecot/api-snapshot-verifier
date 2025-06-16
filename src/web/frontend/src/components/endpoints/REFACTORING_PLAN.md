# Endpoints Page Refactoring Plan

## Overview
The Endpoints.tsx file contains 2400+ lines of code handling:
- Endpoint CRUD operations
- Bulk selection and operations
- Real-time updates via WebSocket
- Snapshot capturing
- Import/Export functionality
- Complex form handling with parameters

## Proposed Structure

```
src/
├── components/
│   ├── endpoints/
│   │   ├── EndpointCard.tsx          # Individual endpoint display
│   │   ├── EndpointForm.tsx          # Create/Edit endpoint form
│   │   ├── EndpointList.tsx          # List container component
│   │   ├── EndpointStats.tsx         # Stats display component
│   │   └── index.ts                  # Barrel exports
│   ├── shared/
│   │   ├── BulkActions.tsx           # Reusable bulk actions toolbar
│   │   ├── DeleteConfirmDialog.tsx   # Reusable delete confirmation
│   │   ├── EmptyState.tsx            # Reusable empty state component
│   │   ├── SelectionMode.tsx         # Selection mode wrapper
│   │   └── ActionMenu.tsx            # Dropdown action menu
│   └── ui/                           # (existing shadcn components)
├── hooks/
│   ├── endpoints/
│   │   ├── useEndpointStats.ts       # Endpoint statistics calculations
│   │   ├── useEndpointOperations.ts  # CRUD operations for endpoints
│   │   ├── useEndpointSelection.ts   # Selection state management
│   │   └── useEndpointWebSocket.ts   # WebSocket event handling
│   ├── shared/
│   │   ├── useBulkOperations.ts      # Generic bulk operations hook
│   │   ├── useAutoRefresh.ts         # Auto-refresh timer logic
│   │   └── useHighlight.ts           # URL parameter highlighting
│   └── index.ts                      # Barrel exports
├── constants/
│   ├── endpoints.ts                  # Endpoint-specific constants
│   ├── httpMethods.ts                # HTTP method colors and config
│   └── headers.ts                    # Common HTTP headers
├── types/
│   └── endpoints.ts                  # Endpoint-specific types
├── utils/
│   ├── endpoints/
│   │   ├── validation.ts             # Endpoint validation logic
│   │   ├── formatting.ts             # Endpoint formatting utilities
│   │   └── parameterHandling.ts      # Parameter-specific utilities
│   └── shared/
│       └── bulkOperations.ts         # Shared bulk operation utilities
└── pages/
    └── Endpoints.tsx                 # Simplified main component

```

## Refactoring Steps

### Phase 1: Extract Constants and Types
1. Create `constants/httpMethods.ts` for method colors
2. Create `constants/headers.ts` for common HTTP headers
3. Create `types/endpoints.ts` for endpoint-specific types

### Phase 2: Extract Custom Hooks
1. `useEndpointStats` - Extract stats calculation logic
2. `useEndpointOperations` - Extract CRUD operations
3. `useEndpointSelection` - Extract selection state
4. `useEndpointWebSocket` - Extract WebSocket handlers
5. `useAutoRefresh` - Extract auto-refresh logic
6. `useHighlight` - Extract URL highlight logic

### Phase 3: Extract Components
1. `EndpointCard` - Individual endpoint display
2. `EndpointForm` - The large form component (1000+ lines)
3. `EndpointStats` - Stats badges component
4. `DeleteConfirmDialog` - Confirmation dialog
5. `BulkActions` - Bulk actions toolbar
6. `EmptyState` - Empty state display

### Phase 4: Create Shared Components
1. `SelectionMode` - Reusable selection wrapper
2. `ActionMenu` - Reusable dropdown menu
3. `BulkActions` - Generic bulk actions component

### Phase 5: Simplify Main Component
1. Integrate all extracted components
2. Remove redundant logic
3. Improve component composition

## Benefits

1. **Maintainability**: Smaller, focused components are easier to understand and modify
2. **Reusability**: Shared components can be used across other pages
3. **Testability**: Isolated components and hooks are easier to test
4. **Performance**: Better code splitting and lazy loading opportunities
5. **Type Safety**: More focused type definitions
6. **Developer Experience**: Clear separation of concerns

## Implementation Priority

1. **High Priority**: 
   - Extract EndpointForm (reduces file size by ~40%)
   - Extract custom hooks (improves testability)
   - Extract EndpointCard (frequently modified component)

2. **Medium Priority**:
   - Extract shared components (BulkActions, DeleteDialog)
   - Create constants files

3. **Low Priority**:
   - Further optimization and refinement
   - Documentation and examples