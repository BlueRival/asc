"use strict";

var cache = module.exports = function ( options ) {

	this.storage = {};
	this.updateCallbacks = {};
	this.updateOptions( options );

};

cache.prototype.updateOptions = function ( options ) {

	this.options = {
		ttl:    (options.ttl || 300000),
		update: (options.update || null),
		clear:  (options.clear || null)
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

cache.prototype.get = function ( key, callback ) {

	var keyString = makeKeyString( key );

	var processCallback = function ( callback, value ) {
		process.nextTick( function () {
			callback( value );
		} );
	};

	// the desired value exists, fire!
	if ( this.storage.hasOwnProperty( keyString ) ) {
		processCallback( callback, this.storage[keyString].value );
	}

	// the desired value doesn't exist, but an update function does
	else if ( typeof this.options.update === 'function' ) {

		if ( !this.updateCallbacks[keyString] ) {
			this.updateCallbacks[keyString] = [];
		}

		// we use a callback array, so that if multiple requests come in for the same key before the first callback is
		// serviced, all the callbacks can share the single response
		this.updateCallbacks[keyString].push( callback );

		var self = this;

		// if this is the first request to come in for this key then we kick off the update
		if ( this.updateCallbacks[keyString].length === 1 ) {

			process.nextTick( function () {
				self.options.update( key, function ( value ) {

					// when the value comes back, cache it
					self.set( keyString, value );

					// fire callbacks
					for ( var i = 0; i < self.updateCallbacks[keyString].length; i++ ) {

						// re-scope callback variable
						processCallback( self.updateCallbacks[keyString][i], value );

					}

					// the callbacks are no longer needed here
					delete self.updateCallbacks[keyString];

				} );

			} );

		}

		// no value, no update function
		else {
			processCallback( callback, undefined );
		}

	}

};

cache.prototype.clear = function ( key ) {

	var keyString = makeKeyString( key );

	if ( this.storage.hasOwnProperty( keyString ) ) {

		// clear any existing timeout
		if ( this.storage[keyString].timeout ) {
			clearTimeout( this.storage[keyString].timeout );
		}

		// if a clear event handler exists
		if ( typeof this.options.clear === 'function' ) {

			var self = this;

			process.nextTick( function () {
				self.options.clear( key );
			} );

		}

		// delete the entire entry
		delete this.storage[keyString];

	}

};

cache.prototype.set = function ( key, value ) {

	var self = this;
	var keyString = makeKeyString( key );

	var overrideTTL = false;

	// empty values indicated by undefined, their TTL is the minimum
	if ( value === undefined ) {
		overrideTTL = 1000;
	}

	// remove existing timeouts and data
	this.clear( keyString );

	// set new value
	this.storage[keyString] = {
		value:   value,
		timeout: setTimeout( function () {

			// timeout fired, clear this entry
			self.clear( key );

		}, overrideTTL || this.options.ttl )
	};

};

cache.prototype.clearAll = function () {

	for ( var keyString in this.storage ) {
		if ( this.storage.hasOwnProperty( keyString ) ) {
			this.clear( keyString );
		}
	}

};

function makeKeyString( key ) {

	return JSON.stringify( key );

}
