ASC (pronounced "ASK")
========

A middleware layer between a service and a client. The service could be an in-process library, a file, an external web service, anything. Any time the results from a resource call can be cached, you can use ASC as a proxy to that resource.


Why use it?
========

ASC is a good solution to cache data returned from a service if the following criteria can be met:

* Your request function can be proxied to serve up data in this design pattern:
```js
        ascInstance( key, function( value ) {
        	// handle the value here
        } );
```
* Your returned values can be cached for some TTL >= 1000 ms.

Note: you don't need to have an update function at all. You can simply use the cache as a TTL cache where a TTL >=
1000 ms is acceptable. Simply omit the updateFunc param from the options passed to the .get( name, options ) method.


Features
========

* Cache with a TTL (minimum 1000 milliseconds)
* Update function used to repopulate on cache-miss
* Request de-duplication. If multiple requests come in for a key that is not in the cache, only one call to the update function will be made, and all requests will be serviced by the single response
* Shared instances. If you use the same cache instance name in multiple places in your application, they will share data.
* Complex keys. Use anything as a key, a string (of course), a number (double of course), an array, an object, anything that can be JSON serialized.

Soon to come:

* Batch key requests. If the service you are querying supports batch requests, you will be able to make a single call to the ASC for multiple keys all at once.


Example
========

Lets pretend you have a server that handles profiles, and it has a web service for looking up profiles which returns JSON. Lets also say that profile server takes 250ms to service a request. Lets also assume profiles can be up to 5 minutes old in your system to meet business requirements. The following code is one way you could cache the profile lookups.

```js

var profileCache = require( 'asc' ).get( 'user.profile', {

	ttl:    300000, // milliseconds to cache data. minimum is 1000ms
 	update: function( username, callback ) {

		request( {
			url: "http://profile-server.mydomain.com/" + username
		},
		function( result ) {
			callback( JSON.parse(result.body) );
		} );

	}

} );

// now do all the profile lookups you want

// cache miss, triggers updates for next three gets
cache.get( 'anthony', function( profile ) {
    console.log(value);
} );
cache.get( 'suzanne', function( value ) {
    console.log(value);
} );
cache.get( 'jackson', function( value ) {
    console.log(value);
} );

// good chance the first request for suzanne is not yet serviced, but this get does NOT trigger a second call to the profile server. This call to get will queue up and receive the same data that is passed to the first get for suzanne
cache.get( 'suzanne', function( value ) {
    console.log( value );
} );

```

Some things to notice from the example. The name of the cache we returned from the cache factory, user.profile, is a singleton. If any other module does a getCache on that cache name, they will get the same cache, thereby allowing different modules to benefit from the same data cache for that resource. Also note, that passing a configuration object is optional. If you want a self-updating cache, you must pass the options with an update function once, but subsequent calls can simply be require( 'asc' ).getCache( 'user.profile' );


License
========

(The MIT License)

Copyright (c) 2012 BlueRival Software <anthony@bluerival.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

