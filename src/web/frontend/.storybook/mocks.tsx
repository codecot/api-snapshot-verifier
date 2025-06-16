import React from 'react';

// Mock WebSocket context
export const WebSocketContext = React.createContext({
  isConnected: false,
  socket: null,
});

export const MockWebSocketProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <WebSocketContext.Provider value={{ isConnected: false, socket: null }}>
      {children}
    </WebSocketContext.Provider>
  );
};

// Mock Space context  
export const SpaceContext = React.createContext({
  currentSpace: 'default',
  availableSpaces: ['default'],
  spacesInfo: [],
  isLoading: false,
  error: null,
  switchSpace: () => {},
  createSpace: async () => {},
  deleteSpace: async () => {},
  refreshSpaces: async () => {},
});

export const MockSpaceProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <SpaceContext.Provider
      value={{
        currentSpace: 'default',
        availableSpaces: ['default'],
        spacesInfo: [],
        isLoading: false,
        error: null,
        switchSpace: () => {},
        createSpace: async () => {},
        deleteSpace: async () => {},
        refreshSpaces: async () => {},
      }}
    >
      {children}
    </SpaceContext.Provider>
  );
};