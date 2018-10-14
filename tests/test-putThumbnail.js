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

//   let putThumbnail = reqParamsPutThumb.then(s3a.putObjectA.first.promoteError);

describe('putThumbnail', () => {
  it('produces parameters and calls s3', (done) => {
    let pngFileName = 'pingfilename.png';
    let areadstream = 'a stream';
    let thumbnailBucket = 'bucket';
    let emblemid = 'anid';
    let first = {
      pngFileName
    };
    let second = {
      thumbnailBucket,
      emblemid
    };
    mock('fs', {
      createReadStream: (fileName) => {
        expect(fileName).equal(pngFileName);
        return areadstream;
      }
    });
    mock('lifta-s3', (s3config) => {
      return {
        putObjectA: (x, cont, p) => {
          expect(x.Bucket).equal(thumbnailBucket);
          expect(x.Key).equal(emblemid + '.png');
          expect(x.Body).equal(areadstream);
          expect(x.ACL).equal('public-read');
          expect(x.CacheControl).equal('no-cache');
          cont(x, p);
        }
      };
    });
    let putThumbnail = require('../putThumbnail.js')({}, logger).putThumbnail;
    let arw = putThumbnail.then((x) => {
      expect(x.second).equals(second);
      mock.stop('fs');
      mock.stop('lifta-s3');
      done();
    });
    arw.run([first, second]);
  });
  it('produces error when s3 fails', (done) => {
    let pngFileName = 'pingfilename.png';
    let areadstream = 'a stream';
    let thumbnailBucket = 'bucket';
    let emblemid = 'anid';
    let first = {
      pngFileName
    };
    let second = {
      thumbnailBucket,
      emblemid
    };
    mock('fs', {
      createReadStream: (fileName) => {
        expect(fileName).equal(pngFileName);
        return areadstream;
      }
    });
    mock('lifta-s3', (s3config) => {
      return {
        putObjectA: (x, cont, p) => {
          let e = new Error('s3 failed');
          e.x = x;
          cont(e, p);
        }
      };
    });
    let putThumbnail = require('../putThumbnail.js')({}, logger).putThumbnail;
    let arw = putThumbnail.then((x) => {
      expect(x).to.be.a('error');
      expect(x.x.second).equal(second);
      mock.stop('fs');
      mock.stop('lifta-s3');
      done();
    });
    arw.run([first, second]);
  });
});