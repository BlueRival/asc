'use strict';

const ASC = require('../../index');
const assert = require('assert');
const util = require('../lib/util');

describe('Caching', function () {

    it('should pass original, unmarshalled key', async function () {

        let data = {
            custom: 'data',
            value: ['here']
        };

        // make three different keys
        let getKey = {
            'a complex': 'key',
            has: [
                'nested',
                'structures',
                {
                    in: 'everywhere'
                }
            ]
        };
        let setKey = {
            'a different complex': 'key',
            has: [
                'nested',
                'structures',
                {
                    in: 'everywhere else'
                }
            ]
        };
        let clearKey = {
            'yet another complex': 'key',
            has: [
                'nested',
                'structures',
                {
                    in: 'still everywhere'
                }
            ]
        };

        let lastGetKey = null;
        let lastSetKey = null;
        let lastClearKey = null;

        const params = {
            memory: {
                disabled: true // ensure our layer only gets used
            },
            layers: [
                {
                    get: async (key) => {
                        lastGetKey = key;
                        return data; // just return the data for any call
                    },
                    set: async (key) => lastSetKey = key,
                    clear: async (key) => lastClearKey = key
                }
            ]
        };

        const asc = new ASC(params);

        await asc.set(setKey, data);

        assert.deepStrictEqual(setKey, lastSetKey, 'key should have been passed unmodified to set');
        assert.deepStrictEqual(null, lastGetKey, 'should not have get key');
        assert.deepStrictEqual(null, lastClearKey, 'should not have clear key');

        const result = await asc.get(getKey);
        assert.deepStrictEqual(result, data, 'get data should have matched');

        assert.deepStrictEqual(setKey, lastSetKey, 'key should have been passed unmodified to set');
        assert.deepStrictEqual(getKey, lastGetKey, 'key should have been passed unmodified to get');
        assert.deepStrictEqual(null, lastClearKey, 'should not have clear key');


        await asc.clear(clearKey);

        assert.deepStrictEqual(setKey, lastSetKey, 'key should have been passed unmodified to set');
        assert.deepStrictEqual(getKey, lastGetKey, 'key should have been passed unmodified to get');
        assert.deepStrictEqual(clearKey, lastClearKey, 'key should have been passed unmodified to clear');


    });

    it('should set, get, clear with memory disabled', async function () {

        let setData = 'set data';
        let unsetData = 'unset data';
        let key = {complex: 'key'};

        const layer1 = util.testLayer();
        const layer2 = util.testLayer();
        const layer3 = util.testLayer();

        const params = {
            memory: {
                disabled: true // ensure our layer only gets used
            },
            layers: [
                layer1,
                layer2,
                layer3
            ],
            get: async () => {
                // console.log('top get', key);
                return unsetData;
            }
        };

        const asc = new ASC(params);

        await asc.set(key, setData);

        let result = await asc.get(key);
        // console.log('result, setData', result, setData);
        assert.strictEqual(result, setData, 'data should match');

        await asc.clear(key);

        assert.strictEqual(layer1.clearCount, 1, 'layer 1 should have cleared');
        assert.strictEqual(layer2.clearCount, 1, 'layer 2 should have cleared');
        assert.strictEqual(layer3.clearCount, 1, 'layer 3 should have cleared');

        result = await asc.get(key);
        // console.log('result, unsetData', result, unsetData);
        assert.strictEqual(result, unsetData, 'data should change');

    });

    it('should set, get, clear with memory enabled', async function () {

        let setData = 'set data';
        let unsetData = 'unset data';
        let key = {complex: 'key'};

        const layer1 = util.testLayer();
        const layer2 = util.testLayer();
        const layer3 = util.testLayer();

        const params = {
            memory: {
                disabled: false
            },
            layers: [
                layer1,
                layer2,
                layer3
            ],
            get: async () => {
                // console.log('top get', key);
                return unsetData;
            }
        };

        const asc = new ASC(params);

        await asc.set(key, setData);

        let result = await asc.get(key);
        // console.log('result, setData', result, setData);
        assert.strictEqual(result, setData, 'data should match');

        await asc.clear(key);

        assert.strictEqual(layer1.clearCount, 1, 'layer 1 should have cleared');
        assert.strictEqual(layer2.clearCount, 1, 'layer 2 should have cleared');
        assert.strictEqual(layer3.clearCount, 1, 'layer 3 should have cleared');

        result = await asc.get(key);
        // console.log('result, unsetData', result, unsetData);
        assert.strictEqual(result, unsetData, 'data should change');

    });

    it('should ignore set if no layers support it, including memory disabled', async function () {

        let setData = 'set data';
        let unsetData = 'unset data';
        let key = {complex: 'key'};

        const params = {
            memory: {
                disabled: true // disable memory so nothing can be stored with a call to set
            },
            get: async () => unsetData
        };

        const asc = new ASC(params);

        await asc.set(key, setData);
        const result = await asc.get(key);

        assert.strictEqual(result, unsetData, 'data should be unset');

    });

    it('should ignore set if no layers support it, or supporting layers are erring out', async function () {

        let setData = 'set data';
        let unsetData = 'unset data';
        let key = {complex: 'key'};

        const params = {
            memory: {
                disabled: true // disable memory so nothing can be stored with a call to set
            },
            layers: [
                {
                    get: async () => undefined
                },
                util.testLayer('a layer to fail them all'),
                {
                    get: async () => undefined
                },
            ],
            get: async () => unsetData
        };

        const asc = new ASC(params);

        await asc.set(key, setData);
        const result = await asc.get(key);

        // console.log('result, unsetData', result, unsetData);
        assert.strictEqual(result, unsetData, 'data should be unset');

    });

    it('should use in-memory cache', async function () {

        let count = 0;
        let timestamp = null;

        const params = {
            layers: [
                {
                    get: async () => {

                        count++;
                        timestamp = new Date().toISOString();

                        return timestamp;

                    }
                }
            ]
        };

        const asc = new ASC(params);
        let result = await asc.get('key');

        // count should be one, because internal memory layer was a miss
        assert.strictEqual(count, 1, 'hit count is wrong');
        assert.strictEqual(result, timestamp, 'result should match');

        await util.wait(1);

        result = await asc.get('key');

        // count should still be one, because internal memory layer was a hit
        assert.strictEqual(count, 1, 'hit count is wrong');
        assert.strictEqual(result, timestamp, 'result should match');

        result = await asc.get('key2');

        // count should be two, because internal memory layer was a miss for this second key
        assert.strictEqual(count, 2, 'hit count is wrong');
        assert.strictEqual(result, timestamp, 'result should match');

    });

    it('should use in-memory cache with shortcut get', async function () {

        let count = 0;
        let timestamp = null;

        const params = {
            get: async () => {

                count++;
                timestamp = new Date().toISOString();

                return timestamp;

            }
        };

        const asc = new ASC(params);

        let result = await asc.get('key');

        // count should be one, because internal memory layer was a miss
        assert.strictEqual(count, 1, 'hit count is wrong');
        assert.strictEqual(result, timestamp, 'result should match');

        await util.wait(1);

        result = await asc.get('key');

        // count should still be one, because internal memory layer was a hit
        assert.strictEqual(count, 1, 'hit count is wrong');
        assert.strictEqual(result, timestamp, 'result should match');

        result = await asc.get('key2');

        assert.strictEqual(count, 2, 'hit count is wrong');
        assert.strictEqual(result, timestamp, 'result should match');

    });


    it('should use multiple cache layers with disabled memory', async function () {

        let count = 0;
        let timestamp = null;

        // these will cache miss, just like internal memory storage in ASC
        const layer1 = util.testLayer();
        const layer2 = util.testLayer();

        const params = {
            memory: {
                disabled: true
            },
            layers: [
                layer1,
                layer2,
                {
                    get: async () => {

                        count++;
                        timestamp = new Date().toISOString();

                        return timestamp;

                    }
                }
            ]
        };

        const asc = new ASC(params);

        let result = await asc.get('key');

        // counts should be one, because internal memory layer was disabled, then all middle layers got back propagated
        assert.strictEqual(layer1.getCount, 1, 'layer1.getCount is wrong');
        assert.strictEqual(layer1.setCount, 1, 'layer1.setCount is wrong');
        assert.strictEqual(layer2.getCount, 1, 'layer2.getCount is wrong');
        assert.strictEqual(layer2.setCount, 1, 'layer2.setCount is wrong');
        assert.strictEqual(count, 1, 'hit count is wrong');
        assert.strictEqual(result, timestamp, 'result should match');

        await util.wait(1);

        result = await asc.get('key');

        // counts should be one, except first layer 2, because internal memory layer was disabled. All layers after should be ignored
        assert.strictEqual(layer1.getCount, 2, 'layer1.getCount is wrong');
        assert.strictEqual(layer1.setCount, 1, 'layer1.setCount is wrong');
        assert.strictEqual(layer2.getCount, 1, 'layer2.getCount is wrong');
        assert.strictEqual(layer2.setCount, 1, 'layer2.setCount is wrong');
        assert.strictEqual(count, 1, 'hit count is wrong');
        assert.strictEqual(result, timestamp, 'result should match');

        result = await asc.get('key2');

        // counts should all increment by one, because internal memory layer was disabled, then all middle layers got back propagated
        assert.strictEqual(layer1.getCount, 3, 'layer1.getCount is wrong');
        assert.strictEqual(layer1.setCount, 2, 'layer1.setCount is wrong');
        assert.strictEqual(layer2.getCount, 2, 'layer2.getCount is wrong');
        assert.strictEqual(layer2.setCount, 2, 'layer2.setCount is wrong');
        assert.strictEqual(count, 2, 'hit count is wrong');
        assert.strictEqual(result, timestamp, 'result should match');

    });

    it('should use multiple cache layers with disabled memory, shortcut get', async function () {

        let count = 0;
        let timestamp = null;

        // these will cache miss, just like internal memory storage in ASC
        const layer1 = util.testLayer();
        const layer2 = util.testLayer();

        const params = {
            memory: {
                disabled: true
            },
            layers: [
                layer1,
                layer2
            ],
            get: async () => {

                count++;
                timestamp = new Date().toISOString();

                return timestamp;

            }
        };

        const asc = new ASC(params);

        let result = await asc.get('key');

        // counts should be one, because internal memory layer was disabled, then all middle layers got back propagated
        assert.strictEqual(layer1.getCount, 1, 'layer1.getCount is wrong');
        assert.strictEqual(layer1.setCount, 1, 'layer1.setCount is wrong');
        assert.strictEqual(layer2.getCount, 1, 'layer2.getCount is wrong');
        assert.strictEqual(layer2.setCount, 1, 'layer2.setCount is wrong');
        assert.strictEqual(count, 1, 'hit count is wrong');
        assert.strictEqual(result, timestamp, 'result should match');

        await util.wait(1);

        result = await asc.get('key');

        // counts should be one, except first layer 2, because internal memory layer was disabled. All layers after should be ignored
        assert.strictEqual(layer1.getCount, 2, 'layer1.getCount is wrong');
        assert.strictEqual(layer1.setCount, 1, 'layer1.setCount is wrong');
        assert.strictEqual(layer2.getCount, 1, 'layer2.getCount is wrong');
        assert.strictEqual(layer2.setCount, 1, 'layer2.setCount is wrong');
        assert.strictEqual(count, 1, 'hit count is wrong');
        assert.strictEqual(result, timestamp, 'result should match');

        result = await asc.get('key2');

        // counts should all increment by one, because internal memory layer was disabled, then all middle layers got back propagated
        assert.strictEqual(layer1.getCount, 3, 'layer1.getCount is wrong');
        assert.strictEqual(layer1.setCount, 2, 'layer1.setCount is wrong');
        assert.strictEqual(layer2.getCount, 2, 'layer2.getCount is wrong');
        assert.strictEqual(layer2.setCount, 2, 'layer2.setCount is wrong');
        assert.strictEqual(count, 2, 'hit count is wrong');
        assert.strictEqual(result, timestamp, 'result should match');

    });

    it('should ignore errors on middle cache layers with disabled memory: version 1', async function () {

        let count = 0;
        let timestamp = null;

        // these will cache miss, just like internal memory storage in ASC
        const layer1 = util.testLayer(new Error('test error'));
        const layer2 = util.testLayer();

        const params = {
            memory: {
                disabled: true
            },
            layers: [
                layer1,
                layer2,
                {
                    get: async () => {

                        count++;
                        timestamp = new Date().toISOString();

                        return timestamp;

                    }
                }
            ]
        };

        const asc = new ASC(params);

        let result = await asc.get('key');

        // counts should be one, because internal memory layer was disabled, then all middle layers got back propagated
        // layer 1 returned errors for all get/set calls, but the calls should still have been made
        assert.strictEqual(layer1.getCount, 1, 'layer1.getCount is wrong');
        assert.strictEqual(layer1.setCount, 1, 'layer1.setCount is wrong');
        assert.strictEqual(layer2.getCount, 1, 'layer2.getCount is wrong');
        assert.strictEqual(layer2.setCount, 1, 'layer2.setCount is wrong');
        assert.strictEqual(count, 1, 'hit count is wrong');
        assert.strictEqual(result, timestamp, 'result should match');

        await util.wait(1);

        result = await asc.get('key');

        // counts should increment by one, except last because layer 2 had the data.
        // internal memory layer was disabled, then all middle layers above layer 2 got back propagated
        // layer 1 returned errors for all get/set calls, but the calls should still have been made
        assert.strictEqual(layer1.getCount, 2, 'layer1.getCount is wrong');
        assert.strictEqual(layer1.setCount, 2, 'layer1.setCount is wrong');
        assert.strictEqual(layer2.getCount, 2, 'layer2.getCount is wrong');
        assert.strictEqual(layer2.setCount, 1, 'layer2.setCount is wrong');
        assert.strictEqual(count, 1, 'hit count is wrong');
        assert.strictEqual(result, timestamp, 'result should match');

        result = await asc.get('key2');

        // counts should increment by one, on all layers because key2 is new
        // internal memory layer was disabled, then all middle layers got back propagated
        // layer 1 returned errors for all get/set calls, but the calls should still have been made
        assert.strictEqual(layer1.getCount, 3, 'layer1.getCount is wrong');
        assert.strictEqual(layer1.setCount, 3, 'layer1.setCount is wrong');
        assert.strictEqual(layer2.getCount, 3, 'layer2.getCount is wrong');
        assert.strictEqual(layer2.setCount, 2, 'layer2.setCount is wrong');
        assert.strictEqual(count, 2, 'hit count is wrong');
        assert.strictEqual(result, timestamp, 'result should match');

    });

    it('should ignore errors on middle cache layers with disabled memory: version 2', async function () {

        let count = 0;
        let timestamp = null;

        // these will cache miss, just like internal memory storage in ASC
        const layer1 = util.testLayer();
        const layer2 = util.testLayer(new Error('test error'));
        const layer3 = util.testLayer();

        const params = {
            memory: {
                disabled: true
            },
            layers: [
                layer1,
                layer2,
                layer3,
                {
                    get: async () => {

                        count++;
                        timestamp = new Date().toISOString();

                        return timestamp;

                    }
                }
            ]
        };

        const asc = new ASC(params);

        let result = await asc.get('key');

        // counts should be one, because internal memory layer was disabled, then all middle layers got back propagated
        // layer 2 returned errors for all get/set calls, but the calls should still have been made
        assert.strictEqual(layer1.getCount, 1, 'layer1.getCount is wrong');
        assert.strictEqual(layer1.setCount, 1, 'layer1.setCount is wrong');
        assert.strictEqual(layer2.getCount, 1, 'layer2.getCount is wrong');
        assert.strictEqual(layer2.setCount, 1, 'layer2.setCount is wrong');
        assert.strictEqual(layer3.getCount, 1, 'layer3.getCount is wrong');
        assert.strictEqual(layer3.setCount, 1, 'layer3.setCount is wrong');
        assert.strictEqual(count, 1, 'hit count is wrong');
        assert.strictEqual(result, timestamp, 'result should match');

        await util.wait(1);

        result = await asc.get('key');

        // layer 1 had data, only get on that layer should increment
        // layer 2 would have returned errors for all get/set calls, but the calls were not made
        assert.strictEqual(layer1.getCount, 2, 'layer1.getCount is wrong');
        assert.strictEqual(layer1.setCount, 1, 'layer1.setCount is wrong');
        assert.strictEqual(layer2.getCount, 1, 'layer2.getCount is wrong');
        assert.strictEqual(layer2.setCount, 1, 'layer2.setCount is wrong');
        assert.strictEqual(layer3.getCount, 1, 'layer3.getCount is wrong');
        assert.strictEqual(layer3.setCount, 1, 'layer3.setCount is wrong');
        assert.strictEqual(count, 1, 'hit count is wrong');
        assert.strictEqual(result, timestamp, 'result should match');

        result = await asc.get('key2');

        // counts should increment by one, on all layers because key2 is new
        // internal memory layer was disabled, then all middle layers got back propagated
        // layer 2 returned errors for all get/set calls, but the calls should still have been made
        assert.strictEqual(layer1.getCount, 3, 'layer1.getCount is wrong');
        assert.strictEqual(layer1.setCount, 2, 'layer1.setCount is wrong');
        assert.strictEqual(layer2.getCount, 2, 'layer2.getCount is wrong');
        assert.strictEqual(layer2.setCount, 2, 'layer2.setCount is wrong');
        assert.strictEqual(layer3.getCount, 2, 'layer3.getCount is wrong');
        assert.strictEqual(layer3.setCount, 2, 'layer3.setCount is wrong');
        assert.strictEqual(count, 2, 'hit count is wrong');
        assert.strictEqual(result, timestamp, 'result should match');

    });

    it('should ignore errors on middle cache layers with enabled memory: version 3', async function () {

        let count = 0;
        let timestamp = null;

        // these will cache miss, just like internal memory storage in ASC
        const layer1 = util.testLayer();
        const layer2 = util.testLayer(new Error('test error'));
        const layer3 = util.testLayer();

        const params = {
            memory: {
                disabled: false
            },
            layers: [
                layer1,
                layer2,
                layer3,
                {
                    get: async () => {

                        count++;
                        timestamp = new Date().toISOString();

                        return timestamp

                    }
                }
            ]
        };

        const asc = new ASC(params);

        let result = await asc.get('key');

        // counts should be one, because internal memory layer was enabled and had a miss, then all middle layers got back propagated
        // layer 2 returned errors for all get/set calls, but the calls should still have been made
        assert.strictEqual(layer1.getCount, 1, 'layer1.getCount is wrong');
        assert.strictEqual(layer1.setCount, 1, 'layer1.setCount is wrong');
        assert.strictEqual(layer2.getCount, 1, 'layer2.getCount is wrong');
        assert.strictEqual(layer2.setCount, 1, 'layer2.setCount is wrong');
        assert.strictEqual(layer3.getCount, 1, 'layer3.getCount is wrong');
        assert.strictEqual(layer3.setCount, 1, 'layer3.setCount is wrong');
        assert.strictEqual(count, 1, 'hit count is wrong');
        assert.strictEqual(result, timestamp, 'result should match');

        await util.wait(1);

        await util.wait(1);

        result = await asc.get('key');

        // memory should have been a hit, so no increments
        // layer 2 would have returned errors for all get/set calls, but the calls were not made
        assert.strictEqual(layer1.getCount, 1, 'layer1.getCount is wrong');
        assert.strictEqual(layer1.setCount, 1, 'layer1.setCount is wrong');
        assert.strictEqual(layer2.getCount, 1, 'layer2.getCount is wrong');
        assert.strictEqual(layer2.setCount, 1, 'layer2.setCount is wrong');
        assert.strictEqual(layer3.getCount, 1, 'layer3.getCount is wrong');
        assert.strictEqual(layer3.setCount, 1, 'layer3.setCount is wrong');
        assert.strictEqual(count, 1, 'hit count is wrong');
        assert.strictEqual(result, timestamp, 'result should match');

        result = await asc.get('key2');

        // counts should increment by one, on all layers because key2 is new
        // internal memory layer was enabled but had a miss, then all middle layers got back propagated
        // layer 2 returned errors for all get/set calls, but the calls should still have been made
        assert.strictEqual(layer1.getCount, 2, 'layer1.getCount is wrong');
        assert.strictEqual(layer1.setCount, 2, 'layer1.setCount is wrong');
        assert.strictEqual(layer2.getCount, 2, 'layer2.getCount is wrong');
        assert.strictEqual(layer2.setCount, 2, 'layer2.setCount is wrong');
        assert.strictEqual(layer3.getCount, 2, 'layer3.getCount is wrong');
        assert.strictEqual(layer3.setCount, 2, 'layer3.setCount is wrong');
        assert.strictEqual(count, 2, 'hit count is wrong');
        assert.strictEqual(result, timestamp, 'result should match');

    });

    it('should return a hit from top layer after set', async function () {

        let count = 0;
        let setData = {some: 'data'};
        let dynamicData = null;

        // these will cache miss, just like internal memory storage in ASC
        const layer1 = util.testLayer();
        const layer2 = util.testLayer(new Error('test error'));
        const layer3 = util.testLayer();

        const params = {
            memory: {
                disabled: false
            },
            layers: [
                layer1,
                layer2,
                layer3,
                {
                    get: async () => {

                        count++;
                        dynamicData = new Date().toISOString();

                        return dynamicData;

                    }
                }
            ]
        };

        const asc = new ASC(params);

        await asc.set('key', setData);

        let result = await asc.get('key');

        // set counts should be one, all else 0, because we set the value on memory
        // layer 2 returned errors for all get/set calls, but the calls should still have been made
        assert.strictEqual(layer1.getCount, 0, 'layer1.getCount is wrong');
        assert.strictEqual(layer1.setCount, 1, 'layer1.setCount is wrong');
        assert.strictEqual(layer2.getCount, 0, 'layer2.getCount is wrong');
        assert.strictEqual(layer2.setCount, 1, 'layer2.setCount is wrong');
        assert.strictEqual(layer3.getCount, 0, 'layer3.getCount is wrong');
        assert.strictEqual(layer3.setCount, 1, 'layer3.setCount is wrong');
        assert.strictEqual(count, 0, 'hit count is wrong');
        assert.strictEqual(result, setData, 'result should match');

        await util.wait(1);

        result = await asc.get('key');

        // memory should have been a hit, so no increments
        // layer 2 would have returned errors for all get/set calls, but the calls were not made
        assert.strictEqual(layer1.getCount, 0, 'layer1.getCount is wrong');
        assert.strictEqual(layer1.setCount, 1, 'layer1.setCount is wrong');
        assert.strictEqual(layer2.getCount, 0, 'layer2.getCount is wrong');
        assert.strictEqual(layer2.setCount, 1, 'layer2.setCount is wrong');
        assert.strictEqual(layer3.getCount, 0, 'layer3.getCount is wrong');
        assert.strictEqual(layer3.setCount, 1, 'layer3.setCount is wrong');
        assert.strictEqual(count, 0, 'hit count is wrong');
        assert.strictEqual(result, setData, 'result should match');

        result = await asc.get('key2');

        // counts should increment by one, on all layers because key2 is new
        // internal memory layer was enabled but had a miss, then all middle layers got back propagated
        // layer 2 returned errors for all get/set calls, but the calls should still have been made
        assert.strictEqual(layer1.getCount, 1, 'layer1.getCount is wrong');
        assert.strictEqual(layer1.setCount, 2, 'layer1.setCount is wrong');
        assert.strictEqual(layer2.getCount, 1, 'layer2.getCount is wrong');
        assert.strictEqual(layer2.setCount, 2, 'layer2.setCount is wrong');
        assert.strictEqual(layer3.getCount, 1, 'layer3.getCount is wrong');
        assert.strictEqual(layer3.setCount, 2, 'layer3.setCount is wrong');
        assert.strictEqual(count, 1, 'hit count is wrong');
        assert.strictEqual(result, dynamicData, 'result should match');

    });

    it('should expire items in memory correctly', async function () {

        let count = 0;
        let timestamps = [];
        const memoryTTL = 2000;

        this.timeout(memoryTTL * 10);

        const params = {
            memory: {
                ttl: memoryTTL
            },
            layers: [
                {
                    get: async () => {

                        count++;
                        timestamps.push(new Date().toISOString());

                        return timestamps[timestamps.length - 1];

                    }
                }
            ]
        };

        const asc = new ASC(params);

        let result = await asc.get('key');

        // count should be one, because internal memory layer was a miss
        assert.strictEqual(count, 1, 'hit count is wrong');
        assert.strictEqual(result, timestamps[0], 'result should match');

        result = await asc.get('key');

        // count should still be one, because internal memory layer was a hit
        assert.strictEqual(count, 1, 'hit count is wrong');
        assert.strictEqual(result, timestamps[count - 1], 'result should match');

        await util.wait(memoryTTL + 1000);

        result = await asc.get('key');

        // count should increment, because internal memory should have expired entry
        assert.strictEqual(count, 2, 'hit count is wrong');
        assert.strictEqual(result, timestamps[count - 1], 'result should match');

        await util.wait(memoryTTL - 100);

        await asc.clear('key');

        result = await asc.get('key');

        // count should increment, because internal memory should have expired entry
        assert.strictEqual(count, 3, 'hit count is wrong');
        assert.strictEqual(result, timestamps[count - 1], 'result should match');

        await util.wait(memoryTTL - 100);

        result = await asc.get('key');

        // count should increment, because internal memory should have expired entry
        assert.strictEqual(count, 3, 'hit count is wrong');
        assert.strictEqual(result, timestamps[count - 1], 'result should match');

    });

    it('should return last error if all layers fail to return data, with memory enabled', async function () {

        // these will cache miss, just like internal memory storage in ASC
        const layer1 = util.testLayer(new Error('test error 1'));
        const layer2 = util.testLayer(new Error('test error 2'));
        const layer3 = util.testLayer(new Error('test error 3'));

        const params = {
            memory: {
                disabled: false
            },
            layers: [
                layer1,
                layer2,
                layer3
            ],
            get: async () => {

                throw new Error('last layer');

            }
        };

        const asc = new ASC(params);

        try {

            await asc.get('key');
            throw new Error('should have thrown an error before here');

        } catch (e) {
            assert(e instanceof Error, 'err should be an instance of Error');
            assert.strictEqual(e.message, 'last layer', 'error message should match');
        }

    });

    it('should return last error if all layers fail to return data, with memory disabled', async function () {

        // these will cache miss, just like internal memory storage in ASC
        const layer1 = util.testLayer(new Error('test error 1'));
        const layer2 = util.testLayer(new Error('test error 2'));
        const layer3 = util.testLayer(new Error('test error 3'));

        const params = {
            memory: {
                disabled: true
            },
            layers: [
                layer1,
                layer2,
                layer3
            ],
            get: async () => {
                throw new Error('last layer');
            }
        };

        const asc = new ASC(params);

        try {

            await asc.get('key');
            throw new Error('should have thrown an error before here');

        } catch (e) {
            assert(e instanceof Error, 'err should be an instance of Error');
            assert.strictEqual(e.message, 'last layer', 'error message should match');
        }

    });

    it('should ignore undefined return values', async function () {

        // these will cache miss, just like internal memory storage in ASC
        const layer1 = util.testLayer();
        const layer2 = util.testLayer(new Error('test error'));
        const layer3 = util.testLayer();

        const params = {
            memory: {
                disabled: false
            },
            layers: [
                layer1,
                layer2,
                layer3
            ],
            get: async () => 'last layer'
        };

        const asc = new ASC(params);

        const result = await asc.get('key');

        assert.strictEqual(result, 'last layer', 'result should match last layer response');

    });

});
