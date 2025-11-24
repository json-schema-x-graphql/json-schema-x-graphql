import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

export interface User {
  id: string;
  name: string;
  color: string;
  cursor?: {
    line: number;
    column: number;
  };
}

export interface ConnectionStatus {
  status: "connected" | "connecting" | "disconnected";
  peers: number;
  latency?: number;
}

export interface EditorState {
  // Document state
  ydoc: Y.Doc | null;
  provider: WebsocketProvider | null;

  // Editor content
  jsonSchema: string;
  graphqlSdl: string;

  // Collaboration
  currentUser: User;
  connectedUsers: User[];
  connectionStatus: ConnectionStatus;

  // UI State
  activeEditor: "json" | "graphql";
  isConverting: boolean;
  showSettings: boolean;

  // Converter options
  options: {
    validate: boolean;
    includeDescriptions: boolean;
    preserveFieldOrder: boolean;
    federationVersion: "1" | "2" | null;
    prettyPrint: boolean;
  };

  // Conversion results
  lastConversion: {
    timestamp: number;
    direction: "json-to-graphql" | "graphql-to-json";
    duration: number;
    typesConverted?: number;
    fieldsConverted?: number;
  } | null;

  errors: string[];

  // Actions
  initializeYjs: (roomName: string, username: string) => void;
  disconnectYjs: () => void;
  setJsonSchema: (schema: string) => void;
  setGraphqlSdl: (sdl: string) => void;
  setActiveEditor: (editor: "json" | "graphql") => void;
  setConverting: (isConverting: boolean) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  addConnectedUser: (user: User) => void;
  removeConnectedUser: (userId: string) => void;
  updateUserCursor: (userId: string, line: number, column: number) => void;
  setOptions: (options: Partial<EditorState["options"]>) => void;
  setLastConversion: (conversion: EditorState["lastConversion"]) => void;
  addError: (error: string) => void;
  clearErrors: () => void;
  toggleSettings: () => void;
}

