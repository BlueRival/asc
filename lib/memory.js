'use strict';

const util = require('./util');

function hasOwn(obj, field) {
    return Object.hasOwnProperty.call(obj, field);
}

class Memory {

    constructor(params) {

        this._init(params);
        this._setup();

    }

    _init(params) {

        this._params = {
            ttl: params.ttl || 60000
        }

        if (typeof this._params.ttl !== 'number' || !Number.isFinite(this._params.ttl)) {
            throw new Error('memory.ttl must be a number and cannot be Infinity or NaN');
        }

        if (this._params.ttl < 0) {
            throw new Error('memory.ttl must be >= 0');
        }

    }

    _setup() {

        this._memoryCache = {};
        this._memoryCacheTimeouts = {};

    }

    async get(key) {
        // console.log('memory.get', key);
        key = util.marshallKey(key);

        if (hasOwn(this._memoryCache, key)) {
            return this._memoryCache[key];
        }

        return undefined;

    }

    async set(key, value) {
        // console.log('memory.set', key, value);
        key = util.marshallKey(key);

        await this._memoryClear(key);

        this._memoryCache[key] = value;

        this._memoryCacheTimeouts[key] = setTimeout(() => this._memoryClear(key), this._params.ttl);

    }

    async clear(key) {
        // console.log('memory.clear', key);
        key = util.marshallKey(key);
        return this._memoryClear(key);
    }

    async _memoryClear(key) {

        if (hasOwn(this._memoryCacheTimeouts, key)) {
            clearTimeout(this._memoryCacheTimeouts[key]);
        }


        delete this._memoryCacheTimeouts[key];
        delete this._memoryCache[key];

    }

}

module.exports = Memory;
