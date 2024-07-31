'use strict';

const ASC = require('../../index');
const assert = require('assert');
const util = require('../lib/util');

describe('General', function () {

    it('should instantiate', function (done) {

        try {

            const params = {
                layers: [
                    {
                        get: async () => {
                        }
                    }
                ]
            };

            new ASC(params);

        } catch (e) {
            return done(e);
        }

        done();

    });

    it('should add shortcut get just like it was an explicitly defined layer, with explicit layers, memory enabled',
        function (done) {

            // these will cache miss, just like internal memory storage in ASC
            const layer1 = util.testLayer();
            const layer2 = util.testLayer(new Error('test error'));
            const layer3 = util.testLayer();

            const get = async () => new Date().toISOString();

            const params1 = {
                memory: {
                    disabled: true
                },
                layers: [
                    layer1,
                    layer2,
                    layer3,
                    {
                        get: get
                    }
                ]
            };
            const params2 = {
                memory: {
                    disabled: true
                },
                layers: [
                    layer1,
                    layer2,
                    layer3
                ],
                get: get
            };

            const asc1 = new ASC(params1);
            const asc2 = new ASC(params2);

            // converts the set layers array of functions to a string of the source code for each function
            const getLayersString = (asc) => {
                return JSON.stringify(asc._layers.map(layer => layer.get.toString()), null, 4);
            };

            try {

                assert.strictEqual(getLayersString(asc2), getLayersString(asc1), 'layers should be the same');

            } catch (e) {
                return done(e);
            }

            done();

        });

    it('should add shortcut get just like it was an explicitly defined layer, with no explicit layers',
        function (done) {

            const get = async () => {
                return new Date().toISOString();
            };

            const params1 = {
                layers: [
                    {
                        get: get
                    }
                ]
            };

            const params2 = {
                get: get
            };

            const asc1 = new ASC(params1);
            const asc2 = new ASC(params2);

            // converts the set layers array of functions to a string of the source code for each function
            const getLayersString = (asc) => {
                return JSON.stringify(asc._layers.map(layer => layer.get.toString()), null, 4);
            };

            try {

                assert.strictEqual(getLayersString(asc2), getLayersString(asc1), 'layers should be the same');

            } catch (e) {
                return done(e);
            }

            done();

        });

    it('should error out if using layers shortcut', async function () {

        try {
            new ASC([]);
        } catch (e) {
            assert(e instanceof Error, 'err should be an instance of Error');
            assert.strictEqual(e.message, 'params as an array is no longer supported as of version 2.1', 'error message should match');
        }

    });

    it('should error out if using get function shortcut', async function () {

        try {
            new ASC(() => {
            });
        } catch (e) {
            assert(e instanceof Error, 'err should be an instance of Error');
            assert.strictEqual(e.message, 'params as a function is no longer supported as of version 2.1');
        }

    });


});
