"use strict";

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
    this._timeout = config.get('purge_timeout');
    this._zones = config.get('zone_map');
  }

  /**
   * @param record
   * @returns {Promise}
   */
  purge(record)
  {
    if (!('s3' in record))
    {
      return Promise.reject(new Error('Record has no s3 data'));
    }

    let map = this._zones.find(map => map.bucket == record.s3.bucket.name);

    if (!map)
    {
      return Promise.reject(new Error('Bucket not mapped to zone'));
    }

    let files = [ `/${record.s3.object.key}` ];
    let self = this;

    return new Promise(function(resolve, reject)
    {
      let timeout = setTimeout(function()
      {
        reject(new Error(`Purge timed out after ${self._timeout} seconds`));
      }, self._timeout * 1000);

      self._api.del(`zones/pull.json/${map.zone_id}/cache`, { files }, function(err, results)
      {
        clearTimeout(timeout);
        
        if (err)
        {
          reject(err);
          return;
        }

        resolve(results);
      });
    });
  }
}

module.exports = Purger;
