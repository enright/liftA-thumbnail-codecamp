module.exports = function (s3Config, logger) {
  'use strict';
  let fs = require('fs');
  let s3a = require('lifta-s3')(s3Config);

  // set up parameters for s3 put of rendered image
  function reqParamsPutThumb(x) {
    let first = x.first,
      second = x.second;
    logger.debug('reqParamsPutThumb pngFileName: %s \n\tbucket: %s \n\temblemid: %s', first.pngFileName, second.thumbnailBucket, second.emblemid);
    let readStream = fs.createReadStream(first.pngFileName);
    return [{
      Bucket: second.thumbnailBucket,
      Key: second.emblemid + '.png',
      Body: readStream,
      ACL: 'public-read',
      CacheControl: 'no-cache'
    }, second];
  }

  // an arrow that will put the thumbnail image to s3
  let putThumbnail = reqParamsPutThumb.then(s3a.putObjectA.first.promoteError);

  return {
    putThumbnail: putThumbnail
  };
};