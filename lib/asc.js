'use strict';

const Memory = require('./memory');
const util = require('./util');

function isObject(thing) {
    return typeof thing === 'object' && thing !== null;
}

class ASC {

    _serviceQueues = {};
    _memoryParams = {};

    constructor(params) {
        this._init(params);
    }

    _init(params) {

        params = isObject(params) ? params : {};
        this._layers = Array.isArray(params.layers) ? params.layers : [];

        // shortcut for cache with no middle layers
        if (typeof params.get === 'function') {
            this._layers.push({
                get: params.get
            });
        }

        if (this._layers.length < 1) {
            throw new Error('no caching layers provided');
        }

        const memoryParams = params.memory || {};

        this._memoryParams = {
            disabled: !!memoryParams.disabled, ttl: memoryParams.ttl || 1000,
        };

        // if memory cache enabled, make it first
        if (!this._memoryParams.disabled) {

            delete this._memoryParams.disabled;

            const memory = new Memory(this._memoryParams);

            // prefix memory handler to layers
            this._layers.unshift(memory);

        }

        this._layers.forEach((layer, i) => {

            if (!isObject(layer)) {
                throw new Error('layer ' + i + ' is not an object');
            }

            // get function is required
            if (typeof layer.get !== 'function') {
                throw new Error('layer ' + i + ' is missing get function');
            }
        });

    }

    /**
     * Gets the corresponding key from the first layer to have the data.
     *
     * @param { any } key Can be any object or scalar, but must be serializable as JSON.
     */
    async get(key) {

        // only use the marshalled key for ASC callback queues
        // pass original key to all cache layer handlers
        const marshalledKey = util.marshallKey(key);

        if (this._serviceQueues[marshalledKey]) {
            // console.log('return cached queue', key);
            return this._serviceQueues[marshalledKey];
        }

        let resolve;
        let reject;

        const promise = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
        });

        this._serviceQueues[marshalledKey] = promise;

        let finished = false;
        let data = undefined;
        let resolvedIndex = -1;
        let error = null;
        for (let i = 0; !finished && i < this._layers.length; i++) {

            try {
                data = await this._layers[i].get(key);

                if (typeof data !== 'undefined') {
                    // console.log('data found on', i, 'of', this._layers.length - 1, data, this._layers[i]);
                    finished = true;
                    resolvedIndex = i;
                    delete this._serviceQueues[marshalledKey];
                    resolve(data);
                }
            } catch (e) {
                // NO-OP
                // console.log('NO-OP get', e);
                error = e;
            }

        }

        if (resolvedIndex > 0) {
            for (let i = 0; i < resolvedIndex; i++) {
                if (typeof this._layers[i].set === 'function') {
                    // console.log('setting back-fill on', i, 'of', resolvedIndex);
                    try {
                        await this._layers[i].set(key, data);
                        // eslint-disable-next-line no-unused-vars
                    } catch (e) {
                        // NO-OP
                        // console.log('NO-OP back-fill', e);
                    }
                }
            }
        } else if (error) {
            reject(error);
        } else {
            resolve(undefined);
        }

        return promise;

    }

    /**
     * Sets the corresponding key to store the passed data.
     *
     * @param { any } key Can be any object or scalar, but must be serializable as JSON.
     * @param { any } data Can be anything that serializable as JSON.
     */
    async set(key, data) {

        for (let i = 0; i < this._layers.length; i++) {
            const layer = this._layers[i];

            if (typeof layer.set === 'function') {
                // console.log('set data on', i, 'of', this._layers.length - 1);
                try {
                    await layer.set(key, data);
                    // eslint-disable-next-line no-unused-vars
                } catch (e) {
                    // NO-OP
                    // console.log('NO-OP set', e);
                }
            }
        }

    }

    /**
     * Clears the corresponding key.
     *
     * @param { any } key Can be any object or scalar, but must be serializable as JSON.
     */
    async clear(key) {

        for (let i = 0; i < this._layers.length; i++) {
            const layer = this._layers[i];

            if (typeof layer.clear === 'function') {
                try {
                    await layer.clear(key);
                    // eslint-disable-next-line no-unused-vars
                } catch (e) {
                    // NO-OP
                    // console.log('NO-OP clear', e);
                }
            }
        }

    }

}

module.exports = ASC;
