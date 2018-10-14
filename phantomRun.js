// dir is directory containing
module.exports = function (js, logger) {
  'use strict';
  let child_process = require('child_process');
  require('lifta-syntax');
  let phantom = require('phantomjs-prebuilt');

  // set parameters to prepare for phantom exec
  function preparePhantom(x) {
    let phantomSpec = {
      htmlFileName: x.fileName,
      pngFileName: x.fileName + '.png',
      png_width: x.png_width || 400,
      png_height: x.png_height || 400
    };
    logger.debug('preparePhantom phantomSpec: %j', phantomSpec);
    return phantomSpec;
  }

  // arrow to run the phantom process
  let phantomCreatePNG = (x, cont, p) => {
    let cancelId;
    let childArgs = [js, x.htmlFileName, x.pngFileName,
      x.png_width, x.png_height
    ];
    logger.debug('phantomCreatePNGA childArgs: %j', childArgs);

    let cp = child_process.execFile(phantom.path, childArgs, function (err, stdout, stderr) {
      p.advance(cancelId);
      if (err) {
        logger.error('phantomCreatePNGA child process error: %j', err);
        err.x = x;
        cont(err, p);
      } else {
        let newx = {
          pngFileName: x.pngFileName,
          stdout: stdout
        };
        logger.debug('phantomCreatePNGA success x: %j', newx);
        cont(newx, p);
      }
    });
    cp.stdout.on('data', (data) => {
      logger.debug('phantom %s', `stdout: ${data}`);
    });

    cp.stderr.on('data', (data) => {
      logger.debug('phantom %s', `stderr: ${data}`);
    });

    cancelId = p.add(() => cp.kill('SIGKILL'));
    return cancelId;
  };

  // when phantom completes, push the png file into the temp file list
  function phantomResults(x) {
    let pngFileName = x.first.pngFileName;
    logger.debug('phantomResults pngFileName: %s', pngFileName);
    if (pngFileName !== undefined) {
      x.second.tempFiles.push(pngFileName);
    }
    return x;
  }

  let phantomRun = preparePhantom.then(phantomCreatePNG).first.promoteError
    .then(phantomResults.barrier);

  return {
    preparePhantom: preparePhantom,
    phantomCreatePNG: phantomCreatePNG,
    phantomResults: phantomResults,
    phantomRun: phantomRun
  };

};