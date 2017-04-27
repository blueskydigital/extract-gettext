'use strict';

var program = require('commander'),
    _ = require('lodash'),
    fs = require('fs'),
    async = require('async'),
    scan = require('./scan'),
    path = require('path');

function run(program, source) {
    var paths = source.split(',').map(function(path) {
        return path + '/**/*';
    });
    var lang = program.lang ? program.lang : (
      program.args.length > 1 ? program.args[1] : null
    )
    var outputFile = lang ?
      path.join(program.output, lang + '.js') : program.output

    console.log('outfile: ' + outputFile);

    async.map(paths, scan, function(err, results) {
        var strings = results.reduce(function(strings, result) {
            return strings.concat(result);
        }, []);


        var existing = {};
        try {
          var content = fs.readFileSync(outputFile).toString('utf8');
          if(program.prefix && content.indexOf(program.prefix) === 0) {
            content = content.substring(program.prefix.length);
          }
          existing = JSON.parse(content);
        } catch(err) {
          if(err.code !== 'ENOENT' &&
            (err.message && err.message.indexOf('JSON') < 0) ) {
            console.error(err);
            return process.exit(err.errno);
          }
          // nothing ... existing = {}
        }

        strings = _.uniq(strings).sort().reduce(function(strings, string) {
            if(string in existing) {
              strings[string] = existing[string];
            } else {
              strings[string] = string;
            }
            return strings;
        }, {});

        var prefix = program.prefix ? program.prefix : ''
        if (program.output) {
          return fs.writeFile(
            outputFile,
            prefix + JSON.stringify(strings, null, 2) + '\n',
            process.exit
          );
        }

        console.log(JSON.stringify(strings, null, 2));

        return process.exit();
    });
}

program
    .command('*')
    .description('Scans for gettext functions __("literal") and __n("single", "plural", n )')
    .action(function(source) {
        run(program, source);
    });


program
    .version('0.0.1')
    .option('-o, --output [file]', 'Output file', String)
    .option('-p, --prefix [string]',
      'prefix put before JSON with extracted string (e.g."export default")', String)
    .option('-l, --lang [string]', 'lang code to create filename', String)
    .parse(process.argv);

if (program.args.length === 0) program.help();
