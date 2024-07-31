declare module 'asc' {
    class ASC {
        constructor(params: ConstructorParams);

        get: (key: any) => Promise<any>;
        set: (key: any, data: any) => Promise<void>;
        clear: (key: any) => Promise<void>;
    }

    interface MemoryParams {
        disabled?: boolean;
        ttl?: number;
    }

    type GetCallback = (key: string) => Promise<any>;
    type SetCallback = (key: string, data: any) => Promise<any>;
    type ClearCallback = (key: string) => Promise<any>;

    interface CacheLayer {
        get: GetCallback;
        set?: SetCallback;
        clear?: ClearCallback;
    }

    interface ConstructorParams {
        memory?: MemoryParams;
        layers?: Array<CacheLayer>;
        get?: GetCallback;
    }

    export = ASC;
}