import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Loro } from "loro-crdt";
import userServiceSchema from "../../../../examples/user-service.schema.json";
import federalProcurementGraphql from "../../../../examples/federal-procurement.graphql?raw";

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
  loroDoc: Loro | null;

  // Editor content
  jsonSchema: string;
  graphqlSdl: string;

  // Collaboration
  currentUser: User;
  connectedUsers: User[];
  connectionStatus: ConnectionStatus;

  // Sync state
  isSyncing: boolean;
  isAutoSyncEnabled: boolean;
  lastSyncTimestamp: number | null;

  // UI State
  activeEditor: "json" | "graphql";
  isConverting: boolean;
  showSettings: boolean;
  showHistory: boolean;

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
    outputSize: number;
    typesConverted?: number;
    fieldsConverted?: number;
  } | null;

  errors: string[];

  // Actions
  initializeLoro: (docId: string, serverUrl: string, username: string) => void;
  disconnectLoro: () => void;
  setJsonSchema: (schema: string) => void;
  setGraphqlSdl: (sdl: string) => void;
  setActiveEditor: (editor: "json" | "graphql") => void;
  setConverting: (isConverting: boolean) => void;
  toggleAutoSync: () => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  addConnectedUser: (user: User) => void;
  removeConnectedUser: (userId: string) => void;
  updateUserCursor: (userId: string, line: number, column: number) => void;
  setOptions: (options: Partial<EditorState["options"]>) => void;
  setLastConversion: (conversion: EditorState["lastConversion"]) => void;
  addError: (error: string) => void;
  clearErrors: () => void;
  toggleSettings: () => void;
  toggleHistory: () => void;

  // Time travel
  checkout: (frontiers: string) => void;
  getHistory: () => any[] | any;

  // Sync
  exportSnapshot: () => Uint8Array | null;
  importSnapshot: (snapshot: Uint8Array) => void;
  exportUpdates: () => Uint8Array | null;
  importUpdates: (updates: Uint8Array) => void;
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
      loroDoc: null,
      jsonSchema: JSON.stringify(userServiceSchema, null, 2),
      graphqlSdl: federalProcurementGraphql,
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
      isSyncing: false,
      lastSyncTimestamp: null,
      isAutoSyncEnabled: false,
      activeEditor: "json",
      isConverting: false,
      showSettings: false,
      showHistory: false,
      options: {
        validate: true,
        includeDescriptions: true,
        preserveFieldOrder: true,
        federationVersion: null,
        prettyPrint: true,
      },
      lastConversion: null,
      errors: [],

      // Initialize Loro collaboration
      initializeLoro: (
        _docId: string,
        _serverUrl: string,
        username: string,
      ) => {
        const { loroDoc } = get();

        // Clean up existing document
        if (loroDoc) {
          // Loro doesn't need explicit cleanup
        }

        // Create new Loro document
        const newDoc = new Loro();
        newDoc.setPeerId(BigInt(Date.now()));

        // Get or create text containers
        const jsonText = newDoc.getText("jsonSchema");
        const graphqlText = newDoc.getText("graphqlSdl");

        // Set initial content if empty
        const currentJsonSchema = get().jsonSchema;
        const currentGraphqlSdl = get().graphqlSdl;

        if (jsonText.toString().length === 0 && currentJsonSchema) {
          jsonText.insert(0, currentJsonSchema);
        }
        if (graphqlText.toString().length === 0 && currentGraphqlSdl) {
          graphqlText.insert(0, currentGraphqlSdl);
        }

        // Subscribe to changes
        newDoc.subscribe(() => {
          const updatedJsonSchema = newDoc.getText("jsonSchema").toString();
          const updatedGraphqlSdl = newDoc.getText("graphqlSdl").toString();

          set({
            jsonSchema: updatedJsonSchema,
            graphqlSdl: updatedGraphqlSdl,
          });
        });

        // Update current user
        const currentUser = get().currentUser;
        set({
          loroDoc: newDoc,
          currentUser: {
            ...currentUser,
            name: username || currentUser.name,
          },
          connectionStatus: {
            status: "connected",
            peers: 0,
          },
        });
      },

      // Disconnect Loro
      disconnectLoro: () => {
        const { loroDoc } = get();

        if (loroDoc) {
          // Loro handles cleanup automatically
        }

        set({
          loroDoc: null,
          connectedUsers: [],
          connectionStatus: {
            status: "disconnected",
            peers: 0,
          },
        });
      },

      // Update JSON Schema
      setJsonSchema: (schema: string) => {
        const { loroDoc } = get();
        if (loroDoc) {
          const jsonText = loroDoc.getText("jsonSchema");
          const currentText = jsonText.toString();

          // Replace content
          if (currentText !== schema) {
            jsonText.delete(0, currentText.length);
            jsonText.insert(0, schema);
          }
        } else {
          // Fallback for non-collaborative mode
          set({ jsonSchema: schema });
        }
      },

      // Update GraphQL SDL
      setGraphqlSdl: (sdl: string) => {
        const { loroDoc } = get();
        if (loroDoc) {
          const graphqlText = loroDoc.getText("graphqlSdl");
          const currentText = graphqlText.toString();

          // Replace content
          if (currentText !== sdl) {
            graphqlText.delete(0, currentText.length);
            graphqlText.insert(0, sdl);
          }
        } else {
          // Fallback for non-collaborative mode
          set({ graphqlSdl: sdl });
        }
      },

      setActiveEditor: (editor) => set({ activeEditor: editor }),

      setConverting: (isConverting) => set({ isConverting }),

      toggleAutoSync: () =>
        set((state) => ({ isAutoSyncEnabled: !state.isAutoSyncEnabled })),

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

      toggleHistory: () =>
        set((state) => ({
          showHistory: !state.showHistory,
        })),

      // Time travel - checkout a specific version
      checkout: (frontiers: string) => {
        const { loroDoc } = get();
        if (loroDoc) {
          try {
            loroDoc.checkout(JSON.parse(frontiers));
            const jsonSchema = loroDoc.getText("jsonSchema").toString();
            const graphqlSdl = loroDoc.getText("graphqlSdl").toString();
            set({ jsonSchema, graphqlSdl });
          } catch (error) {
            console.error("Failed to checkout version:", error);
            get().addError("Failed to checkout version");
          }
        }
      },

      // Get version history
      getHistory: () => {
        const { loroDoc } = get();
        if (loroDoc) {
          try {
            // Loro provides oplog for history
            return loroDoc.oplogVersion();
          } catch (error) {
            console.error("Failed to get history:", error);
            return [];
          }
        }
        return [];
      },

      // Export full snapshot
      exportSnapshot: () => {
        const { loroDoc } = get();
        if (loroDoc) {
          return loroDoc.exportSnapshot();
        }
        return null;
      },

      // Import snapshot
      importSnapshot: (snapshot: Uint8Array) => {
        const { loroDoc } = get();
        if (loroDoc) {
          try {
            loroDoc.import(snapshot);
            const jsonSchema = loroDoc.getText("jsonSchema").toString();
            const graphqlSdl = loroDoc.getText("graphqlSdl").toString();
            set({ jsonSchema, graphqlSdl });
          } catch (error) {
            console.error("Failed to import snapshot:", error);
            get().addError("Failed to import snapshot");
          }
        }
      },

      // Export updates since last sync
      exportUpdates: () => {
        const { loroDoc } = get();
        if (loroDoc) {
          return loroDoc.exportFrom(undefined);
        }
        return null;
      },

      // Import updates from remote
      importUpdates: (updates: Uint8Array) => {
        const { loroDoc } = get();
        if (loroDoc) {
          try {
            loroDoc.import(updates);
            const jsonSchema = loroDoc.getText("jsonSchema").toString();
            const graphqlSdl = loroDoc.getText("graphqlSdl").toString();
            set({
              jsonSchema,
              graphqlSdl,
              lastSyncTimestamp: Date.now(),
            });
          } catch (error) {
            console.error("Failed to import updates:", error);
            get().addError("Failed to import updates");
          }
        }
      },
    }),
    {
      name: "json-schema-loro-editor-storage",
      partialize: (state) => ({
        options: state.options,
        currentUser: state.currentUser,
      }),
    },
  ),
);
