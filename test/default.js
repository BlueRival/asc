'use strict';

var factory = require( '../' );
var assert = require( 'assert' );
var async = require( 'async' );

describe( 'ASC Factory', function () {

	describe( 'getCache', function () {

		var cacheOne = factory.getCache( 'getCache1', {
			ttl:    1000,
			update: function ( key, callback ) {
				callback( key + 'u' );
			}
		} );

		it( 'should return the same cache object for the same cache name', function () {
			assert.strictEqual( factory.getCache( 'getCache1' ), cacheOne );
		} );

		it( 'should NOT return the same cache object for different cache name', function () {
			assert.notStrictEqual( factory.getCache( 'getCache2' ), cacheOne );
		} );

		it( 'should return a new cache object if a cache name is previously cleared', function () {
			factory.clear( 'getCache1' );
			assert.notStrictEqual( factory.getCache( 'getCache1' ), cacheOne );
		} );

	} );

} );

describe( 'ASC', function () {

	var lastUpdateKey;
	var updates = 0;
	var keyUpdates = {};

	var lastUpdateKeys;
	var updateBatches = 0;

	var cleared = 0;

	// the cache to test
	var testCache = null;

	describe( 'get', function () {

		testCache = factory.getCache( 'testCache1', {
			ttl:    1000,
			clear:  function () {
				cleared++;
			},
			update: function ( key, callback ) {
				var keyStr = JSON.stringify( key );
				lastUpdateKey = key;

				if ( !keyUpdates.hasOwnProperty( keyStr ) ) {
					keyUpdates[keyStr] = 0;
				}

				keyUpdates[keyStr]++;
				updates++;
				callback( keyStr + 'check' );
			}
		} );

		var expectedCleared = 0;
		var createCheckValueGetTest = function ( value ) {

			expectedCleared++;

			it( 'should return "' + value + 'check"', function ( done ) {
				testCache.get( value, function ( returnValue ) {
					assert.strictEqual( returnValue, value + 'check' );
					done();
				} );
			} );

		};

		createCheckValueGetTest( 1 );
		createCheckValueGetTest( 2 );
		createCheckValueGetTest( 3 );

		it( 'should have cleared ' + expectedCleared + ' keys by now',
			function ( done ) {

				// allow up to a 10% error rate in setTimeout
				// accuracy (100ms for the setTimeout to clear
				// keys + 100ms for the setTimeout here)
				setTimeout( function () {
					assert.strictEqual( cleared, expectedCleared );
					cleared = 0;
					done();
				}, 1200 );

			} );

		var simultaneousCalls = 10000;
		it( 'should have triggered only 1 call to update for ' + simultaneousCalls + ' parallel calls to the same key', function ( done ) {

			updates = 0;
			keyUpdates = {};
			var tasks = [];

			var pushTask = function () {
				tasks.push( function ( done ) {

					async.parallel( [
						function ( done ) {
							testCache.get( 'set1', function () {
								done( null, true );
							} );
						},
						function ( done ) {
							testCache.get( 'set1', function () {
								done( null, true );
							} );
						},
						function ( done ) {
							testCache.get( 'set1', function () {
								done( null, true );
							} );
						},
						function ( done ) {
							testCache.get( 'set2', function () {
								done( null, true );
							} );
						},
						function ( done ) {
							testCache.get( 'set2', function () {
								done( null, true );
							} );
						},
						function ( done ) {
							testCache.get( 'set2', function () {
								done( null, true );
							} );
						}
					], done );

				} );
			};

			for ( var i = 0; i < simultaneousCalls; i++ ) {
				pushTask();
			}

			async.parallel( tasks, function () {
				assert.strictEqual( updates, 2 );
				assert.strictEqual( keyUpdates['"set1"'], 1 );
				assert.strictEqual( keyUpdates['"set2"'], 1 );
				done();
			} );

		} );

		it( 'should pass the same key (exact same object, not clone) to update functions', function ( done ) {

			var complexKey = {
				one:   1,
				two:   2,
				three: 3
			};

			testCache.get( complexKey, function () {
				assert.strictEqual( lastUpdateKey, complexKey );
				done();
			} );

		} );

		it( 'should support deep keys which consist of any scalar type, arrays or primitive objects', function ( done ) {

			var deepKey = {
				one:          1,
				true:         true,
				booleanFalse: false,
				deepObject:   {
					two:    "two",
					deeper: {
						three:  "tres",
						4:      [1, "two", "three", "four"],
						"five": "5ster"
					},
					name:   "anthony"
				},
				nulled:       null,
				objectNulled: {
					nulled: null,
					six:    7
				}
			};

			testCache.get( deepKey, function () {
				assert.deepEqual( lastUpdateKey, deepKey );
				done();
			} );

		} );

	} );

	describe( 'getBatch', function () {

		it( 'should return keys as values with "check" appended in the same order they were passed in as keys, with no updateBatch defined', function ( done ) {

			// redefine to add updateBatch
			testCache = factory.getCache( 'testCache2', {
				ttl:    1000,
				clear:  function () {
					cleared++;
				},
				update: function ( key, callback ) {
					lastUpdateKey = key;
					var keyStr = JSON.stringify( key );
					if ( !keyUpdates.hasOwnProperty( keyStr ) ) {
						keyUpdates[keyStr] = 0;
					}

					keyUpdates[keyStr]++;
					updates++;
					callback( key + 'check' );
				}
			} );

			var keys = ["one", "two", "three", "four"];

			testCache.getBatch( keys, function ( values ) {

				for ( var i = 0; i < keys.length; i++ ) {
					assert.strictEqual( values[i], keys[i] + "check" );
				}

				done();

			} );

		} );

		it( 'should return keys as values with "check" appended in the same order they were passed in as keys, with updateBatch defined', function ( done ) {

			// redefine to add updateBatch
			testCache = factory.getCache( 'testCache3', {
				ttl:         1000,
				clear:       function () {
					cleared++;
				},
				update:      function ( key, callback ) {
					lastUpdateKey = key;
					var keyStr = JSON.stringify( key );
					if ( !keyUpdates.hasOwnProperty( keyStr ) ) {
						keyUpdates[keyStr] = 0;
					}

					keyUpdates[keyStr]++;
					updates++;
					callback( key + 'check' );
				},
				updateBatch: function ( keys, callback ) {
					var data = [];
					lastUpdateKeys = keys;
					updateBatches++;
					for ( var i = 0; i < keys.length; i++ ) {
						data[i] = keys[i] + 'check';
					}
					callback( data );
				}
			} );

			var keys = ["one", "two", "three", "four"];

			testCache.getBatch( keys, function ( values ) {

				for ( var i = 0; i < keys.length; i++ ) {
					assert.equal( values[i], keys[i] + "check" );
				}

				done();

			} );

		} );

		it( 'should trigger 3 calls to update, and 1 call to updateBatch', function ( done ) {

			cleared = 0;
			updates = 0;
			updateBatches = 0;

			// redefine to add updateBatch
			testCache = factory.getCache( 'testCache4', {
				ttl:         1000,
				clear:       function () {
					cleared++;
				},
				update:      function ( key, callback ) {
					lastUpdateKey = key;
					var keyStr = JSON.stringify( key );
					if ( !keyUpdates.hasOwnProperty( keyStr ) ) {
						keyUpdates[keyStr] = 0;
					}

					keyUpdates[keyStr]++;
					updates++;
					callback( key + 'check' );
				},
				updateBatch: function ( keys, callback ) {
					var data = [];
					lastUpdateKeys = keys;
					updateBatches++;
					for ( var i = 0; i < keys.length; i++ ) {
						data[i] = keys[i] + 'check';
					}
					callback( data );
				}
			} );

			// get one key before we even try anything, assuring that there is a direct cache hit
			testCache.get( "four", function () {

				var batchKeys = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
				var batchValues = null;

				var tasks = [
					function ( callback ) {
						testCache.get( "three", function () {
							callback( null, true );
						} );
					},
					function ( callback ) {
						testCache.get( "one", function () {
							callback( null, true );
						} );
					},
					function ( callback ) {
						testCache.getBatch( batchKeys, function ( values ) {
							batchValues = values;
							callback( null, true );
						} );
					},
					function ( callback ) {
						testCache.get( "two", function () {
							callback( null, true );
						} );
					},
					function ( callback ) {
						testCache.get( "six", function () {
							callback( null, true );
						} );
					}
				];

				async.parallel( tasks, function () {
					for ( var i = 0; i < batchKeys.length; i++ ) {
						assert.strictEqual( batchValues[i], batchKeys[i] + "check" );
					}
					assert.strictEqual( updates, 3 );
					assert.strictEqual( updateBatches, 1 );
					done();
				} );

			} );

		} );

		it( 'should return undefined for all keys', function ( done ) {

			testCache = factory.getCache( 'testCache5', {
				ttl:         1000,
				update:      function ( key, callback ) {
					callback( undefined );
				},
				updateBatch: function ( keys, callback ) {
					callback( undefined );
				}
			} );

			var batchKeys = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

			testCache.getBatch( batchKeys, function ( values ) {

				// values should have one entry for each entry in batch keys
				assert.strictEqual( values.length, batchKeys.length, 'should have returned ' + batchKeys.length + ' values, returned ' + values.length + ' instead.' );

				// all values should have clamped to undefined
				for ( var i = 0; i < batchKeys.length; i++ ) {
					var type = typeof values[i];
					assert.strictEqual( type, 'undefined', 'should have returned `undefined` for index ' + i + ', instead found: ' + type );
				}

				done();

			} );

		} );


		it( 'should pass the same keys (exact same objects, not clones) to updateBatch functions', function ( done ) {

			testCache = factory.getCache( 'testCache6', {
				ttl:         1000,
				update:      function ( key, callback ) {
					lastUpdateKey = key;
					callback( key + 'check' );
				},
				updateBatch: function ( keys, callback ) {
					var data = [];
					lastUpdateKeys = keys;
					for ( var i = 0; i < keys.length; i++ ) {
						data[i] = keys[i];
					}
					callback( data );
				}
			} );

			var batchKeys = [
				{
					one:   1,
					two:   'two',
					three: (4 - 1),
					four:  4
				},

				{
					a: 'ay',
					b: 'bee',
					c: 'see',
					d: '?'
				},
				{
					alpha:   {},
					beta:    {
						one: 1,
						two: 2
					},
					charlie: "and the chocolate factory"
				}
			];

			testCache.getBatch( batchKeys, function () {

				// all values should have clamped to undefined
				for ( var i = 0; i < batchKeys.length; i++ ) {
					assert.strictEqual( lastUpdateKeys[i], batchKeys[i] );
				}

				done();

			} );

		} );

	} );
} );
