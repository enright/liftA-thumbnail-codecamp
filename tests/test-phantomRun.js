/* globals require,describe,it,setTimeout,clearTimeout */
"use strict"; // enables proper tail calls (PTC) in Node 6 harmony

let lifta = require('lifta-syntax');
let expect = require('chai').expect;
let mock = require('mock-require');

// mock a logger
let logger = {
  error: () => {},
  debug: () => {}
};

describe('preparePhantom', () => {
  it('adds extension to provided file name for .png', (done) => {
    let preparePhantom = require('../phantomRun.js')('nojs.js', logger).preparePhantom;
    let htmlFileName = 'xyzzy';
    let arw = preparePhantom.then(function (x) {
      expect(x.htmlFileName).to.equal(htmlFileName);
      expect(x.pngFileName).to.equal(htmlFileName + '.png');
      done();
    });
    arw.run({
      fileName: htmlFileName
    });
  });
  it('takes width and height from x.png_width and x.png_height', (done) => {
    let preparePhantom = require('../phantomRun.js')('nojs.js', logger).preparePhantom;
    let htmlFileName = 'xyzzy';
    let arw = preparePhantom.then(function (x) {
      expect(x.htmlFileName).to.equal(htmlFileName);
      expect(x.pngFileName).to.equal(htmlFileName + '.png');
      expect(x.png_width).to.equal(240);
      expect(x.png_height).to.equal(320);
      done();
    });
    arw.run({
      fileName: htmlFileName,
      png_width: 240,
      png_height: 320
    });
  });
  it('defaults size if none provided', (done) => {
    let preparePhantom = require('../phantomRun.js')('nojs.js', logger).preparePhantom;
    let arw = preparePhantom.then(function (x) {
      expect(x.png_width).to.equal(400);
      expect(x.png_height).to.equal(400);
      done();
    });
    arw.run({
      fileName: 'xyzzy'
    });
  });
});

describe('phantomResults', () => {
  it('adds png file name to x.tempFiles array', (done) => {
    let phantomResults = require('../phantomRun.js')('nojs.js', logger).phantomResults;
    let pngFileName = 'xyzzy.png';
    let arw = phantomResults.then(function (x) {
      expect(x.second.tempFiles.includes(pngFileName)).to.equal(true);
      done();
    });
    arw.run([{
      pngFileName: pngFileName
    }, {
      tempFiles: []
    }]);
  });
  it('does not add undefined to x.tempFiles array if png file name is undefined', (done) => {
    let phantomResults = require('../phantomRun.js')('nojs.js', logger).phantomResults;
    let pngFileName = 'xyzzy.png';
    let arw = phantomResults.then(function (x) {
      expect(x.second.tempFiles.includes(pngFileName)).to.equal(false);
      done();
    });
    arw.run([{}, {
      tempFiles: []
    }]);
  });
});

describe('phantomCreatePNG', () => {
  it('runs child process execFile success proceeds with no error', (done) => {
    mock('child_process', {
      execFile: function (path, childargs, cb) {
        expect(path).to.be.a('string');
        expect(path).to.not.be.empty;
        expect(childargs[0]).to.be.equal('nojs.js');
        expect(childargs[1]).to.be.equal('htmlfilename');
        expect(childargs[2]).to.be.equal('xyzzy.png');
        expect(childargs[3]).to.be.equal(105);
        expect(childargs[4]).to.be.equal(777);
        // next turn, call the callback fn
        // callback noerr === null, stdout === success
        setTimeout(() => cb(null, 'success', ''), 0);
        // returned object stub
        return {
          stdout: {
            on: () => {}
          },
          stderr: {
            on: () => {}
          }
        };
      }
    });
    let phantomCreatePNG = require('../phantomRun.js')('nojs.js', logger).phantomCreatePNG;
    let arw = phantomCreatePNG.then(function (x) {
      expect(x.pngFileName).to.equal('xyzzy.png');
      expect(x.stdout).to.equal('success');
      mock.stop('child_process');
      done();
    });
    // phantomCreatePNG runs on 'first', not a tuple
    arw.run({
      htmlFileName: 'htmlfilename',
      pngFileName: 'xyzzy.png',
      png_width: 105,
      png_height: 777
    });
  });
  it('runs child process execFile failure proceeds with error', (done) => {
    let theError = new Error('child process failed');
    let inputX = {
      htmlFileName: 'htmlfilename',
      pngFileName: 'xyzzy.png',
      png_width: 105,
      png_height: 777
    };
    mock('child_process', {
      execFile: function (path, childargs, cb) {
        expect(path).to.be.a('string');
        expect(path).to.not.be.empty;
        expect(childargs[0]).to.be.equal('nojs.js');
        expect(childargs[1]).to.be.equal('htmlfilename');
        expect(childargs[2]).to.be.equal('xyzzy.png');
        expect(childargs[3]).to.be.equal(105);
        expect(childargs[4]).to.be.equal(777);
        // next turn, call the callback fn
        // callback err === theError, stderr === success
        setTimeout(() => cb(theError, '', 'failed'), 0);
        // returned object stub
        return {
          stdout: {
            on: () => {}
          },
          stderr: {
            on: () => {}
          }
        };
      }
    });
    let phantomCreatePNG = require('../phantomRun.js')('nojs.js', logger).phantomCreatePNG;
    let arw = phantomCreatePNG.then(function (x) {
      expect(x).to.be.a('error');
      expect(x.x).to.equal(inputX);
      mock.stop('child_process');
      done();
    });
    // phantomCreatePNG runs on 'first', not a tuple
    arw.run(inputX);
  });
});

