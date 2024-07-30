'use strict';

const __ = require('doublescore');
const async = require('async');
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

        this._params = __({
            ttl: 60000
        }).mixin(params || {});

        if (!__.isNumber(this._params.ttl)) {
            throw new Error('memory.ttl must be a number');
        }

        if (this._params.ttl < 0) {
            throw new Error('memory.ttl must be >= 0');
        }

    }

    _setup() {

        this._memoryCache = {};
        this._memoryCacheTimeouts = {};

    }

    get(key, done) {

        key = util.marshallKey(key);

        if (hasOwn(this._memoryCache, key)) {
            return done(null, this._memoryCache[key]);
        }

        done(new Error('not found'));

    }

    set(key, value, done) {

        key = util.marshallKey(key);

        async.waterfall([
            (done) => {
                this._memoryClear(key, done);
            },
            (done) => {
                this._memoryCache[key] = value;

                this._memoryCacheTimeouts[key] = setTimeout(() => {
                    this._memoryClear(key, () => {
                        // NO-OP
                    });
                }, this._params.ttl);

                done();
            }
        ], done);

    }

    clear(key, done) {
        key = util.marshallKey(key);
        this._memoryClear(key, done);
    }

    _memoryClear(key, done) {

        if (hasOwn(this._memoryCacheTimeouts, key)) {
            clearTimeout(this._memoryCacheTimeouts[key]);
        }


        delete this._memoryCacheTimeouts[key];
        delete this._memoryCache[key];

        done();

    }

}

module.exports = Memory;
