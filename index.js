'use strict';

var spawn = require('threads').spawn;

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (sails) {
  if (!sails.config.webpack || !sails.config.webpack.config) {
    sails.log.warn('sails-hook-webpack: No Webpack options have been defined.');
    sails.log.warn('sails-hook-webpack: Please configure your config/webpack.js file.');
    return {};
  }

  var config = {
    hook: sails.config.webpack,
    server: sails.config.webpack.development,
  };

  var hook = {

    emitReady: false,
    
    nextAfterBuild: function() {},

    configure: function configure() {},


    /**
     *
     * @param next
     */
    initialize: function initialize(next) {
      if (process.env.NODE_ENV === 'development') {
        hook.nextAfterBuild = next;
      } else {
        next();
      }
    },


    /**
     * Called after every webpack build.
     * @param err
     * @param rawStats
     * @returns {*}
     */
    afterBuild: function afterBuild(err, rawStats) {
      if (err) {
        return sails.log.error('sails-hook-webpack: Build error: \n\n', err);
      }

      if (!this.emitReady) {
        sails.emit('hook:sails-hook-webpack:compiler-ready', {});
        this.emitReady = true;
      }

      // emit a built event - hooks like sails-hook-react can then use this
      // to reload sails routes in dev environment builds
      sails.emit('hook:sails-hook-webpack:after-build', rawStats);

      var stats = rawStats.toJson();
      sails.log.debug('sails-hook-webpack: ' + rawStats.toString({ colors: true, chunks: false }));
      
      if (stats.errors.length > 0) {
        sails.log.error('sails-hook-webpack: ', stats.errors);
      }

      if (stats.warnings.length > 0) {
        sails.log.warn('sails-hook-webpack: ', stats.warnings);
      }
      return null;
    }
  };

  function setUpWatch(input, done) {
    var _webpack = require('webpack');
    var _webpack2 = _interopRequireDefault(_webpack);
    
    var config = require(input);
    
    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
    console.log("Build started", new Date().getTime());
    var hook = {};
    hook.compiler = (0, _webpack2.default)(config.webpack.config, function (err, stats) {
      if (err) done(err); 
      console.log("Building Done", new Date().getTime());
      console.log(stats.toString({ colors: true, chunks: false }));
      done(err);
      console.log('sails-hook-webpack: Watching for changes...');
      hook.compiler.watch(config.webpack.watchOptions, function(err, stats) {
        if (err) {
          console.log("Watch Error ", err);
        } else {
          console.log(stats.toString({ colors: true, chunks: false }));
        }
      });
    });
  }

  // setup outside like this to allow use of the compiler in http.customMiddleware
  if (process.env.NODE_ENV === 'development') {
      const thread = spawn(function() {});
      thread
      .run(setUpWatch)
      .send(config.hook.path)
      .on('done',function(err){
        if (err) {
          console.log("sails-hook-webpack: Build error: \n\n", err);
        }
        hook.nextAfterBuild();
      });
    } else {
      hook.compiler = (0, _webpack2.default)(config.hook.config, function (err, stats) {
        if (err) throw err;
        sails.log.info('sails-hook-webpack: Webpack loaded.');
        sails.log.silly('sails-hook-webpack: ', stats.toString());
        sails.log.info('sails-hook-webpack: Running production build...');
        hook.compiler.run(hook.afterBuild.bind(hook));
      });
    }

  if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development' && config.server) {
    var WebpackDevServer = require('webpack-dev-server');
    var defaultDevServerConfig = {
      hot: true,
      port: 3000
    };

    // merge defaults
    config.server.config = Object.assign(defaultDevServerConfig, config.server.config || {});

    if (config.server.webpack) {
      hook.devServerCompiler = (0, _webpack2.default)(config.server.webpack);
    }

    hook.devServer = new WebpackDevServer(hook.devServerCompiler || hook.compiler, config.server.config);

    hook.devServer.listen(config.server.config.port);
  }

  return hook;
};

var _webpack = require('webpack');

var _webpack2 = _interopRequireDefault(_webpack);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* global sails */
module.exports = exports['default'];
