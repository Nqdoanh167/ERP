/* eslint-disable no-unused-vars */
import path from 'path'
import merge from 'lodash/merge'

/* istanbul ignore next */
const requireProcessEnv = (name) => {
  if (!process.env[name]) {
    throw new Error('You must set the ' + name + ' environment variable')
  }
  return process.env[name]
}

/* istanbul ignore next */
if (process.env.NODE_ENV !== 'production') {
  const dotenv = require('dotenv-safe')
  dotenv.config({
    path: path.join(__dirname, '../.env'),
    example: path.join(__dirname, '../.env.example')
  })
}

const config = {
  all: {
    env: process.env.NODE_ENV || 'development',
    serverAddress: requireProcessEnv('SERVER_ADDRESS'),
    service: 'customers',
    root: path.join(__dirname, '..'),
    port: process.env.PORT || 9000,
    portQueue: process.env.PORT_QUEUE || 9001,
    portQueueMultithread: process.env.PORT_QUEUE_MULTITHREAD || 9002,
    portSocket: process.env.PORT_SOCKET || 9003,
    ip: process.env.IP || '0.0.0.0',
    apiRoot: process.env.API_ROOT || '',
    defaultEmail: 'no-reply@smax-f-b.com',
    masterKey: requireProcessEnv('MASTER_KEY'),
    jwtSecret: requireProcessEnv('JWT_SECRET'),
    jwtSecretBackdoor: requireProcessEnv('JWT_SECRET_BACKDOOR'),
    mongo: {
      options: {
        useUnifiedTopology: true,
        useNewUrlParser: true,
        useCreateIndex: true
      }
    },
    redis: {
      uri: process.env.REDIS_URI,                  // redis://root:<password>@<url>:<port>
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || '6379',
      password: process.env.REDIS_PASSWORD && process.env.REDIS_PASSWORD !== 'null' ? process.env.REDIS_PASSWORD : undefined,
      prefix: 'smaxfnb',
    },
    elasticsearch: {
      uri: requireProcessEnv('ELASTICSEARCH_URI'),
    },
    kafka: {
      clientId: requireProcessEnv('KAFKA_CLIENTID'),
      brokers: [requireProcessEnv('KAFKA_BROKER')],
      mechanism: requireProcessEnv('KAFKA_MECHANISM'),
      username: requireProcessEnv('KAFKA_USERNAME'),
      password: requireProcessEnv('KAFKA_PASSWORD'),
    },
  },
  test: {},
  development: {
    mongo: {
      uri: process.env.MONGODB_URI || 'mongodb://localhost/smaxapp_fnb',
      options: {
        debug: true
      }
    }
  },
  production: {
    ip: process.env.IP || undefined,
    port: process.env.PORT || 8080,
    mongo: {
      uri: process.env.MONGODB_URI
    }
  }
}

module.exports = merge(config.all, config[config.all.env])
export default module.exports
