/*
Convenience functions for calling an SRI interface.
All functions return a Q promise.
*/

"use strict";

var needle = require('needle');
var Q = require("q");

exports = module.exports = {
    get : function(url, user, pwd) {
        var deferred = Q.defer();

        var headers = {};
        if(user && pwd) {
            headers.username = user;
            headers.password = pwd;
        }

        needle.get(url, headers, function(error, response) {
            if(!error) {
                deferred.resolve(response);
            } else {
                deferred.reject(error);
            }
        });

        return deferred.promise;
    },

    put : function(url, body, user, pwd) {
        var deferred = Q.defer();

        var options = {};
        if(user && pwd) {
            options.username = user;
            options.password = pwd;
        }
        options.json = true;

        needle.request('PUT', url, body, options, function(error, response) {
            if(!error) {
                deferred.resolve(response);
            } else {
                deferred.reject(error);
            }
        });

        return deferred.promise;
    },

    delete : function(url, user, pwd) {
        var deferred = Q.defer();

        var options = {};
        if(user && pwd) {
            options.username = user;
            options.password = pwd;
        }

        needle.delete(url, null, options, function(error, response) {
            if(!error) {
                deferred.resolve(response);
            } else {
                deferred.reject(error);
            }
        });

        return deferred.promise;
    }
}

