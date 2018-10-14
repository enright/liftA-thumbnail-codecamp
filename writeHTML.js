module.exports = function (logger) {
  'use strict';
  let fsa = require('lifta-fs');
  let cheerio = require('cheerio');

  // will be lifted to arrow to prep for HTML Write
  function prepareHTMLWrite(x) {
    let first = x.first,
      second = x.second,
      page$ = cheerio.load(first.html);
    //let page$ = cheerio.load(first.html, { xml: {xmlMode: false, decodeEntities: true}});
    if (!(first.user.Item && first.user.Item[second.layoutField] && first.user.Item[second.layoutField].S)) {
      logger.error('no layout for user %j', first.user);
      let error = Error('no layout data for user');
      error.x = x;
      return error;
    }
    page$('#profile-div').attr('data-layout', first.user.Item[second.layoutField].S);
    let newfirst = {
      fileName: second.localTempDir + second.emblemid + '.html',
      data: page$.html()
    };
    logger.debug('prepareHTMLWrite newfirst: %j', newfirst);
    return ([newfirst, second]);
  }

  // set the temp file name in first, save the temp file in tempFiles list in second
  function HTMLResults(x) {
    let first = x.first,
      second = x.second,
      tempHTMLFileName = first.fileName;
    first.tempHTMLFileName = tempHTMLFileName;
    second.tempFiles.push(tempHTMLFileName);
    logger.debug('HTMLResults tempHTMLFileName: %s\n\ttempFiles: %j', first.tempHTMLFileName, second.tempFiles);
    return [first, second];
  }

  // an arrow to write populated html template to a temp file
  // the prep and the fs write may generate errors
  let writeHTML = prepareHTMLWrite
    .then(fsa.writeFileA.first.promoteError.barrier)
    .then(HTMLResults.barrier);

  return {
    prepareHTMLWrite: prepareHTMLWrite,
    HTMLResults: HTMLResults,
    writeHTML: writeHTML
  };
};