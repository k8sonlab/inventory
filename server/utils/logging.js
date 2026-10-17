export function debugLog(...args) {
  if (process.env.NODE_ENV !== 'production') console.debug(...args);
}

export function accessLog(req, res, next) {
  const started = process.hrtime.bigint();
  const method = req.method;
  const path = req.originalUrl.split('?')[0];
  const remoteAddress = req.socket.remoteAddress;
  let logged = false;
  const log = () => {
    if (logged) return;
    logged = true;
    const aborted = !res.writableFinished;
    console.log(JSON.stringify({
      type: 'access',
      timestamp: new Date().toISOString(),
      method,
      path,
      status: aborted ? 499 : res.statusCode,
      duration_ms: Number(process.hrtime.bigint() - started) / 1e6,
      remote_address: remoteAddress,
      ...(aborted ? { aborted: true } : {})
    }));
  };
  res.once('finish', log);
  res.once('close', log);
  next();
}
