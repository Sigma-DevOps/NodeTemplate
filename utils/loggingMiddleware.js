const morgan = require('morgan');

function headersSent(res) {
  // istanbul ignore next: node.js 0.8 support
  return typeof res.headersSent !== 'boolean'
    ? Boolean(res._header)
    : res.headersSent;
}

const printJSON = (data) => {
  try {
    // return JSON.stringify(data, null, 2); // pretty json log
    return JSON.stringify(data);
  } catch (error) {
    return data ? 'failed to parse body' : 'empty body';
  }
};

const setReqUID = (req, res, next) => {
  req.uid = Math.random().toString(36).substring(7).toUpperCase();
  next();
};

morgan.token('req-id', (req, res) => req.uid);
morgan.token('req-body', (req, res) => printJSON(req.body));
morgan.token('rcid', (req, res) => {
  if (req.body && 'rcid' in req.body) return req.body.rcid;
  try {
    const rcid = (req.originalUrl || req.url).split('/')[2];
    // eslint-disable-next-line no-restricted-globals
    return isNaN(rcid) ? '-1 (NaN)' : rcid;
  } catch (err) {
    return '-1 (Err)';
  }
});
morgan.token('res-body', (req, res) => {
  try {
    const resBody = JSON.parse(res.__body_cache__);
    if (resBody.status !== 'success')
      return printJSON(JSON.parse(res.__body_cache__));
    return '{success}';
  } catch (error) {
    return res.__body_cache__;
  }
});

morgan.format(
  'finishedRequest',
  function developmentFormatLine(tokens, req, res) {
    // get the status code if response written
    let status = headersSent(res) ? res.statusCode : undefined;

    // get status color
    let color =
      status >= 500
        ? 31 // red
        : status >= 400
        ? 33 // yellow
        : status >= 300
        ? 36 // cyan
        : status >= 200
        ? 32 // green
        : 0; // no color

    // get colored function
    let fn = developmentFormatLine[color];

    if (!fn) {
      // compile
      // eslint-disable-next-line no-multi-assign
      fn = developmentFormatLine[color] = morgan.compile(
        `Request :rcid @ \x1b[${color}m:req-id \x1b[0mFinished -> \x1b[0m:method :url \x1b[${color}m:status\x1b[0m :response-time ms - :res[content-length]\x1b[0m Res: :res-body`
      );
    }

    return fn(tokens, req, res);
  }
);

const finishLogger = morgan('finishedRequest');
const startLogger = morgan(
  `Queued :rcid @ :req-id :remote-addr [:date[clf]] :: :method :url -->>" :user-agent", Requset Body: :req-body`,
  { immediate: true }
);

exports.setReqUID = setReqUID;
exports.finishLogger = finishLogger;
exports.startLogger = startLogger;

exports.setMiddlewares = (app) => {
  const originalSend = app.response.send;
  app.response.send = function sendOverWrite(body) {
    originalSend.call(this, body);
    this.__body_cache__ = body;
  };

  app.use(setReqUID);
  app.use(finishLogger);
  app.use(startLogger);
};
