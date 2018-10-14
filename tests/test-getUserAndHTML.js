/* globals require,describe,it,setTimeout,clearTimeout */
"use strict"; // enables proper tail calls (PTC) in Node 6 harmony

// mocha tests
let lifta = require('lifta-syntax');
let expect = require('chai').expect;
let mock = require('mock-require');
let fs = require('fs');

// mock a logger
let logger = {
  error: () => {},
  debug: () => {}
};

describe('setUserReqParams', () => {
  it('creates first of tuple as dynamo query from values in second (context)', (done) => {
    let setUserReqParams = require('../getUserAndHTML.js')({}, logger).setUserReqParams;
    let tableName = 'atable';
    let anid = 'xyzzy';
    let arw = setUserReqParams.then((x) => {
      expect(x.first).to.have.property('TableName', tableName);
      expect(x.first).to.have.nested.property('Key.id.S', anid);
      done();
    });
    arw.run([undefined, {
      userTableName: tableName,
      userid: anid
    }]);
  });
});

describe('getDynamoUser', () => {
  it('proceeds with first tuple user record and second tuple unchanged context', (done) => {
    let tableName = 'atable';
    let anid = 'xyzzy';
    let context = {
      userTableName: tableName,
      userid: anid
    };
    let user = {
      coolguy: 'yes'
    };
    // mock the dynamo arrow api
    let dyna = mock('lifta-dynamodb', (dynamoConfig) => {
      return {
        getItemA: (x, cont, p) => {
          // ensure that the correct db query was delivered to getItemA
          expect(x).to.have.property('TableName', tableName);
          expect(x).to.have.nested.property('Key.id.S', anid);
          // continue with the canned user after timeout (ensure asynch)
          setTimeout(() => cont(user, p), 0);
        }
      };
    });
    let getDynamoUser = require('../getUserAndHTML.js')({}, logger).getDynamoUser;
    let arw = getDynamoUser.then((x) => {
      expect(x.first).equal(user);
      expect(x.second).equal(context);
      mock.stop('lifta-dynamodb');
      done();
    });
    arw.run([undefined, context]);
  });
  it('delivers error if dynamo produces error', (done) => {
    let tableName = 'atable';
    let anid = 'xyzzy';
    let context = {
      userTableName: tableName,
      userid: anid
    };
    // mock the dynamo arrow api
    mock('lifta-dynamodb', (dynamoConfig) => {
      return {
        getItemA: (x, cont, p) => {
          // continue with an error after timeout (ensure asynch)
          let e = new Error('dynamo bad thing');
          e.x = x;
          setTimeout(() => cont(e, p), 0);
        }
      };
    });
    let getDynamoUser = require('../getUserAndHTML.js')({}, logger).getDynamoUser;
    let arw = getDynamoUser.then((x) => {
      // an error wraps the result
      expect(x).to.be.a('error');
      // the query should have been first
      expect(x).to.have.nested.property('x.first.TableName', tableName);
      expect(x).to.have.nested.property('x.first.Key.id.S', anid);
      // the context should be second
      expect(x).to.have.nested.property('x.second', context);
      mock.stop('lifta-dynamodb');
      done();
    });
    arw.run([undefined, context]);
  });
});

describe('setHTMLSourceFileName', () => {
  it('sets first as second.sourceHTMLFileName', (done) => {
    let sourceFileName = 'sourcefile.name';
    let second = {
      sourceHTMLFileName: sourceFileName
    };
    let setHTMLSourceFileName = require('../getUserAndHTML.js')({}, logger).setHTMLSourceFileName;
    let arw = setHTMLSourceFileName.then((x) => {
      // an error wraps the result
      expect(x.first).to.equal(sourceFileName);
      expect(x.second).to.equal(second);
      done();
    });
    arw.run([undefined, second]);
  });
});

describe('readHTML', () => {
  it('sets source file and performs read', (done) => {
    let sourceFileName = 'sourcefile.name';
    let second = {
      sourceHTMLFileName: sourceFileName
    };
    let html = 'html stuff';
    // mock the fs arrow api
    mock('lifta-fs', {
      readFileA: (x, cont, p) => {
        expect(x).to.equal(sourceFileName);
        // continue with the canned html after timeout (ensure asynch)
        setTimeout(() => cont(html, p), 0);
      }
    });
    let readHTML = require('../getUserAndHTML.js')({}, logger).readHTML;
    let arw = readHTML.then((x) => {
      expect(x.first).equal(html);
      expect(x.second).equal(second);
      mock.stop('lifta-fs');
      done();
    });
    arw.run([undefined, second]);
  });
  it('produces error on fs read error', (done) => {
    let sourceFileName = 'sourcefile.name';
    let second = {
      sourceHTMLFileName: sourceFileName
    };
    // mock the fs arrow api
    mock('lifta-fs', {
      readFileA: (x, cont, p) => {
        let e = new Error('read file failed');
        e.x = x;
        // continue with an error
        setTimeout(() => cont(e, p), 0);
      }
    });
    let readHTML = require('../getUserAndHTML.js')({}, logger).readHTML;
    let arw = readHTML.then((x) => {
      expect(x).to.be.a('error');
      expect(x).to.have.nested.property('x.first', sourceFileName);
      expect(x).to.have.nested.property('x.second', second);
      mock.stop('lifta-fs');
      done();
    });
    arw.run([undefined, second]);
  });
});

