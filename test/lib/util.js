'use strict';

const util = require('../../lib/util');

module.exports = {
    marshallKey: util.marshallKey,
    unmarshallKey: util.unmarshallKey,
    wait: async (delay) => {
        return new Promise(resolve => setTimeout(resolve, delay));
    },
    /**
     *
     * Generates a test layer that uses in-memory storage. There is no timeout, and values don't go away unless you clear
     * them.
     *
     * @param {boolean | string | Error} returnError If this is an instance of Error, any call to get, set or clear will return that error.
     *
     * @returns {{
     *  set: function(key, data),
     *  get: function(key),
     *  clear: function(key),
     *  clearCount: number,
     *  getCount: number,
     *  setCount: number,
     *  storage: {},
     *  }}
     */
    testLayer: function (returnError = false) {

        const layer = {
            storage: {},
            getCount: 0,
            setCount: 0,
            clearCount: 0,
            get: async (key) => {
                // console.log('testLayer get', key);
                layer.getCount++;

                if (returnError) {
                    // console.log('throwing get');
                    if (typeof returnError === 'string') {
                        throw new Error(returnError);
                    } else {
                        throw returnError;
                    }
                }

                key = util.marshallKey(key);
                if (Object.prototype.hasOwnProperty.call(layer.storage, key)) {
                    return layer.storage[key];
                } else {
                    return undefined;
                }

            },
            set: async (key, data) => {
                // console.log('testLayer set', key, data);
                layer.setCount++;

                if (returnError) {
                    // console.log('throwing set');
                    if (typeof returnError === 'string') {
                        throw new Error(returnError);
                    } else {
                        throw returnError;
                    }
                }

                layer.storage[util.marshallKey(key)] = data;

            },
            clear: async (key) => {
                // console.log('testLayer clear', key);
                layer.clearCount++;

                if (returnError) {
                    // console.log('throwing clear');
                    if (typeof returnError === 'string') {
                        throw new Error(returnError);
                    } else {
                        throw returnError;
                    }
                }

                delete layer.storage[util.marshallKey(key)];

            }
        };

        return layer;

    }
};
