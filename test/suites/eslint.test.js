'use strict';

const glob = require( 'glob' );
const CLIEngine = require( 'eslint' ).CLIEngine;
const assert = require( 'assert' );

// build a list of all files to check
const paths = [].concat(
  glob.sync( process.cwd() + '/*.js' ),
  glob.sync( process.cwd() + '/lib/**/*.js' ),
  glob.sync( process.cwd() + '/test/**/*.js' )
);

// instantiate ESLint Engine, use .eslintrc.json file (which your IDE should also use to inspect code while you work)
let engine = null;

function generateTest( path ) {

  it( `should validate ${path}`, function () {

    assert( engine, 'ESLint Engine not created' );

    // check all the files
    const results = engine.executeOnFiles( [ path ] ).results;

    const messages = results[ 0 ].messages;

    if ( messages.length > 0 ) {
      assert.fail( formatMessages( path, messages ) );
    }
  } );

}

function formatMessages( path, messages ) {

  const errors = messages.map( ( message ) => {
    return `${path}: ${message.line}:${message.column} ${message.message.slice( 0, -1 )} - ${message.ruleId}\n`;
  } );

  return `\n${errors.join( '' )}`;

}

// generate tests for each file found
describe( 'ESLint', function () {

  engine = new CLIEngine( {
    envs: [ 'node', 'mocha' ],
    useEslintrc: true
  } );

  paths.forEach( path => generateTest( path ) );

} );
