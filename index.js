"use strict";
console.log('Initializing: lambda-maxcdn-purge');

// Imports
const config = require('config');
const MaxCDN = require('maxcdn');
const Purger = require('./lib/purger');

// Instances
const purger = new Purger(new MaxCDN(
  config.get('maxcdn.company_alias'),
  config.get('maxcdn.key'),
  config.get('maxcdn.secret')
), config);

module.exports.handler = function(event, context)
{
  Promise.all(event.Records.map(function(record) 
  { 
    return purger.purge(record)
      .then(
        results => { console.log(`Successfully purged '${results.pop()}'`) }, 
        error => { console.error(error) }
      ); 
  }))
    .then(
      () => { context.succeed() }, 
      () => { context.fail() }
    );
};
