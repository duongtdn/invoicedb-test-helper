"use strict"

const DatabaseAbstractor = require('database-abstractor');

const invoicedb = new DatabaseAbstractor();

const db = {
  host: null,
  port: null
}

const tracker = {
  number: '1111', 
  '18': {
    '8': { count: 0 }
  }
};


module.exports = {

  _dbready: false,

  _tables: null,

  _users: {},

  queue: [],

  use({host, port}) {
    db.host = host;
    db.port = port;

    invoicedb.use(require('invoicedb-dynamodb-driver')(
      {
        region : 'us-west-2', 
        endpoint : `${db.host}:${db.port}`
      },
      (err, data) => {
        if (err) {
          console.log('Failed to init local db')
          throw new Error(err)
        } else {
          this._dbready = true;
          this._tables = data.TableNames;
          if (this.queue.length > 0) {
            this.queue.forEach(fn => this[fn.name].apply(this,fn.args))
          }
        }
      }
    ))

    return this;
  },

  init(done) {
    if (!db.host && !db.port) {
      throw new Error('host and port of database must be define.')
    }
    if (this._tables) {
      if (this._tables.indexOf('INVOICE') === -1) {
        console.log('\nInitializing INVOICE Table...')
        return this.new(() => {
          console.log('INVOICE Table is created and ready to use.');
          done && done();
        });
      } else {
        console.log('INVOICE Table already exists')
        done && done();
        return this;
      }
    } else {
      this.queue.push({name: 'init', args: [done]})
    }
  },

  new(done) {
    if (!db.host && !db.port) {
      throw new Error('host and port of database must be define.')
    }
    if (this._dbready) {
      invoicedb.createTable((err, data) => {
        if (err) {
          console.log('Failed to create INVOICE table')
          console.log(err);
        } else {  
          this._createNewEntries(done);
        }
      })
    } else {
      this.queue.push({name: 'new', args: [done]})
    }
    return this;
  },

  reset () {
    if (!db.host && !db.port) {
      throw new Error('host and port of database must be define.')
    }
    const self = this;
    if (this._dbready) {
      invoicedb.dropTable(function(err, data) {
        if (err) {
          console.log('Failed to drop INVOICE table')
          console.log(err);
        } else {
          console.log('Dropped old INVOICE table')
          invoicedb.createTable((err, data) => {
            if (err) {
              console.log('Failed to create INVOICE table')
              console.log(err);
            } else {  
              self._createNewEntries();
            }
          })
        }
      })
    } else {
      this.queue.push({name: 'reset', args: [done]})
    }
    return this;
  },

  _createNewEntry(invoice) {
    return new Promise((resolve, reject) => {
      invoicedb.createInvoice(invoice, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data)
        }
      })
    })
  },

  _createNewEntries(done) {
    console.log('Create Invoice record tracker...')  
    Promise.all([
      this._createNewEntry(tracker)
    ]).then(values => {
      console.log('Created Invoice record tracker.')
      console.log(values)
      done && done();
    }).catch(function(err) {
      console.log(err);
      done && done(err)
    });
    return this;
  }

}