describe('phantomRun', () => {
  it('continues with error and no added temp file when child process errors', (done) => {
    let theError = new Error('child process failed');
    // input to the phantomRun is a tuple
    let htmlFileName = 'htmlfilename';
    let inputX = [{
      fileName: htmlFileName,
      png_width: 105,
      png_height: 777
    }, {
      tempFiles: []
    }];
    mock('child_process', {
      execFile: function (path, childargs, cb) {
        // next turn, call the callback fn
        // callback err === theError, stderr === success
        setTimeout(() => cb(theError, '', 'failed'), 0);
        // returned object stub
        return {
          stdout: {
            on: () => {}
          },
          stderr: {
            on: () => {}
          }
        };
      }
    });
    let phantomRun = require('../phantomRun.js')('nojs.js', logger).phantomRun;
    let arw = phantomRun.then(function (x) {
      expect(x).to.be.a('error');
      expect(x.x.first.htmlFileName).to.equal(htmlFileName);
      expect(x.x.first.pngFileName).to.equal(htmlFileName + '.png');
      expect(x.x.first.png_width).to.equal(105);
      expect(x.x.first.png_height).to.equal(777);
      expect(x.x.second).to.equal(inputX.second);
      mock.stop('child_process');
      done();
    });
    arw.run(inputX);
  });
  it('continues with png file name and pushed temp file when child process succeeds', (done) => {
    // input to the phantomRun is a tuple
    let htmlFileName = 'htmlfilename';
    let inputX = [{
      fileName: htmlFileName,
      png_width: 105,
      png_height: 777
    }, {
      tempFiles: []
    }];
    mock('child_process', {
      execFile: function (path, childargs, cb) {
        // next turn, call the callback fn
        // callback err === theError, stderr === success
        setTimeout(() => cb(null, 'success', ''), 0);
        // returned object stub
        return {
          stdout: {
            on: () => {}
          },
          stderr: {
            on: () => {}
          }
        };
      }
    });
    let phantomRun = require('../phantomRun.js')('nojs.js', logger).phantomRun;
    let arw = phantomRun.then(function (x) {
      expect(x.first.pngFileName).to.equal(htmlFileName + '.png');
      expect(x.first.stdout).to.equal('success');
      expect(x.second.tempFiles).to.include(htmlFileName + '.png');
      mock.stop('child_process');
      done();
    });
    arw.run(inputX);
  });
  it('can be cancelled, which kills', (done) => {
    // input to the phantomRun is a tuple
    let htmlFileName = 'htmlfilename';
    let inputX = [{
      fileName: htmlFileName,
      png_width: 105,
      png_height: 777
    }, {
      tempFiles: []
    }];
    let killed = false;
    mock('child_process', {
      execFile: function (path, childargs, cb) {
        // next turn, call the callback fn
        // callback err === theError, stderr === success
        let timeoutID = setTimeout(() => cb(null, 'success', ''), 10);
        // returned object stub
        return {
          stdout: {
            on: () => {}
          },
          stderr: {
            on: () => {}
          },
          kill: (s) => {
            killed = true;
            clearTimeout(timeoutID);
          }
        };
      }
    });
    let phantomRun = require('../phantomRun.js')('nojs.js', logger).phantomRun;
    let arw = phantomRun.then(function (x) {
      // we should never get here because we will be cancelled
      throw new Error('arrow completed when should have been cancelled');
    });
    let p = arw.run(inputX);
    setTimeout(() => {
      p.cancelAll();
      expect(killed).equal(true);
      done();
    }, 0);
  });
});