"use strict";

/**
 * @author Anthony Hildoer <anthony@bluerival.com>
 */

(function () {
	var async = require( 'async' );

	/**
	 * The constructor for a single cache instance.
	 *
	 * @param {object} options
	 *
	 * @see cache.updateOptions()
	 *
	 *
	 * @constructor
	 */
	var cache = module.exports = function ( options ) {

		var self = this;

		self.storage = {};
		self.updateCallbacks = {};
		self.updateOptions( options );

	};

	cache.prototype.updateOptions = function ( options ) {

		var self = this;

		self.options = {
			ttl:         (options.ttl || 300000),
			update:      (options.update || null),
			updateBatch: (options.updateBatch || null),
			clear:       (options.clear || null)
		};

		if ( typeof self.options.ttl !== 'number' || self.options.ttl < 1000 ) {
			self.options.ttl = 1000;
		}

		if ( typeof self.options.update !== 'function' ) {
			self.options.update = null;
		}

		if ( typeof self.options.clear !== 'function' ) {
			self.options.clear = null;
		}

	};

	cache.prototype.getBatch = function ( keys, callback ) {

		if ( typeof callback !== 'function' ) {
			return false;
		}

		callback = nextTickCallback( callback );

		// handle edge case of no keys passed
		if ( !keys || !Array.isArray( keys ) || keys.length < 1 ) {

			callback( [] );

			return;
		}

		var self = this;
		var data = []; // this will contain all the values for each queried key, and gets passed to the call back once populated

		// these arrays all indexed by j
		var missedIndexes = []; // this keeps track of what indexes in data[] are a miss and are waiting to be serviced, corresponds to key at same array location in missedKeys
		var missedKeys = []; // this keeps track of the key that goes with the miss in missedIndex, such that the key stored at missedKeys[n] identifies the value that should populate data[missedIndexes[n]]
		var missedKeyStrings = []; // the serialized cache of respective entry in missedKeys

		var i, j, k, keyString;

		// loop through keys and see which we have data for and which need to be serviced
		for ( i = 0; i < keys.length; i++ ) {

			keyString = stringifyKey( keys[i] );

			// hit on key
			if ( this._exists( keyString ) ) {
				data[i] = this._get( keyString );
			}

			// miss on key
			else {
				data[i] = undefined; // for now

				missedIndexes.push( i );
				missedKeys.push( keys[i] );
				missedKeyStrings.push( keyString );
			}

		}

		// case of all keys had a cache hit
		if ( missedIndexes.length < 1 ) {

			callback( data );

		}

		// case of not all keys had a hit, but there is a batch update
		else if ( typeof self.options.updateBatch === 'function' ) {

			// these arrays all indexed by k
			var batchMissedKeys = []; // tracks the un-serialized keys to pass to user updateBatch() function
			var batchMissedKeyStrings = []; // the serialized cache of respective entry in batchMissedKeys

			// generate and track callbacks to update the cache misses
			var batchCallbacksOutstanding = 0; // keep track of how many of the keys are still waiting on an update
			var getBatchCallback = function ( j ) {

				// generating another callback, so count it
				batchCallbacksOutstanding++;

				return function ( value ) {

					data[missedIndexes[j]] = value;

					// callback is done, so decrement the count
					batchCallbacksOutstanding--;

					// if there are no more callbacks outstanding, we can return the data
					if ( batchCallbacksOutstanding < 1 ) {
						callback( data );
					}

				};

			};

			// iterate through all cache miss keys, creating callbacks for when those keys get populated
			for ( j = 0; j < missedKeys.length; j++ ) {

				keyString = missedKeyStrings[j];

				// push a callback for the missed key, and if it does not already have an update underway, add it to the batch update call
				if ( self._pushUpdateCallback( keyString, getBatchCallback( j ) ) ) {

					batchMissedKeys.push( missedKeys[j] );
					batchMissedKeyStrings.push( keyString );

				}

			}

			process.nextTick( function () {

				// of the cache misses, batchMissedKeys did not already have an update in progress, so we need to update them in batch here
				self.options.updateBatch( batchMissedKeys, function ( data ) {

					// if the update function does not provide an array, clamp
					if ( !Array.isArray( data ) ) {
						data = [];
					}

					// set the data in the cache, then trigger the callbacks
					for ( k = 0; k < batchMissedKeyStrings.length; k++ ) {

						//  new data should have one entry per key
						if ( data.length - 1 < k ) {
							data.push( undefined ); // DEBUG change back to undefined when done
						}

						self._set( batchMissedKeyStrings[k], data[k] );

					}

				} );

			} );
		}

		// case of not all keys had a hit, and there is NOT a batch update
		else {

			var oneByOneLookups = [];

			var pushLookup = function ( j ) {

				// queue up parallel call
				oneByOneLookups.push( function ( callback ) {

					// lookup missed key j
					self.get( missedKeys[j], function ( value ) {

						// put the data where it needs to be
						data[missedIndexes[j]] = value;

						// tell async this function is done
						callback( null, true );

					} );

				} );

			};

			for ( j = 0; j < missedIndexes.length; j++ ) {

				// push lookup for missed data index j
				pushLookup( j );

			}

			async.parallel( oneByOneLookups, function () {
				callback( data );
			} );
		}

		return true;

	};

	cache.prototype.get = function ( key, callback ) {

		if ( typeof callback !== 'function' ) {
			return false;
		}

		callback = nextTickCallback( callback );

		var self = this;
		var keyString = stringifyKey( key );

		// the desired value exists, fire!
		if ( this._exists( keyString ) ) {
			callback( this._get( keyString ) );
		}

		// store the callback, and if this is the first request to come in for this key then we kick off the update
		else if ( self._pushUpdateCallback( keyString, callback ) ) {

			process.nextTick( function () {

				// run the update function
				if ( typeof self.options.update === 'function' ) {

					self.options.update( key, function ( value ) {

						// when the value comes back, cache it, and trigger updates
						self._set( keyString, value );

					} );

				}

				// no update function
				else {

					self._set( keyString, undefined );

				}

			} );

		}

		return true;

	};

	cache.prototype.clear = function ( key ) {

		return this._clear( stringifyKey( key ) );

	};

	cache.prototype.clearAll = function () {

		for ( var keyString in this.storage ) {
			if ( this.storage.hasOwnProperty( keyString ) ) {
				this._clear( keyString );
			}
		}

	};

	cache.prototype._clear = function ( keyString ) {

		var self = this;

		if ( self._exists( keyString ) ) {

			// clear any existing timeout
			if ( self.storage[keyString].timeout ) {
				clearTimeout( self.storage[keyString].timeout );
			}

			// if a clear event handler exists
			if ( typeof self.options.clear === 'function' ) {

				nextTickCallback( self.options.clear )( parseKeyString( keyString ) );

			}

			// delete the entire entry
			delete self.storage[keyString];

		}

	};

	cache.prototype._exists = function ( keyString ) {

		return this.storage.hasOwnProperty( keyString );

	};

	cache.prototype._get = function ( keyString ) {

		if ( this._exists( keyString ) ) {
			return this.storage[keyString].value;
		}

		return undefined;

	};

	cache.prototype._set = function ( keyString, value ) {

		var self = this;

		// empty values are indicated by undefined, their TTL is the minimum
		var overrideTTL = value === undefined ? 1000 : false;

		// remove existing timeouts and data
		self._clear( keyString );

		// set new value
		self.storage[keyString] = {
			value:   value,
			timeout: setTimeout( function () {

				// timeout fired, clear this entry
				self._clear( keyString );

			}, overrideTTL || self.options.ttl )
		};

		// let everyone know the value is here
		self._triggerCallbacks( keyString, value );

	};

	cache.prototype._pushUpdateCallback = function ( keyString, callback ) {

		// if no updated pending, we are the first request and the callback stack will not exist
		if ( !this.updateCallbacks[keyString] ) {
			this.updateCallbacks[keyString] = [];
		}

		// we use a callback array, so that if multiple requests come in for the same key before the first callback is
		// serviced, all the callbacks can share the single response
		this.updateCallbacks[keyString].push( callback );

		// if this is the first callback, then caller is responsible for starting update, so return TRUE, otherwise, return false
		return ( this.updateCallbacks[keyString].length === 1 );

	};

	cache.prototype._triggerCallbacks = function ( keyString, value ) {

		if ( !Array.isArray( this.updateCallbacks[keyString] ) ) {
			return false;
		}

		// fire callbacks
		for ( var i = 0; i < this.updateCallbacks[keyString].length; i++ ) {

			if ( typeof this.updateCallbacks[keyString][i] === 'function' ) {

				this.updateCallbacks[keyString][i]( value );

			}

		}

		// the callbacks array is no longer needed
		delete this.updateCallbacks[keyString];

		return true;

	};

	function nextTickCallback( callback ) {
		return function ( value ) {
			process.nextTick( function () {
				callback( value );
			} );
		};
	}

	function stringifyKey( key ) {
		return JSON.stringify( key );
	}

	function parseKeyString( keyString ) {
		return JSON.parse( keyString );
	}

})();
