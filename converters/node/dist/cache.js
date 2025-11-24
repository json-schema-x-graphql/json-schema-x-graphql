export class LRUCache {
    maxSize;
    cache;
    head;
    tail;
    hits;
    misses;
    constructor(maxSize) {
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
    get(key) {
        const node = this.cache.get(key);
        if (!node) {
            this.misses++;
            return undefined;
        }
        this.hits++;
        this.moveToHead(node);
        return node.value;
    }
    set(key, value) {
        const existingNode = this.cache.get(key);
        if (existingNode) {
            existingNode.value = value;
            this.moveToHead(existingNode);
            return;
        }
        const newNode = {
            key,
            value,
            prev: null,
            next: null,
        };
        this.cache.set(key, newNode);
        this.addToHead(newNode);
        if (this.cache.size > this.maxSize) {
            this.evictTail();
        }
    }
    has(key) {
        return this.cache.has(key);
    }
    delete(key) {
        const node = this.cache.get(key);
        if (!node) {
            return false;
        }
        this.removeNode(node);
        this.cache.delete(key);
        return true;
    }
    clear() {
        this.cache.clear();
        this.head = null;
        this.tail = null;
        this.hits = 0;
        this.misses = 0;
    }
    get size() {
        return this.cache.size;
    }
    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            hits: this.hits,
            misses: this.misses,
        };
    }
    keys() {
        const keys = [];
        let current = this.head;
        while (current) {
            keys.push(current.key);
            current = current.next;
        }
        return keys;
    }
    values() {
        const values = [];
        let current = this.head;
        while (current) {
            values.push(current.value);
            current = current.next;
        }
        return values;
    }
    moveToHead(node) {
        if (node === this.head) {
            return;
        }
        this.removeNode(node);
        this.addToHead(node);
    }
    addToHead(node) {
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
    removeNode(node) {
        if (node.prev) {
            node.prev.next = node.next;
        }
        else {
            this.head = node.next;
        }
        if (node.next) {
            node.next.prev = node.prev;
        }
        else {
            this.tail = node.prev;
        }
    }
    evictTail() {
        if (!this.tail) {
            return;
        }
        const tailKey = this.tail.key;
        this.removeNode(this.tail);
        this.cache.delete(tailKey);
    }
}
//# sourceMappingURL=cache.js.map