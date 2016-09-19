"use strict";

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');

chai.should();
chai.use(chaiAsPromised);
chai.use(sinonChai);

const Purger = require('../lib/purger');

describe('Purger', function()
{
  let purger, api, config;
  
  beforeEach(function()
  {
    api = { del: function(){} };
    config = { get: function(){}, has: function(){} };
    purger = new Purger(api, config);
  });
  
  describe('#validate()', function()
  {
    it('should reject when missing bucket name', function()
    {
      return purger.validate({
        s3: {
          object: { key: 'test' }
        }
      }).should.eventually.be.rejectedWith(Error, "Invalid record structure, missing 's3.bucket.name'");
    });
    
    it('should reject when missing object key', function()
    {
      return purger.validate({
        s3: {
          bucket: { name: 'test' }
        }
      }).should.eventually.be.rejectedWith(Error, "Invalid record structure, missing 's3.object.key'");
    });
    
    it('should reject for missing zone configuration', function()
    {
      let configHas = sinon.stub(config, 'has');
      configHas.onFirstCall().returns(false);
      
      let validate = purger.validate({
        s3: {
          bucket: {
            name: 'test'
          },
          object: {
            key: 'test'
          }
        }
      });

      configHas.should.have.been.calledWith('zone_map');
      configHas.should.not.have.been.calledWith('purge_timeout');
      
      return validate.should.eventually.be.rejectedWith(Error, "Invalid configuration for 'zone_map'");
    });
    
    it('should reject for missing timeout configuration', function()
    {
      let configHas = sinon.stub(config, 'has');
      configHas.onFirstCall().returns(true);
      configHas.onSecondCall().returns(false);
      
      let validate = purger.validate({
        s3: {
          bucket: {
            name: 'test'
          },
          object: {
            key: 'test'
          }
        }
      });
      
      configHas.should.have.been.calledWith('zone_map');
      configHas.should.have.been.calledWith('purge_timeout');
      
      return validate.should.eventually.be.rejectedWith(Error, "Invalid configuration for 'purge_timeout'");
    });
    
    it('should reject when no map for bucket', function()
    {
      let configHas = sinon.stub(config, 'has');
      configHas.onFirstCall().returns(true);
      configHas.onSecondCall().returns(true);
      
      let configGet = sinon.stub(config, 'get');
      configGet.onFirstCall().returns([
        {
          bucket: 'not_test',
          zone_id: 123
        },
        {
          bucket: 'not_test2',
          zone_id: 456
        }
      ]);
      
      return purger.validate({
        s3: {
          bucket: {
            name: 'test'
          },
          object: {
            key: 'test'
          }
        }
      }).should.eventually.be.rejectedWith(Error, 'Bucket not mapped to zone');
    });
    
    it('should resolve with proper data', function()
    {
      let configHas = sinon.stub(config, 'has');
      configHas.onFirstCall().returns(true);
      configHas.onSecondCall().returns(true);
      
      let configGet = sinon.stub(config, 'get');
      configGet.onFirstCall().returns([
        {
          bucket: 'test',
          zone_id: 123
        }
      ]);
      configGet.onSecondCall().returns(120);
      
      return purger.validate({
        s3: {
          bucket: {
            name: 'test'
          },
          object: {
            key: 'test/file.dat'
          }
        }
      }).should.eventually.become({
        zoneId: 123,
        timeout: 120,
        files: [ '/test/file.dat' ]
      });
    });
  });
  
  describe('#purge()', function()
  {
    it('should pass through validation errors', function()
    {
      let validate = sinon.stub(purger, 'validate');
      validate.onFirstCall().returns(Promise.reject('test'));
      
      let purge = purger.purge('data');
      validate.should.have.been.calledWith('data');
            
      return purge.should.eventually.be.rejectedWith('test');
    });
    
    it('should reject on api errors', function()
    {
      let validate = sinon.stub(purger, 'validate');
      validate.onFirstCall().returns(Promise.resolve({
        zoneId: 123,
        timeout: 120,
        files: [ '/test/file.dat' ]
      }));
      
      let del = sinon.stub(api, 'del', function(path, files, callback)
      {
        path.should.equal(`zones/pull.json/123/cache`);
        files.should.deep.equal({
          files: [ '/test/file.dat' ]
        });
        callback.should.be.a('function');

        callback('test error');
      });
      
      return purger.purge('data').should.eventually.be.rejectedWith('test error');
    });
    
    it('should reject on timeout', function()
    {
      let validate = sinon.stub(purger, 'validate');
      validate.onFirstCall().returns(Promise.resolve({
        zoneId: 123,
        timeout: 0.01,
        files: [ '/test/file.dat' ]
      }));
      
      let del = sinon.stub(api, 'del', function(path, files, callback)
      {
        path.should.equal(`zones/pull.json/123/cache`);
        files.should.deep.equal({
          files: [ '/test/file.dat' ]
        });
        callback.should.be.a('function');
        
        // don't call callback
      });
      
      return purger.purge('data').should.eventually.be.rejectedWith(Error, `Purge timed out after 0.01 seconds`);
    });
    
    it('should resolve with results', function()
    {
      let validate = sinon.stub(purger, 'validate');
      validate.onFirstCall().returns(Promise.resolve({
        zoneId: 123,
        timeout: 120,
        files: [ '/test/file.dat' ]
      }));
      
      let del = sinon.stub(api, 'del', function(path, files, callback)
      {
        path.should.equal(`zones/pull.json/123/cache`);
        files.should.deep.equal({
          files: [ '/test/file.dat' ]
        });
        callback.should.be.a('function');

        callback(null, 'results');
      });
      
      return purger.purge('data').should.eventually.equal('results');
    });
  });
});
