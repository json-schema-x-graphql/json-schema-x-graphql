/**
 * LRU (Least Recently Used) Cache implementation
 */

interface CacheNode<K, V> {
  key: K;
  value: V;
  prev: CacheNode<K, V> | null;
  next: CacheNode<K, V> | null;
}

/**
 * LRU Cache with O(1) get and set operations
 */
export class LRUCache<K, V> {
  private maxSize: number;
  private cache: Map<K, CacheNode<K, V>>;
  private head: CacheNode<K, V> | null;
  private tail: CacheNode<K, V> | null;
  private hits: number;
  private misses: number;

  constructor(maxSize: number) {
    if (maxSize <= 0) {
      throw new Error('Cache size must be greater than 0');
    }
    this.maxSize = maxSize;
    this.cache = new Map();
    this.head = null;
    this.tail = null;
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get a value from the cache
   * @param key - Cache key
   * @returns Cached value or undefined
   */
  public get(key: K): V | undefined {
    const node = this.cache.get(key);

    if (!node) {
      this.misses++;
      return undefined;
    }

    this.hits++;
    this.moveToHead(node);
    return node.value;
  }

  /**
   * Set a value in the cache
   * @param key - Cache key
   * @param value - Value to cache
   */
  public set(key: K, value: V): void {
    const existingNode = this.cache.get(key);

    if (existingNode) {
      // Update existing node
      existingNode.value = value;
      this.moveToHead(existingNode);
      return;
    }

    // Create new node
    const newNode: CacheNode<K, V> = {
      key,
      value,
      prev: null,
      next: null,
    };

    this.cache.set(key, newNode);
    this.addToHead(newNode);

    // Evict least recently used if over capacity
    if (this.cache.size > this.maxSize) {
      this.evictTail();
    }
  }

  /**
   * Check if key exists in cache
   * @param key - Cache key
   * @returns True if key exists
   */
  public has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * Delete a key from cache
   * @param key - Cache key
   * @returns True if key was deleted
   */
  public delete(key: K): boolean {
    const node = this.cache.get(key);

    if (!node) {
      return false;
    }

    this.removeNode(node);
    this.cache.delete(key);
    return true;
  }

  /**
   * Clear all entries from cache
   */
  public clear(): void {
    this.cache.clear();
    this.head = null;
    this.tail = null;
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get current cache size
   */
  public get size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   */
  public getStats(): { size: number; maxSize: number; hits: number; misses: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
    };
  }

  /**
   * Get all keys in the cache (most recently used first)
   */
  public keys(): K[] {
    const keys: K[] = [];
    let current = this.head;

    while (current) {
      keys.push(current.key);
      current = current.next;
    }

    return keys;
  }

  /**
   * Get all values in the cache (most recently used first)
   */
  public values(): V[] {
    const values: V[] = [];
    let current = this.head;

    while (current) {
      values.push(current.value);
      current = current.next;
    }

    return values;
  }

  /**
   * Move a node to the head (most recently used position)
   */
  private moveToHead(node: CacheNode<K, V>): void {
    if (node === this.head) {
      return;
    }

    this.removeNode(node);
    this.addToHead(node);
  }

  /**
   * Add a node to the head
   */
  private addToHead(node: CacheNode<K, V>): void {
    node.prev = null;
    node.next = this.head;

    if (this.head) {
      this.head.prev = node;
    }

    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }
  }

  /**
   * Remove a node from the list
   */
  private removeNode(node: CacheNode<K, V>): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }

  /**
   * Evict the tail (least recently used) node
   */
  private evictTail(): void {
    if (!this.tail) {
      return;
    }

    const tailKey = this.tail.key;
    this.removeNode(this.tail);
    this.cache.delete(tailKey);
  }
}
