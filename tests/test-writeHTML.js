/* globals require,describe,it,setTimeout,clearTimeout */
"use strict"; // enables proper tail calls (PTC) in Node 6 harmony

// mocha tests
let lifta = require('lifta-syntax');
let expect = require('chai').expect;
let mock = require('mock-require');

// mock a logger
let logger = {
  error: () => {},
  debug: () => {}
};

describe('prepareHTMLWrite', () => {
  it('takes a layout field from a dynamo user record and prepares html from it', (done) => {
    let layoutField = 'layout'; // property in dynamo user item containing layout data
    let localTempDir = 'somedir';
    let emblemid = 'fred765';
    let second = {
      layoutField,
      localTempDir,
      emblemid
    };
    let first = {
      html: '<div id="profile-div"></div>',
      user: {
        Item: {
          layout: {
            S: '43'
          }
        }
      }
    };
    let prepareHTMLWrite = require('../writeHTML.js')(logger).prepareHTMLWrite;
    let arw = prepareHTMLWrite.then((x) => {
      expect(x.first).to.have.property('fileName', localTempDir + emblemid + '.html');
      expect(x.first).to.have.property('data');
      expect(x.first.data).contains('data-layout="43"');
      done();
    });
    arw.run([first, second]);
  });
  it('fails if the layout field is not present', (done) => {
    let layoutField = 'nolayout'; // property in dynamo user item containing layout data
    let localTempDir = 'somedir';
    let emblemid = 'fred765';
    let second = {
      layoutField,
      localTempDir,
      emblemid
    };
    let first = {
      html: '<div id="profile-div"></div>',
      user: {
        Item: {
          layout: {
            S: '43'
          }
        }
      }
    };
    let prepareHTMLWrite = require('../writeHTML.js')(logger).prepareHTMLWrite;
    let arw = prepareHTMLWrite.then((x) => {
      expect(x).to.be.a('error');
      done();
    });
    arw.run([first, second]);
  });
});

describe('HTMLResults', () => {
  it('sets the temp file name for HTML in first and adds to tempFiles in context', (done) => {
    let fileName = 'afile.html';
    let tempFiles = [];
    let second = {
      tempFiles
    };
    let first = {
      fileName
    };
    let HTMLResults = require('../writeHTML.js')(logger).HTMLResults;
    let arw = HTMLResults.then((x) => {
      expect(x.first).to.have.property('tempHTMLFileName', fileName);
      expect(x.second.tempFiles).to.include(fileName);
      done();
    });
    arw.run([first, second]);
  });
});

describe('writeHTML', () => {
  it('produces prep html error if prep html fails', (done) => {
    let layoutField = 'incorrectlayoutfield'; // property in dynamo user item containing layout data
    let localTempDir = 'somedir';
    let emblemid = 'fred765';
    let second = {
      layoutField,
      localTempDir,
      emblemid
    };
    let first = {
      html: '<div id="profile-div"></div>',
      user: {
        Item: {
          layout: {
            S: '43'
          }
        }
      }
    };
    let writeHTML = require('../writeHTML.js')(logger).writeHTML;
    let arw = writeHTML.then((x) => {
      expect(x).to.be.a('error');
      expect(x.message).equal('no layout data for user');
      done();
    });
    arw.run([first, second]);
  });
  it('produces fs write error if fs write fails', (done) => {
    let layoutField = 'layout'; // property in dynamo user item containing layout data
    let localTempDir = 'somedir';
    let emblemid = 'fred765';
    let second = {
      layoutField,
      localTempDir,
      emblemid
    };
    let first = {
      html: '<div id="profile-div"></div>',
      user: {
        Item: {
          layout: {
            S: '43'
          }
        }
      }
    };
    mock('lifta-fs', {
      writeFileA: (x, cont, p) => cont(new Error('write failed'), p)
    });
    let writeHTML = require('../writeHTML.js')(logger).writeHTML;
    let arw = writeHTML.then((x) => {
      expect(x).to.be.a('error');
      expect(x.message).equal('write failed');
      // we can't legitimately test the fs call because we mocked it
      // expect(x.x.first).to.have.property('fileName', localTempDir + emblemid + '.html');
      // expect(x.x.first).to.have.property('data');
      // expect(x.x.first.data).contains('data-layout="43"');
      expect(x.x.second).equal(second);
      mock.stop('lifta-fs');
      done();
    });
    arw.run([first, second]);
  });
});