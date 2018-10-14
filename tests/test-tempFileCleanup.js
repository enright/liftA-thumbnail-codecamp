/* globals require,describe,it,setTimeout,clearTimeout */
"use strict"; // enables proper tail calls (PTC) in Node 6 harmony

// mocha tests
let lifta = require('lifta-syntax');
let expect = require('chai').expect;
let tmp = require('tmp');
let fs = require('fs');

// mock a logger
let logger = {
  error: () => {},
  debug: () => {}
};

let tempFileCleanup = require('../tempFileCleanup.js')(logger).tempFileCleanup;

describe('tempFileCleanup', () => {
  it('does not throw with x.tempFiles undefined', (done) => {
    let arw = tempFileCleanup.then(function (x) {
      done();
    });
    arw.run({});
  });
  it('deletes a single file', (done) => {
    let file = tmp.fileSync();
    let arw = tempFileCleanup.then(function (x) {
      setTimeout(function () {
        expect(fs.existsSync(file.name)).to.equal(false);
        done();
      }, 1);
    });
    expect(fs.existsSync(file.name)).to.equal(true);
    arw.run({
      tempFiles: [file.name]
    });
  });
  it('deletes multiple files', (done) => {
    let file1 = tmp.fileSync();
    let file2 = tmp.fileSync();
    let file3 = tmp.fileSync();
    let arw = tempFileCleanup.then(function (x) {
      setTimeout(function () {
        expect(fs.existsSync(file1.name)).to.equal(false);
        expect(fs.existsSync(file2.name)).to.equal(false);
        expect(fs.existsSync(file3.name)).to.equal(false);
        done();
      }, 1); // files are unlinked asynch so give time here
    });
    expect(fs.existsSync(file1.name)).to.equal(true);
    expect(fs.existsSync(file2.name)).to.equal(true);
    expect(fs.existsSync(file2.name)).to.equal(true);
    arw.run({
      tempFiles: [file1.name, file3.name, file2.name]
    });
  });
});