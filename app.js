const mongoSanitize = require('express-mongo-sanitize');
const comprassion = require('compression');
const express = require('express');
const helmet = require('helmet');
const xss = require('xss-clean');
const hpp = require('hpp');

const setResponseHeaders = require('./utils/setResponseHeaders');
const logging = require('./utils/loggingMiddleware');
const AppError = require('./utils/appError');

let initializeStatus = 'pending';
const initialize = async () => {
  console.log('Start to initialize');
  initializeStatus = 'done';
};

exports.initialize = initialize;

const app = express();

// Set security HTTP headers
app.use(helmet());

// Set Encodings
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Security Middlewares
app.use(mongoSanitize());
app.use(xss());

// Prevent parameter pollution
app.use(hpp());
app.use(comprassion());

// testing middleware
app.use((req, res, next) => {
  // On-Demand Test middleware
  next();
});

setResponseHeaders.setMiddlewares(app);
if (process.env.NODE_ENV === 'development') logging.setMiddlewares(app);

app.all('*', (req, res, next) => {
  if (initializeStatus !== 'done')
    return next(
      new AppError(
        503,
        `Service Unacailable, Initialize not completed please try again later`
      )
    );
  next();
});

app.route('/health').get((req, res) =>
  res.status(200).json({
    status: 'success',
    data: {
      healthState: 'healthy',
    },
  })
);
// connect router
// app.use('/order', orderRouter);

app.all('*', (req, res, next) =>
  next(
    new AppError(
      404,
      `Can't find ${req.method}:${req.originalUrl} on the instance`
    )
  )
);

app.use((error, req, res, next) => {
  const statusCode = error.statusCode || 500;
  if (statusCode >= 500) console.error('Nowhere Error', error.message);
  res.status(statusCode).json({
    status: statusCode < 500 ? 'failed' : 'error',
    message: error.message,
  });
});

exports.routes = app;
