'use strict';

var async = require( 'async' );

/**
 * The Cache Class for ASC
 *
 * The constructor for a single cache instance.
 *
 * @param {object} [options] Configuration for the cache
 * @param {number ? 300000} [options.ttl] The number of milliseconds each
 *     key exist in the cache
 * @param {function} options.update A function used to update the cache one
 *     key at a time. Prototype defined below
 * @param {function} [options.updateBatch] A function used to update the
 *     cache in bulk. Prototype defined below
 * @param {function} [options.clear] A function called when a key is
 *    cleared, by a timeout or otherwise. The key is passed to the
 *    function
 *
 * options.update = function( key, callback ), where key is the lookup key
 *    and callback is a function that should be passed a single parameter,
 *    the value corresponding to key, or undefined if key has no
 *    corresponding value or if value can not be determined for any reason.
 *
 * options.updateBatch = function( keys, callback ), where keys is an array
 *    of keys to lookup in batch, and callback is a function that should be
 *    passed a single array, containing one entry for each key in the
 *    corresponding index in keys. Note: if this function is omitted, then
 *    batch lookups against the cache will fall back to multiple update
 *    calls in the background.
 *
 * @constructor
 */
var ASC = function( options ) {

	var self = this;

	self.storage = {};
	self.updateCallbacks = {};
	self.updateOptions( options );

};

/**
 * Update Options
 *
 * Updates the cache's options
 *
 * @param {object} [options] Configuration for the cache
 * @param {number ? 300000} [options.ttl] The number of milliseconds each
 *     key exist in the cache
 * @param {function} options.update A function used to update the cache one
 *     key at a time. Prototype defined below
 * @param {function} [options.updateBatch] A function used to update the
 *     cache in bulk. Prototype defined below
 * @param {function} [options.clear] A function called when a key is
 *    cleared, by a timeout or otherwise. The key is passed to the
 *    function
 *
 * options.update = function( key, callback ), where key is the lookup key
 *    and callback is a function that should be passed a single parameter,
 *    the value corresponding to key, or undefined if key has no
 *    corresponding value or if value can not be determined for any reason.
 *
 * options.updateBatch = function( keys, callback ), where keys is an array
 *    of keys to lookup in batch, and callback is a function that should be
 *    passed a single array, containing one entry for each key in the
 *    corresponding index in keys. Note: if this function is omitted, then
 *    batch lookups against the cache will fall back to multiple update
 *    calls in the background.
 *
 */
ASC.prototype.updateOptions = function( options ) {

	this.options = {
		ttl:         (options.ttl || 300000),
		update:      (options.update || null),
		updateBatch: (options.updateBatch || null),
		clear:       (options.clear || null)
	};

	if ( typeof this.options.ttl !== 'number' || this.options.ttl < 1000 ) {
		this.options.ttl = 1000;
	}

	if ( typeof this.options.update !== 'function' ) {
		this.options.update = null;
	}

	if ( typeof this.options.clear !== 'function' ) {
		this.options.clear = null;
	}

};

/**
 * Get Batch
 *
 * Gets the values for an array of keys all at once. Values are passed to
 * the callback as an array, each entry corresponding to the respective
 * entry in keys.
 *
 * @param {(string|number|Array|object)[]} keys An Array of keys, each of any
 *     primitive type and schema
 * @param {function(*[])} callback Will be passed the values that
 *     correspond to the passed in keys. Values return in the same order
 *     keys are passed
 *
 */