// Generate a random color for user avatars
const generateUserColor = (): string => {
  const colors = [
    "#EF4444", // red
    "#3B82F6", // blue
    "#10B981", // green
    "#F59E0B", // yellow
    "#8B5CF6", // purple
    "#EC4899", // pink
    "#6366F1", // indigo
    "#F97316", // orange
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

// Generate a random user ID
const generateUserId = (): string => {
  return `user-${Math.random().toString(36).substring(2, 11)}`;
};

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      // Initial state
      ydoc: null,
      provider: null,
      jsonSchema: `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "User",
  "description": "A user in the system with federation support",
  "type": "object",
  "x-graphql-type-name": "User",
  "x-graphql-type-kind": "OBJECT",
  "x-graphql-federation-keys": [
    {
      "fields": "id",
      "resolvable": true
    }
  ],
  "properties": {
    "id": {
      "type": "string",
      "description": "Unique identifier for the user",
      "x-graphql-field-name": "id",
      "x-graphql-field-type": "ID",
      "x-graphql-field-non-null": true
    },
    "username": {
      "type": "string",
      "minLength": 3,
      "maxLength": 50,
      "description": "User's unique username",
      "x-graphql-field-name": "username",
      "x-graphql-field-type": "String",
      "x-graphql-field-non-null": true
    },
    "email": {
      "type": "string",
      "format": "email",
      "description": "User's email address",
      "x-graphql-field-name": "email",
      "x-graphql-field-type": "String",
      "x-graphql-field-non-null": true
    },
    "role": {
      "type": "string",
      "enum": ["ADMIN", "USER", "GUEST"],
      "description": "User's role in the system",
      "x-graphql-field-name": "role",
      "x-graphql-field-type": "UserRole",
      "x-graphql-field-non-null": true
    }
  },
  "required": ["id", "username", "email", "role"],
  "$defs": {
    "user_role": {
      "type": "string",
      "enum": ["ADMIN", "USER", "GUEST"],
      "description": "Available user roles",
      "x-graphql-type-name": "UserRole",
      "x-graphql-type-kind": "ENUM"
    }
  }
}`,
      graphqlSdl: `# User with federation support
type User @key(fields: "id") {
  "Unique identifier for the user"
  id: ID!

  "User's unique username"
  username: String!

  "User's email address"
  email: String!

  "User's role in the system"
  role: UserRole!
}

"Available user roles"
enum UserRole {
  ADMIN
  USER
  GUEST
}

type Query {
  user(id: ID!): User
}`,
      currentUser: {
        id: generateUserId(),
        name: "Anonymous",
        color: generateUserColor(),
      },
      connectedUsers: [],
      connectionStatus: {
        status: "disconnected",
        peers: 0,
      },
      activeEditor: "json",
      isConverting: false,
      showSettings: false,
      options: {
        validate: true,
        includeDescriptions: true,
        preserveFieldOrder: true,
        federationVersion: null,
        prettyPrint: true,
      },
      lastConversion: null,
      errors: [],

      // Initialize Yjs collaboration
      initializeYjs: (roomName: string, username: string) => {
        const { ydoc, provider } = get();

        // Clean up existing connections
        if (provider) {
          provider.destroy();
        }
        if (ydoc) {
          ydoc.destroy();
        }

        // Create new Yjs document
        const newDoc = new Y.Doc();

        // Create WebSocket provider
        // In production, replace with your WebSocket server URL
        const wsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:1234";
        const newProvider = new WebsocketProvider(wsUrl, roomName, newDoc, {
          connect: true,
        });

        // Get or create shared text types
        const jsonText = newDoc.getText("jsonSchema");
        const graphqlText = newDoc.getText("graphqlSdl");

        // Set initial content if empty
        if (jsonText.length === 0) {
          jsonText.insert(0, get().jsonSchema);
        }
        if (graphqlText.length === 0) {
          graphqlText.insert(0, get().graphqlSdl);
        }

        // Listen for changes
        jsonText.observe(() => {
          set({ jsonSchema: jsonText.toString() });
        });

        graphqlText.observe(() => {
          set({ graphqlSdl: graphqlText.toString() });
        });

        // Setup awareness for collaborative cursors
        const awareness = newProvider.awareness;
        const currentUser = get().currentUser;

        awareness.setLocalStateField("user", {
          id: currentUser.id,
          name: username || currentUser.name,
          color: currentUser.color,
        });

        // Listen for awareness changes (other users)
        awareness.on("change", () => {
          const states = Array.from(awareness.getStates().entries());
          const users = states
            .filter(([clientId]) => clientId !== awareness.clientID)
            .map(([, state]) => state.user as User)
            .filter(Boolean);

          set({ connectedUsers: users });
        });

        // Connection status monitoring
        newProvider.on("status", (event: { status: string }) => {
          const peers = awareness.getStates().size - 1; // Exclude self

          set({
            connectionStatus: {
              status: event.status as
                | "connected"
                | "connecting"
                | "disconnected",
              peers,
            },
          });
        });

        set({
          ydoc: newDoc,
          provider: newProvider,
          currentUser: {
            ...currentUser,
            name: username || currentUser.name,
          },
        });
      },

      // Disconnect Yjs
      disconnectYjs: () => {
        const { provider, ydoc } = get();

        if (provider) {
          provider.destroy();
        }
        if (ydoc) {
          ydoc.destroy();
        }

        set({
          ydoc: null,
          provider: null,
          connectedUsers: [],
          connectionStatus: {
            status: "disconnected",
            peers: 0,
          },
        });
      },

      // Update JSON Schema
      setJsonSchema: (schema: string) => {
        const { ydoc } = get();
        if (ydoc) {
          const jsonText = ydoc.getText("jsonSchema");
          // Replace content if using Yjs
          ydoc.transact(() => {
            jsonText.delete(0, jsonText.length);
            jsonText.insert(0, schema);
          });
        } else {
          // Fallback for non-collaborative mode
          set({ jsonSchema: schema });
        }
      },

      // Update GraphQL SDL
      setGraphqlSdl: (sdl: string) => {
        const { ydoc } = get();
        if (ydoc) {
          const graphqlText = ydoc.getText("graphqlSdl");
          // Replace content if using Yjs
          ydoc.transact(() => {
            graphqlText.delete(0, graphqlText.length);
            graphqlText.insert(0, sdl);
          });
        } else {
          // Fallback for non-collaborative mode
          set({ graphqlSdl: sdl });
        }
      },

      setActiveEditor: (editor) => set({ activeEditor: editor }),

      setConverting: (isConverting) => set({ isConverting }),

      setConnectionStatus: (status) => set({ connectionStatus: status }),

      addConnectedUser: (user) =>
        set((state) => ({
          connectedUsers: [...state.connectedUsers, user],
        })),

      removeConnectedUser: (userId) =>
        set((state) => ({
          connectedUsers: state.connectedUsers.filter((u) => u.id !== userId),
        })),

      updateUserCursor: (userId, line, column) =>
        set((state) => ({
          connectedUsers: state.connectedUsers.map((u) =>
            u.id === userId ? { ...u, cursor: { line, column } } : u,
          ),
        })),

      setOptions: (options) =>
        set((state) => ({
          options: { ...state.options, ...options },
        })),

      setLastConversion: (conversion) => set({ lastConversion: conversion }),

      addError: (error) =>
        set((state) => ({
          errors: [...state.errors, error],
        })),

      clearErrors: () => set({ errors: [] }),

      toggleSettings: () =>
        set((state) => ({
          showSettings: !state.showSettings,
        })),
    }),
    {
      name: "json-schema-editor-storage",
      partialize: (state) => ({
        options: state.options,
        currentUser: state.currentUser,
      }),
    },
  ),
);
