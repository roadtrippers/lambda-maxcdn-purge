# lambda-maxcdn-purge
A Lambda function that purges a resource from MaxCDN when an S3 event occurs

## Set up
1. Clone this repo
2. Add your config settings to `config/local.json`.
3. Run `npm run build`
4. Upload the zip to AWS Lambda (should be in `build/`)

## Config
The `default.json` shows you most fields that need to be filled:
```json
{
  "maxcdn": {
    "company_alias": "",
    "key": "",
    "secret": ""
  },
  "zone_map": [],
  "purge_timeout": 120
}
```
The `zone_map` field should be an array of objects with keys `bucket`, the name of the S3 bucket, and `zone_id`, the ID of the MaxCDN pull zone. These values map an event received from an S3 bucket to a particular zone. This allows you to build this function once for multiple bucket/zone pairs without changing the config. The `purge_timeout` field is the amount of time in seconds to wait for the API call. If the amount of time passes, or another error occurs, it will call `context.fail()`.

### Full example configuration
```json
{
  "maxcdn": {
    "company_alias": "acme",
    "key": "acme_key",
    "secret": "acme_secret"
  },
  "zone_map": [
    {
      "bucket": "my-s3-bucket",
      "zone_id": 123
    },
    {
      "bucket": "my-special-s3-bucket",
      "zone_id": 456
    }
  ],
  "purge_timeout": 120
}
```

## License
MIT
