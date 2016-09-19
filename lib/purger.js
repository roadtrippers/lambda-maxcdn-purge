"use strict";
const schema = require('validate')(require('../config/validation'));

/**
 * CDN Purger
 */
class Purger 
{
  /**
   * @param api
   * @param config
   */
  constructor(api, config)
  {
    this._api = api;
    this._config = config;
  }

  /**
   * @param record
   * @returns {*}
   */
  validate(record)
  {
    let errors = schema.validate(record);

    if (errors.length)
    {
      return Promise.reject(new Error(`Invalid record structure, missing '${errors.shift().path}'`));
    }

    if (!this._config.has('zone_map'))
    {
      return Promise.reject(new Error(`Invalid configuration for 'zone_map'`));
    }

    if (!this._config.has('purge_timeout'))
    {
      return Promise.reject(new Error(`Invalid configuration for 'purge_timeout'`));
    }

    let map = this._config.get('zone_map').find(map => map.bucket == record.s3.bucket.name);

    if (!map)
    {
      return Promise.reject(new Error('Bucket not mapped to zone'));
    }
    
    return Promise.resolve({
      zoneId: map.zone_id,
      timeout: this._config.get('purge_timeout'),
      files: [ `/${record.s3.object.key}` ]
    });
  }

  /**
   * @param record
   * @returns {Promise}
   */
  purge(record)
  {
    return this.validate(record)
      .then((data) =>
      {
        return new Promise((resolve, reject) =>
        {
          let timeoutId = setTimeout(() =>
          {
            reject(new Error(`Purge timed out after ${data.timeout} seconds`));
          }, data.timeout * 1000);

          this._api.del(`zones/pull.json/${data.zoneId}/cache`, { files: data.files }, 
            function(err, results)
            {
              clearTimeout(timeoutId);
  
              if (err)
              {
                reject(err);
                return;
              }
  
              resolve(results);
            });
        });
      });
  }
}

module.exports = Purger;
