(() => {
  let app,
    configFile,
    configuration;

  if (process.argv.length < 3) {
    console.log('Usage:');
    console.log('node run <server_file_name> [env_filename]');
    console.log('e.g. node run app.js prod.env.json');
    console.log('defaults to using dev.env.json if fourth parameter is omitted');
    return;
  }

  try {
    app = require('./' + process.argv[2]);
  } catch (exception) {
    console.log('exception loading', process.argv[2], exception);
    return;
  }

  try {
    configFile = __dirname + '/' + (process.argv[3] || 'dev.env.json');
    configuration = require(configFile); // require reads json
  } catch (exception) {
    console.log('Error - could not parse the env file');
    return;
  }

  // if provided, set the NODE_ENV
  process.env.NODE_ENV = configuration.NODE_ENV;
  app.start(configuration);
})();