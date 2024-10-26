# ASC (Asynchronous Self-Updating Cache)

ASC is a tiered caching middleware that sits between your application and cacheable services. It allows you to define multiple caching layers that ASC will automatically manage and update as needed. The name "ASC" stands for Asynchronous Self-Updating Cache.

## Features

- **Tiered Caching**: Define multiple cache layers (memory, Redis, Memcached, DynamoDB, etc.)
- **Automatic Cache Population**: When a lower layer has data, ASC automatically populates higher layers
- **Flexible Configuration**: Built-in memory cache is optional and fully configurable
- **Request Deduplication**: Parallel requests for the same key are handled efficiently
- **Type-Safe**: Full TypeScript support with generic types for keys and values

## Installation

```bash
npm install asc
```

## Basic Usage

### TypeScript Example

```typescript
import ASC from 'asc';

// Create a cache instance for string keys and number values
const cache = new ASC<string, number>({
    memory: {
        ttl: 60000, // 60 seconds
        disabled: false
    },
    get: async (key: string) => {
        // Fetch data from your source (database, API, etc.)
        const value = await someExpensiveOperation(key);
        return value;
    }
});

// Using the cache
async function example() {
    try {
        const value = await cache.get('myKey');
        console.log('Retrieved value:', value);
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}
```

### JavaScript Example

```javascript
const ASC = require('asc');

// Create a cache instance
const cache = new ASC({
    memory: {
        ttl: 60000, // 60 seconds
        disabled: false
    },
    get: async (key) => {
        // Fetch data from your source (database, API, etc.)
        const value = await someExpensiveOperation(key);
        return value;
    }
});

// Using the cache
async function example() {
    try {
        const value = await cache.get('myKey');
        console.log('Retrieved value:', value);
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}
```

## Advanced Usage: Multi-Layer Caching

### TypeScript Example with Redis and Database Layers

```typescript
import ASC from 'asc';
import Redis from 'ioredis';
import { Database } from './your-database';

interface UserData {
    id: string;
    name: string;
    email: string;
}

const redis = new Redis();
const db = new Database();

const userCache = new ASC<string, UserData>({
    memory: {
        ttl: 30000, // 30 seconds
        disabled: false
    },
    layers: [
        // Redis Layer
        {
            get: async (key) => {
                const data = await redis.get(key);
                if (data) {
                    return JSON.parse(data);
                }
                return undefined;
            },
            set: async (key, data) => {
                await redis.set(key, JSON.stringify(data), 'EX', 300); // 5 minutes
            },
            clear: async (key) => {
                await redis.del(key);
            }
        },
        // Database Layer
        {
            get: async (key) => {
                return await db.users.findOne({ id: key });
            }
        }
    ]
});

// Usage
async function getUser(userId: string): Promise<UserData> {
    return await userCache.get(userId);
}
```

### JavaScript Example with Redis and Database Layers

```javascript
const ASC = require('asc');
const Redis = require('ioredis');
const { Database } = require('./your-database');

const redis = new Redis();
const db = new Database();

const userCache = new ASC({
    memory: {
        ttl: 30000, // 30 seconds
        disabled: false
    },
    layers: [
        // Redis Layer
        {
            get: async (key) => {
                const data = await redis.get(key);
                if (data) {
                    return JSON.parse(data);
                }
                return undefined;
            },
            set: async (key, data) => {
                await redis.set(key, JSON.stringify(data), 'EX', 300); // 5 minutes
            },
            clear: async (key) => {
                await redis.del(key);
            }
        },
        // Database Layer
        {
            get: async (key) => {
                return await db.users.findOne({ id: key });
            }
        }
    ]
});

// Usage
async function getUser(userId) {
    return await userCache.get(userId);
}
```

## Cache Layer Priorities

Layers are prioritized in the following order:
1. In-memory cache (if enabled)
2. User-defined layers (in the order they are defined)
3. The final get method (ground truth)

When `get()` is called, ASC:
1. Checks each layer in order until data is found
2. Returns the first found data
3. Automatically populates all higher layers with the found data
4. Uses the `set()` method of each layer (if provided) to store the data

## Memory Cache Considerations

The built-in memory cache uses your process's memory. For optimal performance:

- Set appropriate TTLs to prevent memory exhaustion
- Consider your Node.js memory limits (512MB on 32-bit, 1GB on 64-bit systems)
- Disable memory cache if you prefer external caching only
- If you disable in-memory cache and all layers, the ASC library will still de-dup requests to the origin.

## When to Use ASC

ASC is ideal when:
- You need tiered data storage with automatic population
- You want to reduce load on expensive operations
- You need geographical data distribution
- You want to simplify cache management in your application

## When Not to Use ASC

ASC may not be suitable when:
- You need real-time data without caching
- Your data cannot be serialized (e.g., contains file handles or streams)
- Your keys cannot be serialized with JSON.stringify()

## API Reference

### Constructor Options

```typescript
interface MemoryParams {
    disabled?: boolean;    // Disable in-memory cache
    ttl?: number;         // Time-to-live in milliseconds
}

interface CacheLayer<K, V> {
    get: (key: K) => Promise<V | undefined>;
    set?: (key: K, data: V) => Promise<void>;
    clear?: (key: K) => Promise<void>;
}

interface ConstructorParams<K, V> {
    memory?: MemoryParams;
    layers?: Array<CacheLayer<K, V>>;
    get?: (key: K) => Promise<V | undefined>;
}
```

### Methods

```typescript
class ASC<K, V> {
    constructor(params: ConstructorParams<K, V>);
    get(key: K): Promise<V>;
    set(key: K, data: V): Promise<void>;
    clear(key: K): Promise<void>;
}
```

## Contributing

1. Fork the project on GitHub
2. Create a feature branch from develop: `feature/your-feature-name`
3. Ensure code follows the .eslintrc configuration
4. Add tests for your changes
5. Verify all tests pass: `npm test`
6. Submit a pull request to the develop branch

## License

MIT License - See LICENSE file for details.