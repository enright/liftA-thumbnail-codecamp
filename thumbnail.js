module.exports.start = configuration => {
  'use strict';

  // winston
  let logger = (() => {
    let winston = require('winston');
    winston.remove(winston.transports.Console);
    winston.add(winston.transports.Console, {
      timestamp: true,
      colorize: true
    });
    winston.level = configuration['winston-log-level'] || 'error';
    return winston;
  })();

  // restify
  let server = (() => {
    let restify = require('restify');
    let restifyServer = restify.createServer({
      name: 'render-to-S3',
      version: '0.0.1'
    });
    restifyServer.use(restify.plugins.bodyParser({}));
    return restifyServer;
  })();

  // uuid
  let uuid = require('uuid/v4'); // Generate and return a RFC4122 v4 UUID

  // lifta syntax
  let lifta = require('lifta-syntax');

  // the modules of our app
  let getUserAndHTML = require('./getUserAndHTML')(configuration['aws-Dynamo-config'], logger).getUserAndHTML;
  let writeHTML = require('./writeHTML')(logger).writeHTML;
  let phantomRun = require("./phantomRun")(__dirname + '/bucket/javascripts/toPng.js', logger).phantomRun;
  let putThumbnail = require('./putThumbnail')(configuration['aws-S3-config'], logger).putThumbnail;
  let tempFileCleanup = require("./tempFileCleanup")(logger).tempFileCleanup;

  // e is an Error with added property x[]
  function sendErrorToClient(e) {
    let second = e.x.second,
      error = e.error;
    logger.debug('sendErrorToClient trx: %s error: %j', second.trx, error);
    second.res.send(400, {
      message: 'well that did not work',
      error
    });
    // we dealt with the error, now just return x
    return e.x;
  }

  // x is an object, the second of the tuple passed to doit.run() below
  function sendSuccessToClient(x) {
    logger.info('200 trx: %s', x.trx);
    // header should contain URL of image in location
    x.res.send(200, {
      message: 'freakin awesome dude!'
    });
    return x;
  }

  // create an arrow from all the others, we will run this with each request
  let doit =
    getUserAndHTML
    .then(writeHTML.barrier)
    .then(phantomRun.barrier)
    .then(putThumbnail.barrier)
    .leftError.lor(sendErrorToClient, sendSuccessToClient.second)
    .then(tempFileCleanup.second);

  // id is provided by the caller
  // for now the client could just use the user id
  server.put('/emblem/:id', (req, res) => {
    let trx = uuid(),
      emblemid = req.params.id;
    logger.info('request emblem id: %s trx: %s', emblemid, trx);
    doit.run([{}, {
      trx,
      res,
      emblemid,
      userid: req.body.userid,
      localTempDir: __dirname + '/bucket/',
      sourceHTMLFileName: __dirname + '/phantom/visual.html',
      thumbnailBucket: configuration['thumbnail-bucket'],
      userTableName: configuration['user-table-name'],
      layoutField: 'teaming-path-layout',
      tempFiles: []
    }]);
  });

  //start listening to client requests
  server.listen(configuration['service-port']);
  logger.info("phantom service listening on port %d", configuration['service-port']);
};