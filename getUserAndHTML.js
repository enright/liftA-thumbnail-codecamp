module.exports = function (dynamoConfig, logger) {
  'use strict';

  let lifta = require('lifta-syntax');
  let dyna = require('lifta-dynamodb')(dynamoConfig);
  let fsa = require('lifta-fs');

  // create dynamo parameter for getting a user by id
  function setUserReqParams(x) {
    let second = x.second;
    logger.debug('setUserReqParams table: %s\n\tid: %s', second.userTableName, second.userid);
    return [{
      TableName: second.userTableName,
      Key: {
        id: {
          S: second.userid
        }
      }
    }, second];
  }

  // an arrow that will get the user from the dynamo db
  // note that getItemA only uses first
  // so if an error occurs and x.first instanceof Error, we wrap all of x in an error
  let getDynamoUser = setUserReqParams.then(dyna.getItemA.first.promoteError);

  function setHTMLSourceFileName(x) {
    let second = x.second;
    logger.debug('setHTMLSourceFileName %s', second.sourceHTMLFileName);
    return [second.sourceHTMLFileName, second];
  }

  // an arrow that will read the html boilerplate
  let readHTML = setHTMLSourceFileName.then(fsa.readFileA.first.promoteError);

  // combine results of get user and read HTML
  // or propogate an error
  function combineUserAndHTML(x) {
    let first = x.first,
      second = x.second;
    if (first instanceof Error) {
      logger.error('combineUserAndHTML first error %j', first);
      return first;
    } else if (second instanceof Error) {
      logger.error('combineUserAndHTML second error %j', second);
      return second;
    } else {
      let user = first.first,
        html = second.first;
      logger.debug('combineUserAndHTML user: %j \n\thtml: %s', user, html);
      return [{
        user,
        html
      }, first.second];
    }
  }

  // an arrow to get user and read html in parallel and combine the outputs
  let getUserAndHTML = getDynamoUser.fan(readHTML).then(combineUserAndHTML);

  return {
    setUserReqParams: setUserReqParams,
    getDynamoUser: getDynamoUser,
    setHTMLSourceFileName: setHTMLSourceFileName,
    readHTML: readHTML,
    combineUserAndHTML: combineUserAndHTML,
    getUserAndHTML: getUserAndHTML
  };
};