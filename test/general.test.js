'use strict';

const ASC = require( '../' );
const assert = require( 'assert' );
const util = require( './util' );

describe( 'General', function () {

  it( 'should instantiate', function ( done ) {

    try {

      const params = {
        layers: [
          {
            get: ( key, data, done ) => {

            }
          }
        ]
      };

      new ASC( params );

    } catch ( e ) {
      return done( e );
    }

    done();

  } );

  it( 'should add shortcut get just like it was an explicitly defined layer, with explicit layers, memory enabled',
    function ( done ) {

      // these will cache miss, just like internal memory storage in ASC
      const layer1 = util.testLayer();
      const layer2 = util.testLayer( new Error( 'test error' ) );
      const layer3 = util.testLayer();

      const get = ( key, done ) => {
        done( null, new Date().toISOString() );
      };

      const params1 = {
        memory: {
          disabled: true
        },
        layers: [
          layer1,
          layer2,
          layer3,
          {
            get: get
          }
        ]
      };
      const params2 = {
        memory: {
          disabled: true
        },
        layers: [
          layer1,
          layer2,
          layer3
        ],
        get: get
      };

      const asc1 = new ASC( params1 );
      const asc2 = new ASC( params2 );

      // converts the set layers array of functions to a string of the source code for each function
      const getLayersString = ( asc ) => {
        return JSON.stringify( asc._getLayers.map( layer => layer.toString() ), null, 4 );
      };

      try {

        assert.strictEqual( getLayersString( asc2 ), getLayersString( asc1 ), 'layers should be the same' );

      } catch ( e ) {
        return done( e );
      }

      done();

    } );

  it( 'should add shortcut get just like it was an explicitly defined layer, with no explicit layers',
    function ( done ) {

      const get = ( key, done ) => {
        done( null, new Date().toISOString() );
      };

      const params1 = {
        memory: {
          disabled: false
        },
        layers: [
          {
            get: get
          }
        ]
      };

      const params2 = get;
      const params3 = {
        get: get
      };

      const asc1 = new ASC( params1 );
      const asc2 = new ASC( params2 );
      const asc3 = new ASC( params3 );

      // converts the set layers array of functions to a string of the source code for each function
      const getLayersString = ( asc ) => {
        return JSON.stringify( asc._getLayers.map( layer => layer.toString() ), null, 4 );
      };

      try {

        assert.strictEqual( getLayersString( asc2 ), getLayersString( asc1 ), 'layers should be the same' );
        assert.strictEqual( getLayersString( asc3 ), getLayersString( asc1 ), 'layers should be the same' );

      } catch ( e ) {
        return done( e );
      }

      done();

    } );

} );
