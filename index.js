console.log('Initializing: lambda-maxcdn-purge');

const config = require('config');
const maxcdn = require('maxcdn').create(
  config.get('maxcdn.company_alias'),
  config.get('maxcdn.key'),
  config.get('maxcdn.secret')
);

module.exports.handler = function(event, context){};
