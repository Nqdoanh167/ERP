import express from 'express'
import cors from 'cors'
import compression from 'compression'
import morgan from 'morgan'
import { errorHandler as queryErrorHandler } from 'querymen'
import { errorHandler as bodyErrorHandler } from 'bodymen'
import { env } from '../../config'
import { errors } from '../response/errors';
import logger from '../logger';

export default (apiRoot, routes, node) => {
  const app = express()

  /* istanbul ignore next */
  if (['production', 'development', 'beta'].includes(env)) {
    app.use(cors())
    app.use(compression())
    app.use(morgan('dev'))
  }

  if (node === 'main') {

    const verify = (req, res, buf) => {
      req.rowBody = buf
    }

    app.use(express.urlencoded({ extended: false, limit: '50mb', verify }))
    app.use(express.json({ limit: '50mb', verify }))
    app.use(apiRoot, routes)
    app.use(queryErrorHandler())
    app.use(bodyErrorHandler())

    // 404 handler - Nếu không khớp route nào thì vào đây
    app.use((req, res, next) => {
      const error = new Error(`Cannot ${req.method} ${req.path}`);
      error.status = 404;
      error.statusText = 'Not Found';
      next(error);
    });
    // Error handler
    app.use((err, req, res, next) => {
      // console.log('err', err);
      logger.error(String(err));

      if (!res.headersSent) {


        // bắt lỗi từ elasticsearch
        if (err.name === 'ResponseError' && err.meta && err.meta.body) {
          err.status = err.meta.statusCode;
          err.statusText = err.meta.body.error.type;
          err.message = err.meta.body.error.reason;
          logger.error('Elasticsearch error:', err.meta.body.error);
        }
        logger.error(String(err));

        try {
          const error = JSON.parse(err.message);
          if (error.status) err.status = error.status;
          if (error.message) err.message = error.message;
        } catch (error) { }

        if (err.status) {
          res.status(err.status).json({
            status: err.status,
            statusText: err.statusText,
            message: err.message,
            timestamp: Date.now(),
          });
        } else {
          res.status(errors.status.INTERNAL_SERVER_ERROR).json({
            status: errors.status.INTERNAL_SERVER_ERROR,
            statusText: errors.statusTexts.INTERNAL_SERVER_ERROR,
            message: String(err) || errors.messages.INTERNAL_SERVER_ERROR,
            timestamp: Date.now(),
          })
        }
      }
    });
  }

  return app
}
