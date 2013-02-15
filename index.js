"use strict";

var ASC = require( './ASC.js' );
var caches = {};

module.exports.clear = function ( name ) {

	if ( caches[name] ) {
		caches[name].clearAll();
		delete caches[name];
	}

};

module.exports.getCache = function ( name, options ) {

	// cache does not exist, create it
	if ( !caches[name] ) {
		if ( !options ) {
			options = {};
		}
		caches[name] = new ASC( options );
	}

	// cache exists and new options passed, update the options
	else if ( options !== undefined ) {
		caches[name].updateOptions( options );
	}

	// return the cache
	return caches[name];

};

