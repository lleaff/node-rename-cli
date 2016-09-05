#!/usr/bin/env node

/* =Utility functions
 *------------------------------------------------------------*/

/**
 * @return { ([accepted[],rejected[]]) }
 */
Array.prototype.partition = Array.prototype.partition || function partition(predicate, thisArg) {
        const self = (thisArg || this);
        var truePart  = [],
            falsePart = [];
        self.forEach((val, i, col) => {
            ((predicate(val, i, col)) ? truePart : falsePart).push(val);
        });
        return [truePart, falsePart];
    };

/**
 * @param { ([accepted[],rejected[]]) => {} } completionCb
 */
Array.prototype.partitionAsync = Array.prototype.partitionAsync || function partitionAsync(predicateAsync, completionCb) {
        var self = this.slice();
        var results = Array(this.length);
        var processed = 0;

        self.forEach((val, i) => {
            predicateAsync(val, valid => {
                results[i] = valid;
                processed++;
                if (processed === self.length) {
                    completion();
                }
            });
        });

        function completion() {
            const partitioned = self.partition((_, i) => results[i]);
            completionCb(partitioned);
        }
    };

/**
 * 
 * @param { (val, cb) => { cb(result) } } transformAsync
 */
Array.prototype.mapAsync = Array.prototype.mapAsync || function mapAsync(transformAsync, completionCb) {
        var self = this.slice();
        var results = Array(this.length);
        var processed = 0;

        self.forEach((val, i, col) => {
            transformAsync(val, result => {
                results[i] = result;
                processed++;
                if (processed === self.length) {
                    completion();
                }
            });
        });

        function completion() {
            completionCb(results);
        }
    };

Object.prototype.find = Object.prototype.find || function find(predicate, thisArg) {
        const self = thisArg || this;
        const keys = Object.keys(self);
        return keys.find(key => predicate(self[key], key, self));
    };


Object.values = Object.values || function values(object) {
        const keys = Object.keys(object);
        return keys.map(key => object[key]);
    };

/* =CLI arguments parsing
 *------------------------------------------------------------*/

const fs = require('fs')

const { dirname, basename } = require('path');

const [, scriptPath, ...args] = process.argv

const OPTION_DEFINITIONS = {
    help: {
        short: 'h', long: 'help', defaultValue: false,
        description: 'Show this help.', callback: opts => {
            console.error(USAGE);
            process.exit(0);
        }
    },
    verbose: {
        short: 'v', long: 'verbose', defaultValue: true,
        description: "Print extended information."
    },
    dryRun: {
        short: 'd', long: 'dry-run', defaultValue: false,
        description: "Don't modify any file.", callback: opts => {
            opts.verbose = true
        }
    },
};

const USAGE = (() => {
    function generateOptionHelp(opt) {
        var help = '  ';
        if (opt.short) { help += `-${opt.short}` }
        if (opt.long) { help += `${opt.long ? ', ' : ''}--${opt.long} `}
        if (opt.description) { help += `\t${opt.description}` }
        return `${help}\n`;
    }
    const description = `${basename(scriptPath)} [OPTION]... EXPRESSION REPLACEMENT FILE...\n`;
    const optionDescriptions = Object.values(OPTION_DEFINITIONS)
                                                .reduce((p, opt) => `${p ? `${p}` : ''}${generateOptionHelp(opt)}`,
                                                        null);
    return `${description}\n${optionDescriptions}`;
})();


const [[expression, replacement, ...files], options] = args.partition(arg => arg[0] !== '-');

function parseOptions(defs, args) {
    var options = {};
    
    args.forEach(arg => {
        if (/^--/.test(arg)) { /* long option */
            const long = arg.replace(/^--/, '');
            const option = defs.find(opt => opt.long === long);
            activateOption(option);
        } else { /* short options */
            const shorts = arg.replace(/-/, '');
            shorts.split('').forEach(short => {
                const option = defs.find(opt => opt.short === short);
                activateOption(option);
            });
        }
    })
    
    function activateOption(option) {
        if (!option) {
            return;
        }
        options[option] = true;
        if (defs[option].callback) {
            defs[option].callback(options);
        }
    }
    
    Object.keys(defs).forEach(opt => {
        if (options[opt] === undefined) {
            options[opt] = defs[opt].defaultValue;
        }
    });
    return options;
}

/* =Globals setup
 *------------------------------------------------------------*/

const OPTS = parseOptions(OPTION_DEFINITIONS, options);

if (OPTS.help) {
    console.error(USAGE);
    process.exit(0);
}
if (files === undefined) {
    console.error(USAGE);
    process.exit(1);
}


const fsRename = !OPTS.dryRun ? fs.rename : (_old, _new, cb) => { cb(); };

const regexpExpression = new RegExp(expression);

function log() {
    if (OPTS.verbose) {
        console.log.call(console, ...arguments);
    }
}

var failed = false;
function logfailure() {
    console.error.call(console, 'ERROR: ', ...arguments);
    failed = true;
}

/* =
 *------------------------------------------------------------*/

/**
 * @param { (bool, Stats) => {} } callback
 */
function validFile(file, callback) {
    fs.stat(file, (err, stats) => { callback(!err, stats) });
}

function getRenamedPath(expression, replacement, filePath) {
    const filePart = basename(filePath);
    if (!expression.test(filePart)) {
        return null;
    }
    const dirName = dirname(filePath);
    const dirPart = dirName === '.' ? '' : `${dirName}/`;
    const newName = filePart.replace(expression, replacement);
    return `${dirPart}${newName}`;
}

function renameWith(nameTransformFn, filePath, callback) {
    const newPath = nameTransformFn(filePath);
    if (newPath !== null) {
        fsRename(filePath, newPath, (err) => {
            if (err) {
                logfailure(`FAILED "${filePath}" => "${newPath}":`, err);
            }
            callback && callback([filePath, newPath]);
        });
        return [filePath, newPath];
    }
    callback && callback([filePath, null]);
    return [filePath, null];
}

function rename(expr, repl, filePath, callback) {
    return renameWith(p => getRenamedPath(expr, repl, p),
                      filePath,
                      callback);
}

function main() {
    files.partitionAsync(validFile, ([files, invalidFiles]) => {
        if (invalidFiles.length !== 0) {
            invalidFiles.forEach(name => { logfailure(`INVALID FILE "${name}".`) });
            process.exit(1);
        }
        files.mapAsync(
            (file, cb) => rename(regexpExpression, replacement, file, cb),
            completion);
    })

    function completion(operations) {
        const renameOps = operations.filter(([oldName, newName]) => newName);
        renameOps.forEach(([oldName, newName]) => {
            log(`"${oldName}" => "${newName}"`);
        });
        log(`Renamed ${renameOps.length} out of ${files.length} files given.`);
        process.exit(failed ? 1 : 0)
    }
}
main();
