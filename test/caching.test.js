'use strict';

const ASC = require( '../' );
const assert = require( 'assert' );
const async = require( 'async' );
const util = require( './lib/util' );

describe( 'Caching', function () {

  it( 'should pass original, unmarshalled key', function ( done ) {

    let data = {
      custom: 'data',
      value: [ 'here' ]
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
    let setKey = JSON.parse( JSON.stringify( getKey ) );
    let clearKey = JSON.parse( JSON.stringify( getKey ) );

    let lastGetKey = null;
    let lastSetKey = null;
    let lastClearKey = null;

    const params = {
      memory: {
        disabled: true // ensure our layer only gets used
      },
      layers: [
        {
          get: ( key, done ) => {
            console.log( 'debug get', key, done );
            lastGetKey = key;
            done( null, data ); // just return the date for any call
          },
          set: ( key, data, done ) => {
            console.log( 'debug set', key, data, done );
            lastSetKey = key;
            done();
          },
          clear: ( key, done ) => {
            console.log( 'debug clear', key, done );
            lastClearKey = key;
            done();
          }
        }
      ]
    };

    const asc = new ASC( params );

    async.waterfall( [
      ( done ) => {
        console.log( 'debug 1' );
        asc.set( setKey, data, done );
      },
      ( done ) => {
        console.log( 'debug 2' );
        try {

          assert.strictEqual( lastSetKey, setKey, 'key should have been passed unmodified to set' );
          assert.notStrictEqual( lastSetKey, getKey, 'should not have get key' );
          assert.notStrictEqual( lastSetKey, clearKey, 'should not have clear key' );

        } catch ( e ) {
          return done( e );
        }

        done();

      },
      ( done ) => {
        console.log( 'debug 3' );
        asc.get( getKey, done );
      },
      ( result, done ) => {
        console.log( 'debug 4' );
        try {

          assert.strictEqual( lastGetKey, getKey, 'key should have been passed unmodified to get' );
          assert.notStrictEqual( lastGetKey, setKey, 'should not have set key' );
          assert.notStrictEqual( lastGetKey, clearKey, 'should not have clear key' );


        } catch ( e ) {
          return done( e );
        }

        done();

      },
      ( done ) => {
        console.log( 'debug 5' );
        asc.clear( clearKey, done );
      },
      ( done ) => {
        console.log( 'debug 6' );
        try {

          assert.strictEqual( lastClearKey, clearKey, 'key should have been passed unmodified to clear' );
          assert.notStrictEqual( lastClearKey, setKey, 'should not have set key' );
          assert.notStrictEqual( lastClearKey, getKey, 'should not have get key' );

        } catch ( e ) {
          return done( e );
        }

        done();

      }
    ], ( err ) => {

      console.log( 'err', err );
      done( err );

    } );

  } );

  it( 'should set, get, clear with memory disabled', function ( done ) {

    let setData = 'set data';
    let unsetData = 'unset data';
    let key = 'key';

    const params = {
      memory: {
        disabled: true // ensure our layer only gets used
      },
      layers: [
        util.testLayer()
      ],
      get: ( key, done ) => {
        done( null, unsetData )
      }
    };

    const asc = new ASC( params );

    async.waterfall( [
      ( done ) => {
        asc.set( key, setData, done );
      },
      ( done ) => {
        asc.get( key, done );
      },
      ( result, done ) => {

        try {

          assert.strictEqual( result, setData, 'data should match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      },
      ( done ) => {
        asc.clear( key, done );
      },
      ( done ) => {
        asc.get( key, done );
      },
      ( result, done ) => {

        try {

          assert.strictEqual( result, unsetData, 'data should change' );

        } catch ( e ) {
          return done( e );
        }

        done();

      }
    ], done );

  } );

  it( 'should ignore set if no layers support it, including memory disabled', function ( done ) {

    let setData = 'set data';
    let unsetData = 'unset data';
    let key = 'key';

    const params = {
      memory: {
        disabled: true // disable memory so nothing can be stored with a call to set
      },
      get: ( key, done ) => {
        done( null, unsetData )
      }
    };

    const asc = new ASC( params );

    async.waterfall( [
      ( done ) => {
        asc.set( key, setData, done );
      },
      ( done ) => {
        asc.get( key, done );
      },
      ( result, done ) => {

        try {

          assert.strictEqual( result, unsetData, 'data should be unset' );

        } catch ( e ) {
          return done( e );
        }

        done();

      }
    ], done );

  } );

  it( 'should ignore set if no layers support it, or supporting layers are erring out', function ( done ) {

    let setData = 'set data';
    let unsetData = 'unset data';
    let key = 'key';

    const params = {
      memory: {
        disabled: true // disable memory so nothing can be stored with a call to set
      },
      layers: [
        util.testLayer( new Error( 'a layer to fail them all' ) )
      ],
      get: ( key, done ) => {
        done( null, unsetData )
      }
    };

    const asc = new ASC( params );

    async.waterfall( [
      ( done ) => {
        asc.set( key, setData, done );
      },
      ( done ) => {
        asc.get( key, done );
      },
      ( result, done ) => {

        try {

          assert.strictEqual( result, unsetData, 'data should be unset' );

        } catch ( e ) {
          return done( e );
        }

        done();

      }
    ], done );

  } );

  it( 'should use in-memory cache', function ( done ) {

    let count = 0;
    let timestamp = null;

    const params = {
      layers: [
        {
          get: ( key, done ) => {

            count++;
            timestamp = new Date().toISOString();

            done( null, timestamp ); // just return the date for any call

          }
        }
      ]
    };

    const asc = new ASC( params );

    async.waterfall( [
      ( done ) => {
        asc.get( 'key', done );
      },
      ( result, done ) => {

        try {

          // count should be one, because internal memory layer was a miss
          assert.strictEqual( count, 1, 'hit count is wrong' );
          assert.strictEqual( result, timestamp, 'result should match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      },
      ( done ) => {
        // small delay
        setTimeout( done, 1 );
      },
      ( done ) => {
        asc.get( 'key', done );
      },
      ( result, done ) => {

        try {

          // count should still be one, because internal memory layer was a hit
          assert.strictEqual( count, 1, 'hit count is wrong' );
          assert.strictEqual( result, timestamp, 'result should match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      },
      ( done ) => {
        asc.get( 'key2', done );
      },
      ( result, done ) => {

        try {

          // count should be two, because internal memory layer was a miss for this second key
          assert.strictEqual( count, 2, 'hit count is wrong' );
          assert.strictEqual( result, timestamp, 'result should match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      }
    ], done );

  } );

  it( 'should use in-memory cache with shortcut get: version 1', function ( done ) {

    let count = 0;
    let timestamp = null;

    const params = {
      get: ( key, done ) => {

        count++;
        timestamp = new Date().toISOString();

        done( null, timestamp ); // just return the date for any call

      }
    };

    const asc = new ASC( params );

    async.waterfall( [
      ( done ) => {
        asc.get( 'key', done );
      },
      ( result, done ) => {

        try {

          // count should be one, because internal memory layer was a miss
          assert.strictEqual( count, 1, 'hit count is wrong' );
          assert.strictEqual( result, timestamp, 'result should match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      },
      ( done ) => {
        // small delay
        setTimeout( done, 1 );
      },
      ( done ) => {
        asc.get( 'key', done );
      },
      ( result, done ) => {

        try {

          // count should still be one, because internal memory layer was a hit
          assert.strictEqual( count, 1, 'hit count is wrong' );
          assert.strictEqual( result, timestamp, 'result should match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      },
      ( done ) => {
        asc.get( 'key2', done );
      },
      ( result, done ) => {

        try {

          // count should be two, because internal memory layer was a miss for this second key
          assert.strictEqual( count, 2, 'hit count is wrong' );
          assert.strictEqual( result, timestamp, 'result should match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      }
    ], done );

  } );

  it( 'should use in-memory cache with shortcut get: version 2', function ( done ) {

    let count = 0;
    let timestamp = null;

    const params = ( key, done ) => {

      count++;
      timestamp = new Date().toISOString();

      done( null, timestamp ); // just return the date for any call

    };

    const asc = new ASC( params );

    async.waterfall( [
      ( done ) => {
        asc.get( 'key', done );
      },
      ( result, done ) => {

        try {

          // count should be one, because internal memory layer was a miss
          assert.strictEqual( count, 1, 'hit count is wrong' );
          assert.strictEqual( result, timestamp, 'result should match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      },
      ( done ) => {
        // small delay
        setTimeout( done, 1 );
      },
      ( done ) => {
        asc.get( 'key', done );
      },
      ( result, done ) => {

        try {

          // count should still be one, because internal memory layer was a hit
          assert.strictEqual( count, 1, 'hit count is wrong' );
          assert.strictEqual( result, timestamp, 'result should match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      },
      ( done ) => {
        asc.get( 'key2', done );
      },
      ( result, done ) => {

        try {

          // count should be two, because internal memory layer was a miss for this second key
          assert.strictEqual( count, 2, 'hit count is wrong' );
          assert.strictEqual( result, timestamp, 'result should match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      }
    ], done );

  } );

  it( 'should use in-memory cache with shortcut get, no explicit layers', function ( done ) {

    let count = 0;
    let timestamp = null;

    const params = {
      get: ( key, done ) => {

        count++;
        timestamp = new Date().toISOString();

        done( null, timestamp ); // just return the date for any call

      }
    };

    const asc = new ASC( params );

    async.waterfall( [
      ( done ) => {
        asc.get( 'key', done );
      },
      ( result, done ) => {

        try {

          // count should be one, because internal memory layer was a miss
          assert.strictEqual( count, 1, 'hit count is wrong' );
          assert.strictEqual( result, timestamp, 'result should match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      },
      ( done ) => {
        // small delay
        setTimeout( done, 1 );
      },
      ( done ) => {
        asc.get( 'key', done );
      },
      ( result, done ) => {

        try {

          // count should still be one, because internal memory layer was a hit
          assert.strictEqual( count, 1, 'hit count is wrong' );
          assert.strictEqual( result, timestamp, 'result should match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      },
      ( done ) => {
        asc.get( 'key2', done );
      },
      ( result, done ) => {

        try {

          // count should be two, because internal memory layer was a miss for this second key
          assert.strictEqual( count, 2, 'hit count is wrong' );
          assert.strictEqual( result, timestamp, 'result should match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      }
    ], done );

  } );

  it( 'should use multiple cache layers with disabled memory', function ( done ) {

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
          get: ( key, done ) => {

            count++;
            timestamp = new Date().toISOString();

            done( null, timestamp ); // just return the date for any call

          }
        }
      ]
    };

    const asc = new ASC( params );

    async.waterfall( [
      ( done ) => {
        asc.get( 'key', done );
      },
      ( result, done ) => {

        try {

          // counts should be one, because internal memory layer was disabled, then all middle layers got back propagated
          assert.strictEqual( layer1.getCount, 1, 'layer1.getCount is wrong' );
          assert.strictEqual( layer1.setCount, 1, 'layer1.setCount is wrong' );
          assert.strictEqual( layer2.getCount, 1, 'layer2.getCount is wrong' );
          assert.strictEqual( layer2.setCount, 1, 'layer2.setCount is wrong' );
          assert.strictEqual( count, 1, 'hit count is wrong' );
          assert.strictEqual( result, timestamp, 'result should match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      },
      ( done ) => {
        // small delay
        setTimeout( done, 1 );
      },
      ( done ) => {
        asc.get( 'key', done );
      },
      ( result, done ) => {

        try {

          // counts should be one, except first layer 2, because internal memory layer was disabled. All layers after should be ignored
          assert.strictEqual( layer1.getCount, 2, 'layer1.getCount is wrong' );
          assert.strictEqual( layer1.setCount, 1, 'layer1.setCount is wrong' );
          assert.strictEqual( layer2.getCount, 1, 'layer2.getCount is wrong' );
          assert.strictEqual( layer2.setCount, 1, 'layer2.setCount is wrong' );
          assert.strictEqual( count, 1, 'hit count is wrong' );
          assert.strictEqual( result, timestamp, 'result should match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      },
      ( done ) => {
        asc.get( 'key2', done );
      },
      ( result, done ) => {

        try {

          // counts should all increment by one, because internal memory layer was disabled, then all middle layers got back propagated
          assert.strictEqual( layer1.getCount, 3, 'layer1.getCount is wrong' );
          assert.strictEqual( layer1.setCount, 2, 'layer1.setCount is wrong' );
          assert.strictEqual( layer2.getCount, 2, 'layer2.getCount is wrong' );
          assert.strictEqual( layer2.setCount, 2, 'layer2.setCount is wrong' );
          assert.strictEqual( count, 2, 'hit count is wrong' );
          assert.strictEqual( result, timestamp, 'result should match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      }
    ], done );

  } );

  it( 'should use multiple cache layers with disabled memory, shortcut get', function ( done ) {

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
      get: ( key, done ) => {

        count++;
        timestamp = new Date().toISOString();

        done( null, timestamp ); // just return the date for any call

      }
    };

    const asc = new ASC( params );

    async.waterfall( [
      ( done ) => {
        asc.get( 'key', done );
      },
      ( result, done ) => {

        try {

          // counts should be one, because internal memory layer was disabled, then all middle layers got back propagated
          assert.strictEqual( layer1.getCount, 1, 'layer1.getCount is wrong' );
          assert.strictEqual( layer1.setCount, 1, 'layer1.setCount is wrong' );
          assert.strictEqual( layer2.getCount, 1, 'layer2.getCount is wrong' );
          assert.strictEqual( layer2.setCount, 1, 'layer2.setCount is wrong' );
          assert.strictEqual( count, 1, 'hit count is wrong' );
          assert.strictEqual( result, timestamp, 'result should match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      },
      ( done ) => {
        // small delay
        setTimeout( done, 1 );
      },
      ( done ) => {
        asc.get( 'key', done );
      },
      ( result, done ) => {

        try {

          // counts should be one, except first layer 2, because internal memory layer was disabled. All layers after should be ignored
          assert.strictEqual( layer1.getCount, 2, 'layer1.getCount is wrong' );
          assert.strictEqual( layer1.setCount, 1, 'layer1.setCount is wrong' );
          assert.strictEqual( layer2.getCount, 1, 'layer2.getCount is wrong' );
          assert.strictEqual( layer2.setCount, 1, 'layer2.setCount is wrong' );
          assert.strictEqual( count, 1, 'hit count is wrong' );
          assert.strictEqual( result, timestamp, 'result should match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      },
      ( done ) => {
        asc.get( 'key2', done );
      },
      ( result, done ) => {

        try {

          // counts should all increment by one, because internal memory layer was disabled, then all middle layers got back propagated
          assert.strictEqual( layer1.getCount, 3, 'layer1.getCount is wrong' );
          assert.strictEqual( layer1.setCount, 2, 'layer1.setCount is wrong' );
          assert.strictEqual( layer2.getCount, 2, 'layer2.getCount is wrong' );
          assert.strictEqual( layer2.setCount, 2, 'layer2.setCount is wrong' );
          assert.strictEqual( count, 2, 'hit count is wrong' );
          assert.strictEqual( result, timestamp, 'result should match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      }
    ], done );

  } );

  it( 'should use multiple cache layers with enabled memory', function ( done ) {

    let count = 0;
    let timestamp = null;

    // these will cache miss, just like internal memory storage in ASC
    const layer1 = util.testLayer();
    const layer2 = util.testLayer();

    const params = {
      memory: {
        disabled: false
      },
      layers: [
        layer1,
        layer2,
        {
          get: ( key, done ) => {

            count++;
            timestamp = new Date().toISOString();

            done( null, timestamp ); // just return the date for any call

          }
        }
      ]
    };

    const asc = new ASC( params );

    async.waterfall( [
      ( done ) => {
        asc.get( 'key', done );
      },
      ( result, done ) => {

        try {

          // counts should be one, because internal memory layer was a miss, then all middle layers got back propagated
          assert.strictEqual( layer1.getCount, 1, 'layer1.getCount is wrong' );
          assert.strictEqual( layer1.setCount, 1, 'layer1.setCount is wrong' );
          assert.strictEqual( layer2.getCount, 1, 'layer2.getCount is wrong' );
          assert.strictEqual( layer2.setCount, 1, 'layer2.setCount is wrong' );
          assert.strictEqual( count, 1, 'hit count is wrong' );
          assert.strictEqual( result, timestamp, 'result should match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      },
      ( done ) => {
        // small delay
        setTimeout( done, 1 );
      },
      ( done ) => {
        asc.get( 'key', done );
      },
      ( result, done ) => {

        try {

          // counts should be one, because internal memory layer was a hit, and no other layers got engaged at all
          assert.strictEqual( layer1.getCount, 1, 'layer1.getCount is wrong' );
          assert.strictEqual( layer1.setCount, 1, 'layer1.setCount is wrong' );
          assert.strictEqual( layer2.getCount, 1, 'layer2.getCount is wrong' );
          assert.strictEqual( layer2.setCount, 1, 'layer2.setCount is wrong' );
          assert.strictEqual( count, 1, 'hit count is wrong' );
          assert.strictEqual( result, timestamp, 'result should match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      },
      ( done ) => {
        asc.get( 'key2', done );
      },
      ( result, done ) => {

        try {

          // counts should increment by one, because internal memory layer was a miss, then all middle layers got back propagated
          assert.strictEqual( layer1.getCount, 2, 'layer1.getCount is wrong' );
          assert.strictEqual( layer1.setCount, 2, 'layer1.setCount is wrong' );
          assert.strictEqual( layer2.getCount, 2, 'layer2.getCount is wrong' );
          assert.strictEqual( layer2.setCount, 2, 'layer2.setCount is wrong' );
          assert.strictEqual( count, 2, 'hit count is wrong' );
          assert.strictEqual( result, timestamp, 'result should match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      }
    ], done );

  } );

  it( 'should use multiple cache layers with enabled memory, shortcut get', function ( done ) {

    let count = 0;
    let timestamp = null;

    // these will cache miss, just like internal memory storage in ASC
    const layer1 = util.testLayer();
    const layer2 = util.testLayer();

    const params = {
      memory: {
        disabled: false
      },
      layers: [
        layer1,
        layer2
      ],
      get: ( key, done ) => {

        count++;
        timestamp = new Date().toISOString();

        done( null, timestamp ); // just return the date for any call

      }
    };

    const asc = new ASC( params );

    async.waterfall( [
      ( done ) => {
        asc.get( 'key', done );
      },
      ( result, done ) => {

        try {

          // counts should be one, because internal memory layer was a miss, then all middle layers got back propagated
          assert.strictEqual( layer1.getCount, 1, 'layer1.getCount is wrong' );
          assert.strictEqual( layer1.setCount, 1, 'layer1.setCount is wrong' );
          assert.strictEqual( layer2.getCount, 1, 'layer2.getCount is wrong' );
          assert.strictEqual( layer2.setCount, 1, 'layer2.setCount is wrong' );
          assert.strictEqual( count, 1, 'hit count is wrong' );
          assert.strictEqual( result, timestamp, 'result should match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      },
      ( done ) => {
        // small delay
        setTimeout( done, 1 );
      },
      ( done ) => {
        asc.get( 'key', done );
      },
      ( result, done ) => {

        try {

          // counts should be one, because internal memory layer was a hit, and no other layers got engaged at all
          assert.strictEqual( layer1.getCount, 1, 'layer1.getCount is wrong' );
          assert.strictEqual( layer1.setCount, 1, 'layer1.setCount is wrong' );
          assert.strictEqual( layer2.getCount, 1, 'layer2.getCount is wrong' );
          assert.strictEqual( layer2.setCount, 1, 'layer2.setCount is wrong' );
          assert.strictEqual( count, 1, 'hit count is wrong' );
          assert.strictEqual( result, timestamp, 'result should match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      },
      ( done ) => {
        asc.get( 'key2', done );
      },
      ( result, done ) => {

        try {

          // counts should increment by one, because internal memory layer was a miss, then all middle layers got back propagated
          assert.strictEqual( layer1.getCount, 2, 'layer1.getCount is wrong' );
          assert.strictEqual( layer1.setCount, 2, 'layer1.setCount is wrong' );
          assert.strictEqual( layer2.getCount, 2, 'layer2.getCount is wrong' );
          assert.strictEqual( layer2.setCount, 2, 'layer2.setCount is wrong' );
          assert.strictEqual( count, 2, 'hit count is wrong' );
          assert.strictEqual( result, timestamp, 'result should match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      }
    ], done );

  } );

  it( 'should use multiple cache layers with enabled memory, shortcut layers', function ( done ) {

    let count = 0;
    let timestamp = null;

    // these will cache miss, just like internal memory storage in ASC
    const layer1 = util.testLayer();
    const layer2 = util.testLayer();

    const params = [
      layer1,
      layer2,
      {
        get: ( key, done ) => {

          count++;
          timestamp = new Date().toISOString();

          done( null, timestamp ); // just return the date for any call

        }
      }
    ];

    const asc = new ASC( params );

    async.waterfall( [
      ( done ) => {
        asc.get( 'key', done );
      },
      ( result, done ) => {

        try {

          // counts should be one, because internal memory layer was a miss, then all middle layers got back propagated
          assert.strictEqual( layer1.getCount, 1, 'layer1.getCount is wrong' );
          assert.strictEqual( layer1.setCount, 1, 'layer1.setCount is wrong' );
          assert.strictEqual( layer2.getCount, 1, 'layer2.getCount is wrong' );
          assert.strictEqual( layer2.setCount, 1, 'layer2.setCount is wrong' );
          assert.strictEqual( count, 1, 'hit count is wrong' );
          assert.strictEqual( result, timestamp, 'result should match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      },
      ( done ) => {
        // small delay
        setTimeout( done, 1 );
      },
      ( done ) => {
        asc.get( 'key', done );
      },
      ( result, done ) => {

        try {

          // counts should be one, because internal memory layer was a hit, and no other layers got engaged at all
          assert.strictEqual( layer1.getCount, 1, 'layer1.getCount is wrong' );
          assert.strictEqual( layer1.setCount, 1, 'layer1.setCount is wrong' );
          assert.strictEqual( layer2.getCount, 1, 'layer2.getCount is wrong' );
          assert.strictEqual( layer2.setCount, 1, 'layer2.setCount is wrong' );
          assert.strictEqual( count, 1, 'hit count is wrong' );
          assert.strictEqual( result, timestamp, 'result should match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      },
      ( done ) => {
        asc.get( 'key2', done );
      },
      ( result, done ) => {

        try {

          // counts should increment by one, because internal memory layer was a miss, then all middle layers got back propagated
          assert.strictEqual( layer1.getCount, 2, 'layer1.getCount is wrong' );
          assert.strictEqual( layer1.setCount, 2, 'layer1.setCount is wrong' );
          assert.strictEqual( layer2.getCount, 2, 'layer2.getCount is wrong' );
          assert.strictEqual( layer2.setCount, 2, 'layer2.setCount is wrong' );
          assert.strictEqual( count, 2, 'hit count is wrong' );
          assert.strictEqual( result, timestamp, 'result should match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      }
    ], done );

  } );

  it( 'should ignore errors on middle cache layers with enabled memory', function ( done ) {

    let count = 0;
    let timestamp = null;

    // these will cache miss, just like internal memory storage in ASC
    const layer1 = util.testLayer( new Error( 'test error' ) );
    const layer2 = util.testLayer();

    const params = {
      memory: {
        disabled: false
      },
      layers: [
        layer1,
        layer2,
        {
          get: ( key, done ) => {

            count++;
            timestamp = new Date().toISOString();

            done( null, timestamp ); // just return the date for any call

          }
        }
      ]
    };

    const asc = new ASC( params );

    async.waterfall( [
      ( done ) => {
        asc.get( 'key', done );
      },
      ( result, done ) => {

        try {

          // counts should be one, because internal memory layer was a miss, then all middle layers got back propagated
          // layer 1 returned errors for all get/set calls, but the calls should still have been made
          assert.strictEqual( layer1.getCount, 1, 'layer1.getCount is wrong' );
          assert.strictEqual( layer1.setCount, 1, 'layer1.setCount is wrong' );
          assert.strictEqual( layer2.getCount, 1, 'layer2.getCount is wrong' );
          assert.strictEqual( layer2.setCount, 1, 'layer2.setCount is wrong' );
          assert.strictEqual( count, 1, 'hit count is wrong' );
          assert.strictEqual( result, timestamp, 'result should match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      },
      ( done ) => {
        // small delay
        setTimeout( done, 1 );
      },
      ( done ) => {
        asc.get( 'key', done );
      },
      ( result, done ) => {

        try {

          // counts should be one, because internal memory layer was a hit, then all middle layers got ignored
          // layer 1 would have returned errors for all get/set calls, but the calls were not made
          assert.strictEqual( layer1.getCount, 1, 'layer1.getCount is wrong' );
          assert.strictEqual( layer1.setCount, 1, 'layer1.setCount is wrong' );
          assert.strictEqual( layer2.getCount, 1, 'layer2.getCount is wrong' );
          assert.strictEqual( layer2.setCount, 1, 'layer2.setCount is wrong' );
          assert.strictEqual( count, 1, 'hit count is wrong' );
          assert.strictEqual( result, timestamp, 'result should match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      },
      ( done ) => {
        asc.get( 'key2', done );
      },
      ( result, done ) => {

        try {

          // counts should increment by one, because internal memory layer was a miss, then all middle layers got back propagated
          // layer 1 returned errors for all get/set calls, but the calls should still have been made
          assert.strictEqual( layer1.getCount, 2, 'layer1.getCount is wrong' );
          assert.strictEqual( layer1.setCount, 2, 'layer1.setCount is wrong' );
          assert.strictEqual( layer2.getCount, 2, 'layer2.getCount is wrong' );
          assert.strictEqual( layer2.setCount, 2, 'layer2.setCount is wrong' );
          assert.strictEqual( count, 2, 'hit count is wrong' );
          assert.strictEqual( result, timestamp, 'result should match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      }
    ], done );

  } );

  it( 'should ignore errors on middle cache layers with disabled memory: version 1', function ( done ) {

    let count = 0;
    let timestamp = null;

    // these will cache miss, just like internal memory storage in ASC
    const layer1 = util.testLayer( new Error( 'test error' ) );
    const layer2 = util.testLayer();

    const params = {
      memory: {
        disabled: true
      },
      layers: [
        layer1,
        layer2,
        {
          get: ( key, done ) => {

            count++;
            timestamp = new Date().toISOString();

            done( null, timestamp ); // just return the date for any call

          }
        }
      ]
    };

    const asc = new ASC( params );

    async.waterfall( [
      ( done ) => {
        asc.get( 'key', done );
      },
      ( result, done ) => {

        try {

          // counts should be one, because internal memory layer was disabled, then all middle layers got back propagated
          // layer 1 returned errors for all get/set calls, but the calls should still have been made
          assert.strictEqual( layer1.getCount, 1, 'layer1.getCount is wrong' );
          assert.strictEqual( layer1.setCount, 1, 'layer1.setCount is wrong' );
          assert.strictEqual( layer2.getCount, 1, 'layer2.getCount is wrong' );
          assert.strictEqual( layer2.setCount, 1, 'layer2.setCount is wrong' );
          assert.strictEqual( count, 1, 'hit count is wrong' );
          assert.strictEqual( result, timestamp, 'result should match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      },
      ( done ) => {
        // small delay
        setTimeout( done, 1 );
      },
      ( done ) => {
        asc.get( 'key', done );
      },
      ( result, done ) => {

        try {

          // counts should increment by one, except last because layer 2 had the data.
          // internal memory layer was disabled, then all middle layers above layer 2 got back propagated
          // layer 1 returned errors for all get/set calls, but the calls should still have been made
          assert.strictEqual( layer1.getCount, 2, 'layer1.getCount is wrong' );
          assert.strictEqual( layer1.setCount, 2, 'layer1.setCount is wrong' );
          assert.strictEqual( layer2.getCount, 2, 'layer2.getCount is wrong' );
          assert.strictEqual( layer2.setCount, 1, 'layer2.setCount is wrong' );
          assert.strictEqual( count, 1, 'hit count is wrong' );
          assert.strictEqual( result, timestamp, 'result should match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      },
      ( done ) => {
        asc.get( 'key2', done );
      },
      ( result, done ) => {

        try {

          // counts should increment by one, on all layers because key2 is new
          // internal memory layer was disabled, then all middle layers got back propagated
          // layer 1 returned errors for all get/set calls, but the calls should still have been made
          assert.strictEqual( layer1.getCount, 3, 'layer1.getCount is wrong' );
          assert.strictEqual( layer1.setCount, 3, 'layer1.setCount is wrong' );
          assert.strictEqual( layer2.getCount, 3, 'layer2.getCount is wrong' );
          assert.strictEqual( layer2.setCount, 2, 'layer2.setCount is wrong' );
          assert.strictEqual( count, 2, 'hit count is wrong' );
          assert.strictEqual( result, timestamp, 'result should match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      }
    ], done );

  } );

  it( 'should ignore errors on middle cache layers with disabled memory: version 2', function ( done ) {

    let count = 0;
    let timestamp = null;

    // these will cache miss, just like internal memory storage in ASC
    const layer1 = util.testLayer();
    const layer2 = util.testLayer( new Error( 'test error' ) );
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
          get: ( key, done ) => {

            count++;
            timestamp = new Date().toISOString();

            done( null, timestamp ); // just return the date for any call

          }
        }
      ]
    };

    const asc = new ASC( params );

    async.waterfall( [
      ( done ) => {
        asc.get( 'key', done );
      },
      ( result, done ) => {

        try {

          // counts should be one, because internal memory layer was disabled, then all middle layers got back propagated
          // layer 2 returned errors for all get/set calls, but the calls should still have been made
          assert.strictEqual( layer1.getCount, 1, 'layer1.getCount is wrong' );
          assert.strictEqual( layer1.setCount, 1, 'layer1.setCount is wrong' );
          assert.strictEqual( layer2.getCount, 1, 'layer2.getCount is wrong' );
          assert.strictEqual( layer2.setCount, 1, 'layer2.setCount is wrong' );
          assert.strictEqual( layer3.getCount, 1, 'layer3.getCount is wrong' );
          assert.strictEqual( layer3.setCount, 1, 'layer3.setCount is wrong' );
          assert.strictEqual( count, 1, 'hit count is wrong' );
          assert.strictEqual( result, timestamp, 'result should match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      },
      ( done ) => {
        // small delay
        setTimeout( done, 1 );
      },
      ( done ) => {
        asc.get( 'key', done );
      },
      ( result, done ) => {

        try {

          // layer 1 had data, only get on that layer should increment
          // layer 2 would have returned errors for all get/set calls, but the calls were not made
          assert.strictEqual( layer1.getCount, 2, 'layer1.getCount is wrong' );
          assert.strictEqual( layer1.setCount, 1, 'layer1.setCount is wrong' );
          assert.strictEqual( layer2.getCount, 1, 'layer2.getCount is wrong' );
          assert.strictEqual( layer2.setCount, 1, 'layer2.setCount is wrong' );
          assert.strictEqual( layer3.getCount, 1, 'layer3.getCount is wrong' );
          assert.strictEqual( layer3.setCount, 1, 'layer3.setCount is wrong' );
          assert.strictEqual( count, 1, 'hit count is wrong' );
          assert.strictEqual( result, timestamp, 'result should match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      },
      ( done ) => {
        asc.get( 'key2', done );
      },
      ( result, done ) => {

        try {

          // counts should increment by one, on all layers because key2 is new
          // internal memory layer was disabled, then all middle layers got back propagated
          // layer 2 returned errors for all get/set calls, but the calls should still have been made
          assert.strictEqual( layer1.getCount, 3, 'layer1.getCount is wrong' );
          assert.strictEqual( layer1.setCount, 2, 'layer1.setCount is wrong' );
          assert.strictEqual( layer2.getCount, 2, 'layer2.getCount is wrong' );
          assert.strictEqual( layer2.setCount, 2, 'layer2.setCount is wrong' );
          assert.strictEqual( layer3.getCount, 2, 'layer3.getCount is wrong' );
          assert.strictEqual( layer3.setCount, 2, 'layer3.setCount is wrong' );
          assert.strictEqual( count, 2, 'hit count is wrong' );
          assert.strictEqual( result, timestamp, 'result should match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      }
    ], done );

  } );

  it( 'should ignore errors on middle cache layers with enabled memory: version 3', function ( done ) {

    let count = 0;
    let timestamp = null;

    // these will cache miss, just like internal memory storage in ASC
    const layer1 = util.testLayer();
    const layer2 = util.testLayer( new Error( 'test error' ) );
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
          get: ( key, done ) => {

            count++;
            timestamp = new Date().toISOString();

            done( null, timestamp ); // just return the date for any call

          }
        }
      ]
    };

    const asc = new ASC( params );

    async.waterfall( [
      ( done ) => {
        asc.get( 'key', done );
      },
      ( result, done ) => {

        try {

          // counts should be one, because internal memory layer was enabled and had a miss, then all middle layers got back propagated
          // layer 2 returned errors for all get/set calls, but the calls should still have been made
          assert.strictEqual( layer1.getCount, 1, 'layer1.getCount is wrong' );
          assert.strictEqual( layer1.setCount, 1, 'layer1.setCount is wrong' );
          assert.strictEqual( layer2.getCount, 1, 'layer2.getCount is wrong' );
          assert.strictEqual( layer2.setCount, 1, 'layer2.setCount is wrong' );
          assert.strictEqual( layer3.getCount, 1, 'layer3.getCount is wrong' );
          assert.strictEqual( layer3.setCount, 1, 'layer3.setCount is wrong' );
          assert.strictEqual( count, 1, 'hit count is wrong' );
          assert.strictEqual( result, timestamp, 'result should match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      },
      ( done ) => {
        // small delay
        setTimeout( done, 1 );
      },
      ( done ) => {
        asc.get( 'key', done );
      },
      ( result, done ) => {

        try {

          // memory should have been a hit, so no increments
          // layer 2 would have returned errors for all get/set calls, but the calls were not made
          assert.strictEqual( layer1.getCount, 1, 'layer1.getCount is wrong' );
          assert.strictEqual( layer1.setCount, 1, 'layer1.setCount is wrong' );
          assert.strictEqual( layer2.getCount, 1, 'layer2.getCount is wrong' );
          assert.strictEqual( layer2.setCount, 1, 'layer2.setCount is wrong' );
          assert.strictEqual( layer3.getCount, 1, 'layer3.getCount is wrong' );
          assert.strictEqual( layer3.setCount, 1, 'layer3.setCount is wrong' );
          assert.strictEqual( count, 1, 'hit count is wrong' );
          assert.strictEqual( result, timestamp, 'result should match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      },
      ( done ) => {
        asc.get( 'key2', done );
      },
      ( result, done ) => {

        try {

          // counts should increment by one, on all layers because key2 is new
          // internal memory layer was enabled but had a miss, then all middle layers got back propagated
          // layer 2 returned errors for all get/set calls, but the calls should still have been made
          assert.strictEqual( layer1.getCount, 2, 'layer1.getCount is wrong' );
          assert.strictEqual( layer1.setCount, 2, 'layer1.setCount is wrong' );
          assert.strictEqual( layer2.getCount, 2, 'layer2.getCount is wrong' );
          assert.strictEqual( layer2.setCount, 2, 'layer2.setCount is wrong' );
          assert.strictEqual( layer3.getCount, 2, 'layer3.getCount is wrong' );
          assert.strictEqual( layer3.setCount, 2, 'layer3.setCount is wrong' );
          assert.strictEqual( count, 2, 'hit count is wrong' );
          assert.strictEqual( result, timestamp, 'result should match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      }
    ], done );

  } );

  it( 'should ignore errors on middle cache layers with enabled memory: version 3, shortcut get', function ( done ) {

    let count = 0;
    let timestamp = null;

    // these will cache miss, just like internal memory storage in ASC
    const layer1 = util.testLayer();
    const layer2 = util.testLayer( new Error( 'test error' ) );
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
      get: ( key, done ) => {

        count++;
        timestamp = new Date().toISOString();

        done( null, timestamp ); // just return the date for any call

      }
    };

    const asc = new ASC( params );

    async.waterfall( [
      ( done ) => {
        asc.get( 'key', done );
      },
      ( result, done ) => {

        try {

          // counts should be one, because internal memory layer was enabled and had a miss, then all middle layers got back propagated
          // layer 2 returned errors for all get/set calls, but the calls should still have been made
          assert.strictEqual( layer1.getCount, 1, 'layer1.getCount is wrong' );
          assert.strictEqual( layer1.setCount, 1, 'layer1.setCount is wrong' );
          assert.strictEqual( layer2.getCount, 1, 'layer2.getCount is wrong' );
          assert.strictEqual( layer2.setCount, 1, 'layer2.setCount is wrong' );
          assert.strictEqual( layer3.getCount, 1, 'layer3.getCount is wrong' );
          assert.strictEqual( layer3.setCount, 1, 'layer3.setCount is wrong' );
          assert.strictEqual( count, 1, 'hit count is wrong' );
          assert.strictEqual( result, timestamp, 'result should match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      },
      ( done ) => {
        // small delay
        setTimeout( done, 1 );
      },
      ( done ) => {
        asc.get( 'key', done );
      },
      ( result, done ) => {

        try {

          // memory should have been a hit, so no increments
          // layer 2 would have returned errors for all get/set calls, but the calls were not made
          assert.strictEqual( layer1.getCount, 1, 'layer1.getCount is wrong' );
          assert.strictEqual( layer1.setCount, 1, 'layer1.setCount is wrong' );
          assert.strictEqual( layer2.getCount, 1, 'layer2.getCount is wrong' );
          assert.strictEqual( layer2.setCount, 1, 'layer2.setCount is wrong' );
          assert.strictEqual( layer3.getCount, 1, 'layer3.getCount is wrong' );
          assert.strictEqual( layer3.setCount, 1, 'layer3.setCount is wrong' );
          assert.strictEqual( count, 1, 'hit count is wrong' );
          assert.strictEqual( result, timestamp, 'result should match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      },
      ( done ) => {
        asc.get( 'key2', done );
      },
      ( result, done ) => {

        try {

          // counts should increment by one, on all layers because key2 is new
          // internal memory layer was enabled but had a miss, then all middle layers got back propagated
          // layer 2 returned errors for all get/set calls, but the calls should still have been made
          assert.strictEqual( layer1.getCount, 2, 'layer1.getCount is wrong' );
          assert.strictEqual( layer1.setCount, 2, 'layer1.setCount is wrong' );
          assert.strictEqual( layer2.getCount, 2, 'layer2.getCount is wrong' );
          assert.strictEqual( layer2.setCount, 2, 'layer2.setCount is wrong' );
          assert.strictEqual( layer3.getCount, 2, 'layer3.getCount is wrong' );
          assert.strictEqual( layer3.setCount, 2, 'layer3.setCount is wrong' );
          assert.strictEqual( count, 2, 'hit count is wrong' );
          assert.strictEqual( result, timestamp, 'result should match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      }
    ], done );

  } );

  it( 'should return a hit from top layer after set', function ( done ) {

    let count = 0;
    let setData = 'some value';
    let dynamicData = null;

    // these will cache miss, just like internal memory storage in ASC
    const layer1 = util.testLayer();
    const layer2 = util.testLayer( new Error( 'test error' ) );
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
          get: ( key, done ) => {

            count++;
            dynamicData = new Date().toISOString();

            done( null, dynamicData ); // just return the date for any call

          }
        }
      ]
    };

    const asc = new ASC( params );

    async.waterfall( [
      ( done ) => {
        asc.set( 'key', setData, done );
      },
      ( done ) => {
        asc.get( 'key', done );
      },
      ( result, done ) => {

        try {

          // set counts should be one, all else 0, because we set the value on memory
          // layer 2 returned errors for all get/set calls, but the calls should still have been made
          assert.strictEqual( layer1.getCount, 0, 'layer1.getCount is wrong' );
          assert.strictEqual( layer1.setCount, 1, 'layer1.setCount is wrong' );
          assert.strictEqual( layer2.getCount, 0, 'layer2.getCount is wrong' );
          assert.strictEqual( layer2.setCount, 1, 'layer2.setCount is wrong' );
          assert.strictEqual( layer3.getCount, 0, 'layer3.getCount is wrong' );
          assert.strictEqual( layer3.setCount, 1, 'layer3.setCount is wrong' );
          assert.strictEqual( count, 0, 'hit count is wrong' );
          assert.strictEqual( result, setData, 'result should match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      },
      ( done ) => {
        // small delay
        setTimeout( done, 1 );
      },
      ( done ) => {
        asc.get( 'key', done );
      },
      ( result, done ) => {

        try {

          // memory should have been a hit, so no increments
          // layer 2 would have returned errors for all get/set calls, but the calls were not made
          assert.strictEqual( layer1.getCount, 0, 'layer1.getCount is wrong' );
          assert.strictEqual( layer1.setCount, 1, 'layer1.setCount is wrong' );
          assert.strictEqual( layer2.getCount, 0, 'layer2.getCount is wrong' );
          assert.strictEqual( layer2.setCount, 1, 'layer2.setCount is wrong' );
          assert.strictEqual( layer3.getCount, 0, 'layer3.getCount is wrong' );
          assert.strictEqual( layer3.setCount, 1, 'layer3.setCount is wrong' );
          assert.strictEqual( count, 0, 'hit count is wrong' );
          assert.strictEqual( result, setData, 'result should match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      },
      ( done ) => {
        asc.get( 'key2', done );
      },
      ( result, done ) => {

        try {

          // counts should increment by one, on all layers because key2 is new
          // internal memory layer was enabled but had a miss, then all middle layers got back propagated
          // layer 2 returned errors for all get/set calls, but the calls should still have been made
          assert.strictEqual( layer1.getCount, 1, 'layer1.getCount is wrong' );
          assert.strictEqual( layer1.setCount, 2, 'layer1.setCount is wrong' );
          assert.strictEqual( layer2.getCount, 1, 'layer2.getCount is wrong' );
          assert.strictEqual( layer2.setCount, 2, 'layer2.setCount is wrong' );
          assert.strictEqual( layer3.getCount, 1, 'layer3.getCount is wrong' );
          assert.strictEqual( layer3.setCount, 2, 'layer3.setCount is wrong' );
          assert.strictEqual( count, 1, 'hit count is wrong' );
          assert.strictEqual( result, dynamicData, 'result should match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      }
    ], done );

  } );

  it( 'should return a hit from top layer after set, shortcut get', function ( done ) {

    let count = 0;
    let setData = 'some value';
    let dynamicData = null;

    // these will cache miss, just like internal memory storage in ASC
    const layer1 = util.testLayer();
    const layer2 = util.testLayer( new Error( 'test error' ) );
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
      get: ( key, done ) => {

        count++;
        dynamicData = new Date().toISOString();

        done( null, dynamicData ); // just return the date for any call

      }
    };

    const asc = new ASC( params );

    async.waterfall( [
      ( done ) => {
        asc.set( 'key', setData, done );
      },
      ( done ) => {
        asc.get( 'key', done );
      },
      ( result, done ) => {

        try {

          // set counts should be one, all else 0, because we set the value on memory
          // layer 2 returned errors for all get/set calls, but the calls should still have been made
          assert.strictEqual( layer1.getCount, 0, 'layer1.getCount is wrong' );
          assert.strictEqual( layer1.setCount, 1, 'layer1.setCount is wrong' );
          assert.strictEqual( layer2.getCount, 0, 'layer2.getCount is wrong' );
          assert.strictEqual( layer2.setCount, 1, 'layer2.setCount is wrong' );
          assert.strictEqual( layer3.getCount, 0, 'layer3.getCount is wrong' );
          assert.strictEqual( layer3.setCount, 1, 'layer3.setCount is wrong' );
          assert.strictEqual( count, 0, 'hit count is wrong' );
          assert.strictEqual( result, setData, 'result should match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      },
      ( done ) => {
        // small delay
        setTimeout( done, 1 );
      },
      ( done ) => {
        asc.get( 'key', done );
      },
      ( result, done ) => {

        try {

          // memory should have been a hit, so no increments
          // layer 2 would have returned errors for all get/set calls, but the calls were not made
          assert.strictEqual( layer1.getCount, 0, 'layer1.getCount is wrong' );
          assert.strictEqual( layer1.setCount, 1, 'layer1.setCount is wrong' );
          assert.strictEqual( layer2.getCount, 0, 'layer2.getCount is wrong' );
          assert.strictEqual( layer2.setCount, 1, 'layer2.setCount is wrong' );
          assert.strictEqual( layer3.getCount, 0, 'layer3.getCount is wrong' );
          assert.strictEqual( layer3.setCount, 1, 'layer3.setCount is wrong' );
          assert.strictEqual( count, 0, 'hit count is wrong' );
          assert.strictEqual( result, setData, 'result should match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      },
      ( done ) => {
        asc.get( 'key2', done );
      },
      ( result, done ) => {

        try {

          // counts should increment by one, on all layers because key2 is new
          // internal memory layer was enabled but had a miss, then all middle layers got back propagated
          // layer 2 returned errors for all get/set calls, but the calls should still have been made
          assert.strictEqual( layer1.getCount, 1, 'layer1.getCount is wrong' );
          assert.strictEqual( layer1.setCount, 2, 'layer1.setCount is wrong' );
          assert.strictEqual( layer2.getCount, 1, 'layer2.getCount is wrong' );
          assert.strictEqual( layer2.setCount, 2, 'layer2.setCount is wrong' );
          assert.strictEqual( layer3.getCount, 1, 'layer3.getCount is wrong' );
          assert.strictEqual( layer3.setCount, 2, 'layer3.setCount is wrong' );
          assert.strictEqual( count, 1, 'hit count is wrong' );
          assert.strictEqual( result, dynamicData, 'result should match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      }
    ], done );

  } );

  it( 'should expire items in memory correctly', function ( done ) {

    let count = 0;
    let timestamp = null;
    const memoryTTL = 3;


    const params = {
      memory: {
        ttl: memoryTTL
      },
      layers: [
        {
          get: ( key, done ) => {

            count++;
            timestamp = new Date().toISOString();

            done( null, timestamp ); // just return the date for any call

          }
        }
      ]
    };

    const asc = new ASC( params );

    async.waterfall( [
      ( done ) => {
        asc.get( 'key', done );
      },
      ( result, done ) => {

        try {

          // count should be one, because internal memory layer was a miss
          assert.strictEqual( count, 1, 'hit count is wrong' );
          assert.strictEqual( result, timestamp, 'result should match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      },
      ( done ) => {
        asc.get( 'key', done );
      },
      ( result, done ) => {

        try {

          // count should still be one, because internal memory layer was a hit
          assert.strictEqual( count, 1, 'hit count is wrong' );
          assert.strictEqual( result, timestamp, 'result should match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      },
      ( done ) => {
        // let TTL expire
        setTimeout( done, memoryTTL );
      },
      ( done ) => {
        asc.get( 'key', done );
      },
      ( result, done ) => {

        try {

          // count should increment, because internal memory should have expired entry
          assert.strictEqual( count, 2, 'hit count is wrong' );
          assert.strictEqual( result, timestamp, 'result should match' );

        } catch ( e ) {
          return done( e );
        }

        done();

      }
    ], done );

  } );

  it( 'should return last error if all layers fail to return data, with memory enabled', function ( done ) {

    // these will cache miss, just like internal memory storage in ASC
    const layer1 = util.testLayer( new Error( 'test error 1' ) );
    const layer2 = util.testLayer( new Error( 'test error 2' ) );
    const layer3 = util.testLayer( new Error( 'test error 3' ) );

    const params = {
      memory: {
        disabled: false
      },
      layers: [
        layer1,
        layer2,
        layer3
      ],
      get: ( key, done ) => {

        done( new Error( 'last layer' ) );

      }
    };

    const asc = new ASC( params );

    asc.get( 'key', ( err, data ) => {

      try {

        assert( err instanceof Error, 'err should be an instance of Error' );
        assert.strictEqual( err.message, 'last layer', 'error message should match' );
        assert.strictEqual( data, undefined, 'data should be undefined' );

      } catch ( e ) {
        return done( e );
      }

      done();

    } );

  } );

  it( 'should return last error if all layers fail to return data, with memory disabled', function ( done ) {

    // these will cache miss, just like internal memory storage in ASC
    const layer1 = util.testLayer( new Error( 'test error 1' ) );
    const layer2 = util.testLayer( new Error( 'test error 2' ) );
    const layer3 = util.testLayer( new Error( 'test error 3' ) );

    const params = {
      memory: {
        disabled: true
      },
      layers: [
        layer1,
        layer2,
        layer3
      ],
      get: ( key, done ) => {

        done( new Error( 'last layer' ) );

      }
    };

    const asc = new ASC( params );

    asc.get( 'key', ( err, data ) => {

      try {

        assert( err instanceof Error, 'err should be an instance of Error' );
        assert.strictEqual( err.message, 'last layer', 'error message should match' );
        assert.strictEqual( data, undefined, 'data should be undefined' );

      } catch ( e ) {
        return done( e );
      }

      done();

    } );

  } );

} );