describe('combineUserAndHTML', () => {
  it('continues with error if first is error', (done) => {
    let combineUserAndHTML = require('../getUserAndHTML.js')({}, logger).combineUserAndHTML;
    let arw = combineUserAndHTML.then((x) => {
      // an error wraps the result
      expect(x).to.be.a('error');
      done();
    });
    arw.run([new Error(), 'fred']);
  });
  it('continues with error if second is error', (done) => {
    let combineUserAndHTML = require('../getUserAndHTML.js')({}, logger).combineUserAndHTML;
    let arw = combineUserAndHTML.then((x) => {
      // an error wraps the result
      expect(x).to.be.a('error');
      done();
    });
    arw.run(['nancy', new Error()]);
  });
  it('if first == [user, context1] and second == [html, context2] => [{user, html}, context1]', (done) => {
    let first = ['user', 'dog'];
    let second = ['html', 'anything'];
    let combineUserAndHTML = require('../getUserAndHTML.js')({}, logger).combineUserAndHTML;
    let arw = combineUserAndHTML.then((x) => {
      // an error wraps the result
      expect(x.first.user).equal('user');
      expect(x.first.html).equal('html');
      expect(x.second).equal('dog');
      done();
    });
    arw.run([first, second]);
  });
});

//   let getUserAndHTML = getDynamoUser.fan(readHTML).then(combineUserAndHTML);
describe('getUserAndHTML', () => {
  it('produces dynamo error when file read succeeds and dynamo fails', (done) => {
    let userTableName = 'atable';
    let userid = 'xyzzy';
    let sourceHTMLFileName = 'sourcefile.name';
    let second = {
      userTableName,
      userid,
      sourceHTMLFileName
    };
    let html = 'html stuff';
    // mock the dynamo arrow api
    mock('lifta-dynamodb', (dynamoConfig) => {
      return {
        getItemA: (x, cont, p) => {
          // continue with an error after timeout (ensure asynch)
          let e = new Error('dynamo bad thing');
          e.x = x;
          setTimeout(() => cont(e, p), 2);
        }
      };
    });
    mock('lifta-fs', {
      readFileA: (x, cont, p) => {
        // continue with the canned html after timeout (ensure asynch)
        setTimeout(() => cont(html, p), 0);
      }
    });
    let getUserAndHTML = require('../getUserAndHTML.js')({}, logger).getUserAndHTML;
    let arw = getUserAndHTML.then((x) => {
      // an error wraps the result
      expect(x).to.be.a('error');
      expect(x).to.have.nested.property('x.second', second);
      mock.stop('lifta-dynamodb');
      mock.stop('lifta-fs');
      done();
    });
    arw.run([undefined, second]);
  });
  it('produces read error when dynamo succeeds and read fails', (done) => {
    let userTableName = 'atable';
    let userid = 'xyzzy';
    let sourceHTMLFileName = 'sourcefile.name';
    let second = {
      userTableName,
      userid,
      sourceHTMLFileName
    };
    let user = 'a user';
    let dyna = mock('lifta-dynamodb', (dynamoConfig) => {
      return {
        getItemA: (x, cont, p) => {
          // continue with the canned user after timeout (ensure asynch)
          setTimeout(() => cont(user, p), 0);
        }
      };
    });
    mock('lifta-fs', {
      readFileA: (x, cont, p) => {
        let e = new Error('read file failed');
        e.x = x;
        // continue with an error
        setTimeout(() => cont(e, p), 2);
      }
    });
    let getUserAndHTML = require('../getUserAndHTML.js')({}, logger).getUserAndHTML;
    let arw = getUserAndHTML.then((x) => {
      // an error wraps the result
      expect(x).to.be.a('error');
      expect(x).to.have.nested.property('x.second', second);
      mock.stop('lifta-dynamodb');
      mock.stop('lifta-fs');
      done();
    });
    arw.run([undefined, second]);
  });
  it('produces [{user, html}, context] on success ', (done) => {
    let userTableName = 'atable';
    let userid = 'xyzzy';
    let sourceHTMLFileName = 'sourcefile.name';
    let second = {
      userTableName,
      userid,
      sourceHTMLFileName
    };
    let user = 'a user';
    let html = 'html stuff';
    let dyna = mock('lifta-dynamodb', (dynamoConfig) => {
      return {
        getItemA: (x, cont, p) => {
          // continue with the canned user after timeout (ensure asynch)
          setTimeout(() => cont(user, p), 0);
        }
      };
    });
    mock('lifta-fs', {
      readFileA: (x, cont, p) => {
        // continue with the canned html after timeout (ensure asynch)
        setTimeout(() => cont(html, p), 0);
      }
    });
    let getUserAndHTML = require('../getUserAndHTML.js')({}, logger).getUserAndHTML;
    let arw = getUserAndHTML.then((x) => {
      expect(x.first.user).equal(user);
      expect(x.first.html).equal(html);
      expect(x.second).equal(second);
      mock.stop('lifta-dynamodb');
      mock.stop('lifta-fs');
      done();
    });
    arw.run([undefined, second]);
  });
});