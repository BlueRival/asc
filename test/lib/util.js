'use strict'

const util = require( '../../lib/util' );

module.exports = {
  marshallKey: util.marshallKey,
  unmarshallKey: util.unmarshallKey,
  /**
   * /**
   * Generates a test layer that uses in-memory storage. There is no timeout, and values don't go away unless you clear
   * them.
   *
   * @param returnError If this is an instance of Error, any call to get, set or clear will return that error.
   * @returns {{
   *  set: function(key, data, done),
   *  get: function(key, done),
   *  clear: function(key, done),
   *  clearCount: number,
   *  getCount: number,
   *  setCount: number,
   *  storage: {},
   *  }}
   */
  testLayer: function ( returnError = false ) {

    const layer = {
      storage: {},
      getCount: 0,
      setCount: 0,
      clearCount: 0,
      get: ( key, done ) => {

        layer.getCount++;

        if ( returnError ) {
          return done( returnError );
        }

        key = util.marshallKey( key );

        if ( layer.storage.hasOwnProperty( key ) ) {
          done( null, layer.storage[ key ] );
        } else {
          done( new Error( 'not found' ) );
        }

      },
      set: ( key, data, done ) => {

        layer.setCount++;

        if ( returnError ) {
          return done( returnError );
        }

        layer.storage[ util.marshallKey( key ) ] = data;

        done();

      },
      clear: ( key, done ) => {

        layer.clearCount++;

        if ( returnError ) {
          return done( returnError );
        }

        delete layer.storage[ util.marshallKey( key ) ];

        done();

      }
    };

    return layer;

  }
};
