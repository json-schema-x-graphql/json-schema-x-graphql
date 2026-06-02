export const MOCK_JSON_SCHEMA = JSON.stringify(
  {
    $schema: "http://json-schema.org/draft-07/schema#",
    type: "object",
    properties: {
      id: { type: "string" },
      username: { type: "string" },
    },
  },
  null,
  2,
);

export const MOCK_GRAPHQL_SDL = `type User {
  id: String
  username: String
}`;

// Mock Loro Text container
export class MockLoroText {
  private content: string;

  constructor(initialContent: string = "") {
    this.content = initialContent;
  }

  toString(): string {
    return this.content;
  }

  get length(): number {
    return this.content.length;
  }

  insert(index: number, text: string): void {
    this.content = this.content.slice(0, index) + text + this.content.slice(index);
  }

  delete(index: number, length: number): void {
    this.content = this.content.slice(0, index) + this.content.slice(index + length);
  }
}

// Mock Loro Document
export class MockLoro {
  private texts: Map<string, MockLoroText>;
  private subscribers: Array<() => void>;
  peerId: bigint | null = null;

  constructor() {
    this.texts = new Map();
    this.subscribers = [];
  }

  setPeerId(id: bigint): void {
    this.peerId = id;
  }

  getText(name: string): MockLoroText {
    if (!this.texts.has(name)) {
      this.texts.set(name, new MockLoroText());
    }
    return this.texts.get(name)!;
  }

  subscribe(callback: () => void): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
    };
  }

  commit(): void {
    this.subscribers.forEach((cb) => cb());
  }

  checkout(_frontiers: any): void {
    // Mock implementation
  }

  oplogVersion(): any[] {
    return [];
  }

  exportSnapshot(): Uint8Array {
    return new Uint8Array();
  }

  import(_data: Uint8Array): void {
    // Mock implementation
  }

  exportFrom(_version: any): Uint8Array {
    return new Uint8Array();
  }
}
