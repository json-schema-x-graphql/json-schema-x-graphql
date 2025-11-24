export declare class LRUCache<K, V> {
    private maxSize;
    private cache;
    private head;
    private tail;
    private hits;
    private misses;
    constructor(maxSize: number);
    get(key: K): V | undefined;
    set(key: K, value: V): void;
    has(key: K): boolean;
    delete(key: K): boolean;
    clear(): void;
    get size(): number;
    getStats(): {
        size: number;
        maxSize: number;
        hits: number;
        misses: number;
    };
    keys(): K[];
    values(): V[];
    private moveToHead;
    private addToHead;
    private removeNode;
    private evictTail;
}
//# sourceMappingURL=cache.d.ts.map