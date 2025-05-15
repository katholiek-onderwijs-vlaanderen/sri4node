// copied from an existing npm module (https://github.com/yp-engineering/express-middleware-timer)
// that has not been updated in a long time
// Since we had some trouble making sure that the env variable was set on time
// I copied it here and modified the code slightly to make sure that it is always on
// Turning it off can be done by not calling instrument in the main code then,
// if needed, based on some config option.

const OFF = false;

let instrumented = 0;
function instrument(middleware, name) {
  if (OFF) return middleware;

  function bindWrapper(m, name) {
    return function wrapper(req, res, next) {
      const now = Date.now();
      if (res._timer && res._timer.times) {
        res._timer.times[name] = {
          from_start: now - res._timer.start,
          last: now - res._timer.last,
        };
        res._timer.last = now;
      }
      m(req, res, next);
    };
  }

  if (typeof middleware === "function") {
    const position = instrumented++;
    name = name || middleware.name || "anonymous middlware #" + position;
    return bindWrapper(middleware, name);
  }

  let itter = 0; // if named
  return middleware.map(function (m) {
    const position = instrumented++;
    let newname;
    if (name) {
      newname = name + " #" + itter++;
    }
    newname = newname || m.name || "anonymous middlware #" + position;
    return bindWrapper(m, newname);
  });
}

function calculate(req, res) {
  // sillyness to cleanup reporting
  const report = {
    request: { url: req.url, headers: req.headers },
    timers: { startup: { from_start: 0 } },
  };

  const reportedTimers = res._timer.times;

  function updateReport(timer) {
    const reportNames = Object.keys(report.timers);
    const lastReport = reportNames[reportNames.length - 1];

    if (typeof timer === "string") {
      report.timers[lastReport].took = reportedTimers[timer].last;
      report.timers[lastReport].from_start = reportedTimers[timer].from_start;
      report.timers[timer] = {};
    } else {
      const now = Date.now();
      report.timers[lastReport].took = now - timer.last;
      report.timers[lastReport].from_start = now - timer.start;
    }
  }

  Object.keys(reportedTimers).forEach(function (timer) {
    updateReport(timer);
  });

  updateReport(res._timer);
  return report;
}

function report(req, res) {
  if (OFF || !res._timer || !res._timer.times) return;

  // report
  console.log("------------------------------");
  console.dir(calculate(req, res));
  console.log("------------------------------");
}

function init(reporter) {
  return function (req, res, next) {
    if (OFF) return next();

    const now = Date.now();
    res._timer = {
      start: now,
      last: now,
      times: {},
    };

    reporter = typeof reporter === "function" ? reporter : report;

    res.on("finish", function onResponseFinish() {
      reporter(req, res);
    });

    next();
  };
}

export {
  instrument,
  init,
  calculate,
  // on: !OFF,
  // off: OFF,
};
