ASC (pronounced "ASK")
========

A middleware layer between a service and a client. The service could be an
in-process library, a file, an external web service, anything. Any time the
results from a resource call can be cached, you can use ASC as a proxy to that
resource.


Why use it?
========

ASC is a good solution to cache data returned from a service if the following
criteria can be met:

* The service being consumed can be proxied to serve up data in this design
pattern:

```js
        ascInstance.get( key, function( value ) {
        	// handle the value here
        } );
```

OR

```js
        ascInstance.getBatch( keys, function( values ) {
        	// handle the values here, in same order as respective keys
        } );
```
* Your returned values can be cached for some TTL >= 1000 ms.


Features
========

* Cache with a TTL (minimum 1000 milliseconds)
* Update function used to re-populate on cache-miss
* Batch update function used to re-populate a set of keys on cache-miss (batch
operations must be supported by the service consumed)
* Request de-duplication
* Shared cache instances between modules/libraries/etc
* Complex keys, including arrays and primitive objects


Create Instance
========

The ASC module exports the cache class. This is useful for creating caches that
you do not want to share system wide.

```js
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
	var ASC = require( 'asc' );
	var profileCache = new ASC( [options] );
```

Factory
========

You can also use the ASC module as a factory and shared cache store, using the
getCache() method on the asc module.

```js
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
	 * @return {ASC} An instance of the ASC cache
	 */
	var profileCache = require( 'asc' ).getCache( name, [options] );
```

Example
========

Lets pretend you have a server that handles profiles, and it has a web service
for looking up profiles which returns JSON. Lets also say that profile server
takes 250ms to service a request. Lets also assume profiles can be up to 5
minutes old in your system to meet business requirements. The following code is
one way you could cache the profile lookups.

```js

// first, create your cache instance. if the cache was already created
// elsewhere, and you simply need access to it, replace this block with:
// var profileCache = require( 'asc' ).getCache( 'user.profile' );
var profileCache = require( 'asc' ).getCache( 'user.profile', {

	// milliseconds to cache data ( 5 minutes ). minimum is 1000ms
	ttl:    300000,

	// when a .get( key, callback ) call results in a cache-miss, this function
	// is called to update that cache entry
 	update: function( username, callback ) {

		request( {
			url: "http://profile-server.mydomain.com/user/" + username
		},
		function( err, result ) {
			if ( err ) {

				// if a cache entry can not be populated, undefined should be
				// returned
				callback( undefined );
			}
			else {
				callback( JSON.parse( result.body ) );
			}
		} );

	},

	// when a .getBatch( keys, callback ) call results in cache-misses for any
	// of the keys, this function is called to to update those cache entries
	updateBatch: function ( usernames, callback ) {

		request( {
			url: "http://profile-server.mydomain.com/users/" +
				usernames.join( ',' );
		},
		function( err, result ) {
			if ( err ) {
				callback( undefined );
			}
			else {

				// assumes service returns profiles in same order usernames
				// passed to request
				callback( JSON.parse( result.body ) );

			}
		} );

	}

} );

// now do all the profile lookups you want

// cache miss, triggers call to user update function for next three gets
profileCache.get( 'anthony', function( profile ) {
    console.log(value);
} );
profileCache.get( 'suzanne', function( value ) {
    console.log(value);
} );
profileCache.get( 'jackson', function( value ) {
    console.log(value);
} );

// good chance the first request for suzanne is not yet serviced, but this get
// does NOT trigger a second call to the profile server. This call to get will
// queue up and receive the same data that is passed to the first get for
// suzanne
profileCache.get( 'suzanne', function( value ) {
    console.log( value );
} );

// the cache will already have anthony and jackson in the cache (or at least an
// outstanding update) which can be used to service those keys, but lilly and
// landon have no existing entry or outstanding update. The updateBatch()
// function will get called with keys [ 'lilly', 'landon' ] instead of all four.
// This prevents the service provider from having to search for as much data,
// and typically this will reduce the servicing time.
profileCache.getBatch( [ 'anthony', 'jackson', 'lilly', 'landon' ],
	function ( values ) {
		console.log( values );
	} );

// this will not trigger a call to update, instead it will get data when the
// previous batch call finishes its update on [ 'lilly', 'landon' ].
profileCache.get( 'lilly', function( value ) {
    console.log( value );
} );

```

Some things to notice from the example. The name of the cache we returned from
the cache factory, user.profile, is a singleton. If any other module does a
getCache on that cache name, they will get the same cache, thereby allowing
different modules to benefit from the same data cache for that resource. Also
note that passing a configuration object is optional. On your first getCache,
you must pass the options with an update function, but subsequent calls can
simply be require( 'asc' ).getCache( 'user.profile' );


License
========

(The MIT License)

Copyright (c) 2015 BlueRival Software <anthony@bluerival.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the 'Software'), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

