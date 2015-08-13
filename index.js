'use strict';

var ASC = require( './lib/asc.js' );
var caches = {};

/**
 * ASC Class
 *
 * Create stand alone (not shared) instances of ASC
 *
 * @type {ASC} The cache class
 */
module.exports = ASC;

/**
 * Clear Cache
 *
 * Removes a cache from the factory inventory. External references to the cache
 * will persist, but the cache will be emptied.
 *
 * @param {string} name The name of the cache to clear and remove from inventory
 */
module.exports.clear = function( name ) {

	if ( caches[ name ] ) {
		caches[ name ].clearAll();
		delete caches[ name ];
	}

};

/**
 * Get Cache
 *
 * Returns a cache instance identified by name.
 *
 * @param {string} name The name of the cache to return
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
 * @return {ASC} A cache instance
 */
module.exports.getCache = function( name, options ) {

	// cache does not exist, create it
	if ( !caches[ name ] ) {
		if ( !options ) {
			options = {};
		}
		caches[ name ] = new ASC( options );
	}

	// cache exists and new options passed, update the options
	else if ( options !== undefined ) {
		caches[ name ].updateOptions( options );
	}

	// return the cache
	return caches[ name ];

};

