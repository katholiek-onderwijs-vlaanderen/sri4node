const configuration = global.configuration  

exports = module.exports = {
  postAuthenticationFailed: (req, res, me, errorResponse) => {
    'use strict';
    var status;
    var body;

    if (!me) {
      status = 401;
      body = 'Unauthorized';
      res.header('WWW-Authenticate', 'Basic realm="User Visible Realm"');
    } else if (errorResponse && errorResponse.status && errorResponse.body) {
      status = errorResponse.status;
      body = errorResponse.body;
    } else {
      status = 403;
    }

    res.status(status).send(body);
  },

  doBasicAuthentication: (authenticator) => {
    'use strict';
    return function (req, res, next) {
      var basic, encoded, decoded, firstColonIndex, username, password;
      var typeToMapping, type, mapping;
      var path = req.route.path;
      var database;

      if (path !== '/me' && path !== '/batch' && path !== '/validate') {
        typeToMapping = typeToConfig(resources);
        type = req.route.path.split(':')[0].replace(/\/$/, '').replace('/validate','');
        mapping = typeToMapping[type];
        if (mapping.public) {
          next();
          return;
        }
      }

      if (req.headers.authorization) {
        basic = req.headers.authorization;
        encoded = basic.substr(6);
        decoded = new Buffer(encoded, 'base64').toString('utf-8');
        firstColonIndex = decoded.indexOf(':');
        if (firstColonIndex !== -1) {
          username = decoded.substr(0, firstColonIndex);
          password = decoded.substr(firstColonIndex + 1);
          if (username && password && username.length > 0 && password.length > 0) {
            pgConnect(postgres, configuration).then(function (db) {
              database = db;
              return authenticator(database, username, password).then(function (result) {
                if (result) {
                  req.user = username;
                  next();
                } else {
                  debug('Authentication failed, wrong password');
                  postAuthenticationFailed(req, res);
                }
              });
            }).then(function () {
              database.done();
            }).fail(function (err) {
              debug('checking basic authentication against database failed.');
              debug(err);
              debug(err.stack);
              database.done(err);
              postAuthenticationFailed(req, res);
            });
          } else {
            postAuthenticationFailed(req, res);
          }
        } else {
          postAuthenticationFailed(req, res);
        }
      } else {
        debug('No authorization header received from client. Rejecting.');
        postAuthenticationFailed(req, res);
      }
    };
  },

  checkBasicAuthentication: (authenticator) => {
    'use strict';
    return function (req, res, next) {
      var basic, encoded, decoded, firstColonIndex, username, password;
      var typeToMapping, type, mapping;
      var path = req.route.path;
      var database;

      if (path !== '/me' && path !== '/batch') {
        typeToMapping = typeToConfig(resources);
        type = req.route.path.split(':')[0].replace(/\/$/, '');
        mapping = typeToMapping[type];
        if (mapping.public) {
          next();
          return;
        }
      }

      if (req.headers.authorization) {
        basic = req.headers.authorization;
        encoded = basic.substr(6);
        decoded = new Buffer(encoded, 'base64').toString('utf-8');
        firstColonIndex = decoded.indexOf(':');
        if (firstColonIndex !== -1) {
          username = decoded.substr(0, firstColonIndex);
          password = decoded.substr(firstColonIndex + 1);
          if (username && password && username.length > 0 && password.length > 0) {
            pgConnect(postgres, configuration).then(function (db) {
              database = db;
              return authenticator(database, username, password);
            }).then(function () {
              database.done();
              next();
            }).fail(function (err) {
              debug('checking basic authentication against database failed.');
              debug(err);
              debug(err.stack);
              database.done(err);
              next();
            });
          } else {
            next();
          }
        } else {
          next();
        }
      } else {
        debug('No authorization header received from client');
        next();
      }
    };
  }
}