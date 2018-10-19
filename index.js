"use strict"

const DatabaseAbstractor = require('database-abstractor');

const invoicedb = new DatabaseAbstractor();


module.exports = {

  _dbready: false,

  _tables: null,

  _users: {},

  queue: [],

  use() {

    invoicedb.use(require('@sglearn/invoicedb-dynamodb-driver')(
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
    return this
  },

  new(done) {
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

  _createMasterRecord() {
    return new Promise((resolve, reject) => {
      invoicedb.createMasterRecord( (err, data) => {
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
      this._createMasterRecord()
    ]).then(values => {
      console.log('Created Invoice record tracker.')
      done && done();
    }).catch(function(err) {
      console.log(err);
      done && done(err)
    });
    return this;
  }

}