ASC.prototype.getBatch = function( keys, callback ) {

	if ( typeof callback !== 'function' ) {
		return;
	}

	callback = immediateCallback( callback );

	// handle edge case of no keys passed
	if ( !Array.isArray( keys ) || keys.length < 1 ) {

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

		keyString = stringifyKey( keys[ i ] );

		// hit on key
		if ( this._exists( keyString ) ) {
			data[ i ] = this._get( keyString );
		}

		// miss on key
		else {
			data[ i ] = undefined; // for now

			missedIndexes.push( i );
			missedKeys.push( keys[ i ] );
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
		var getBatchCallback = function( j ) {

			// generating another callback, so count it
			batchCallbacksOutstanding++;

			return function( value ) {

				data[ missedIndexes[ j ] ] = value;

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

			keyString = missedKeyStrings[ j ];

			// push a callback for the missed key, and if it does not already have an update underway, add it to the batch update call
			if ( self._pushUpdateCallback( keyString, getBatchCallback( j ) ) ) {

				batchMissedKeys.push( missedKeys[ j ] );
				batchMissedKeyStrings.push( keyString );

			}

		}

		process.nextTick( function() {

			// of the cache misses, batchMissedKeys did not already have an update in progress, so we need to update them in batch here
			self.options.updateBatch( batchMissedKeys, function( data ) {

				// if the update function does not provide an array, clamp
				if ( !Array.isArray( data ) ) {
					data = [];
				}

				// set the data in the cache, then trigger the callbacks
				for ( k = 0; k < batchMissedKeyStrings.length; k++ ) {

					//  new data should have one entry per key
					if ( data.length - 1 < k ) {
						data.push( undefined );
					}

					self._set( batchMissedKeyStrings[ k ], data[ k ] );

				}

			} );

		} );
	}

	// case of not all keys had a hit, and there is NOT a batch update
	else {

		var oneByOneLookups = [];

		var pushLookup = function( j ) {

			// queue up parallel call
			oneByOneLookups.push( function( callback ) {

				// lookup missed key j
				self.get( missedKeys[ j ], function( value ) {

					// put the data where it needs to be
					data[ missedIndexes[ j ] ] = value;

					// tell async this function is done
					callback( null, true );

				} );

			} );

		};

		for ( j = 0; j < missedIndexes.length; j++ ) {

			// push lookup for missed data index j
			pushLookup( j );

		}

		async.parallel( oneByOneLookups, function() {
			callback( data );
		} );
	}

};

/**
 * Get
 *
 * Gets the value for a single key.
 *
 * @param {string|number|Array|object} key A key used to identify the value
 * @param {function(*)} callback Will be passed the value corresponding to
 *    the key
 *
 */
ASC.prototype.get = function( key, callback ) {

	if ( typeof callback !== 'function' ) {
		return;
	}

	callback = immediateCallback( callback );

	var self = this;
	var keyString = stringifyKey( key );

	// the desired value exists, fire!
	if ( this._exists( keyString ) ) {
		callback( this._get( keyString ) );
	}

	// store the callback, and if this is the first request to come in for this key then we kick off the update
	else if ( self._pushUpdateCallback( keyString, callback ) ) {

		process.nextTick( function() {

			// run the update function
			if ( typeof self.options.update === 'function' ) {

				self.options.update( key, function( value ) {

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

};

/**
 * Clear Entry
 *
 * Clears the specified cache entry. If a clear() callback is configured in
 * the options, it will fire.
 *
 * @param {string|number|Array|object} key The key identifying the entry to
 *     delete
 *
 */
ASC.prototype.clear = function( key ) {

	return this._clear( stringifyKey( key ) );

};

/**
 * Clear All
 *
 * Clears all keys from cache. IF a clear() callback is configured in the
 * options, it will fire once for each key.
 *
 */
ASC.prototype.clearAll = function() {

	for ( var keyString in this.storage ) {
		if ( this.storage.hasOwnProperty( keyString ) ) {
			this._clear( keyString );
		}
	}

};

/**
 * Set Entry
 *
 * Sets the specified value for the specified key
 *
 * @param {string|number|Array|object} key The key identifying the entry to set
 * @param {string|number|Array|object} value The value of the entry to set
 *
 */
ASC.prototype.set = function( key, value ) {

	return this._set( stringifyKey( key ), value );

};

/**
 * Key Exists
 *
 * See if the specified key exists in the cache.
 *
 * @param {string|number|Array|object} key The key identifying the entry to set
 * @return {boolean} True if the key exists in the cache, false otherwise
 *
 */
ASC.prototype.exists = function( key ) {

	return this._exists( stringifyKey( key ) );

};

/* --- private functions --- */

ASC.prototype._clear = function( keyString ) {

	if ( this._exists( keyString ) ) {

		// clear any existing timeout
		if ( this.storage[ keyString ].timeout ) {
			clearTimeout( this.storage[ keyString ].timeout );
		}

		// if a clear event handler exists
		if ( typeof this.options.clear === 'function' ) {

			immediateCallback( this.options.clear )( parseKeyString( keyString ) );

		}

		// delete the entire entry
		delete this.storage[ keyString ];

	}

};

ASC.prototype._exists = function( keyString ) {

	return this.storage.hasOwnProperty( keyString );

};

ASC.prototype._get = function( keyString ) {

	if ( this._exists( keyString ) ) {
		return this.storage[ keyString ].value;
	}

	return undefined;

};

ASC.prototype._set = function( keyString, value ) {

	var self = this;

	// empty values are indicated by undefined, their TTL is the minimum
	var overrideTTL = value === undefined ? 1000 : false;

	// remove existing timeouts and data
	self._clear( keyString );

	// set new value
	self.storage[ keyString ] = {
		value:   value,
		timeout: setTimeout( function() {

			// timeout fired, clear this entry
			self._clear( keyString );

		}, overrideTTL || self.options.ttl )
	};

	// let everyone know the value is here
	self._triggerCallbacks( keyString, value );

};

ASC.prototype._pushUpdateCallback = function( keyString, callback ) {

	// if no updated pending, we are the first request and the callback stack will not exist
	if ( !Array.isArray( this.updateCallbacks[ keyString ] ) ) {
		this.updateCallbacks[ keyString ] = [];
	}

	// we use a callback array, so that if multiple requests come in for the same key before the first callback is
	// serviced, all the callbacks can share the single response
	this.updateCallbacks[ keyString ].push( callback );

	// if this is the first callback, then caller is responsible for starting update, so return TRUE, otherwise, return false
	return ( this.updateCallbacks[ keyString ].length === 1 );

};

ASC.prototype._triggerCallbacks = function( keyString, value ) {

	if ( !Array.isArray( this.updateCallbacks[ keyString ] ) ) {
		return false;
	}

	var callbacks = this.updateCallbacks[ keyString ];

	// the callbacks array is no longer needed
	delete this.updateCallbacks[ keyString ];

	// fire callbacks
	for ( var i = 0, j = callbacks.length; i < j; i++ ) {

		if ( typeof callbacks[ i ] === 'function' ) {
			setImmediate( callbacks[ i ], value );
		}

	}

	return true;

};

module.exports = ASC;

/* --- static private methods (sorta) --- */

function immediateCallback( callback ) {
	return function( value ) {
		setImmediate( function() {
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
