const setResponseHeader = (body) => {
  if (body.startingTime)
    body.executionTime = `${Date.now() - req.startingTime}ms`;
  body.responseDate = new Date().toString();
};


exports.setMiddlewares = (app) => {
  const originalSend = app.response.send;
  app.response.send = function sendOverWrite(body) {
    setResponseHeader(body);
    originalSend.call(this, body);
  };
};