declare module 'asc' {
    class ASC<K, V> {
        constructor(params: ConstructorParams<K, V>);

        get: (key: K) => Promise<V>;
        set: (key: K, data: V) => Promise<void>;
        clear: (key: K) => Promise<void>;
    }

    interface MemoryParams {
        disabled?: boolean;
        ttl?: number;
    }

    type GetCallback<K, V> = (key: K) => Promise<V | undefined>;
    type SetCallback<K, V> = (key: K, data: V) => Promise<any>;
    type ClearCallback<K> = (key: K) => Promise<any>;

    interface CacheLayer<K, V> {
        get: GetCallback<K, V>;
        set?: SetCallback<K, V>;
        clear?: ClearCallback<K>;
    }

    interface ConstructorParams<K, V> {
        memory?: MemoryParams;
        layers?: Array<CacheLayer<K, V>>;
        get?: GetCallback<K, V>;
    }

    export = ASC;
}
