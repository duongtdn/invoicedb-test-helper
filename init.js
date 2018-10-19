"use strict"

const db = require('./index')

const aws = require('aws-sdk')

aws.config.loadFromPath('./aws.config');

// table must be created from aws
db.use()._createNewEntries(() => console.log('Finished!'))