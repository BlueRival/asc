declare module 'asc' {
    class ASC {
        constructor(params: ConstructorParams | Array<CacheLayer> | GetCallback);

        get: (key: any, done: ErrorDataCallback) => void;
        set: (key: any, data: any, done: ErrorCallback) => void;
        clear: (key: any, done: ErrorCallback) => void;
    }

    interface MemoryParams {
        disabled?: boolean;
        ttl?: number;
    }

    type ErrorCallback = (err?: Error) => void;
    type ErrorDataCallback = (err: Error, data: any) => void;
    type DataCallback = (err: Error, data?: any) => void;
    type GetCallback = (key: string, done: DataCallback) => void;
    type SetCallback = (key: string, data: any, done: ErrorCallback) => void;
    type ClearCallback = (key: string, done: ErrorCallback) => void;

    interface CacheLayer {
        get: DataCallback;
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