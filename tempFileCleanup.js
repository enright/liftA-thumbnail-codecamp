module.exports = function (logger) {
  'use strict';
  // delete files
  let unlinkFiles = ((fs, files) => {
    let cb = e => {
        if (e) {
          logger.error('unlinkFiles %j', e);
        }
      },
      unlink = f => {
        if (f) {
          // default error handler throws, a callback lets us receive error and log
          fs.unlink(f, cb);
        }
      };
    files.forEach(unlink);
  }).bind(undefined, require('fs'));

  // will be lifted to arrow for file cleanup
  function tempFileCleanup(x) {
    let tempfiles = (x && x.tempFiles) || [];
    logger.debug('cleanupTempFiles %j', tempfiles);
    unlinkFiles(tempfiles);
    return x;
  }

  return {
    tempFileCleanup: tempFileCleanup
  };
};