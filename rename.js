#!/usr/bin/env node

/* =Generic utilities
 *------------------------------------------------------------*/

/**
 * @return { ([accepted[],rejected[]]) }
 */
Array.prototype.partition = Array.prototype.partition || function partition(predicate, thisArg = null) {
        let truePart  = [],
            falsePart = [];
        this.forEach((val, i, col) => {
            ((predicate.call(thisArg, val, i, col)) ? truePart : falsePart).push(val);
        });
        return [truePart, falsePart];
    };

/**
 * @param { ([accepted[],rejected[]]) => {} } completionCb
 */
Array.prototype.partitionAsync = Array.prototype.partitionAsync || function partitionAsync(predicateAsync, completionCb) {
        const self = this.slice();
        let results = Array(this.length);
        let processed = 0;

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
        const self = this.slice();
        let results = Array(this.length);
        let processed = 0;

        self.forEach((val, i) => {
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

Array.prototype.occurences = Array.prototype.occurences || function occurences() {
        let occ = new Map(this.map(val => [val, 0]));
        this.forEach(val => {
            occ.set(val, occ.get(val) + 1);
        });
        return occ;
    };

Object.entries = Object.entries || function entries(obj) {
        return Object.keys(obj).map(key => [key, obj[key]]);
    };

Object.values = Object.values || function values(object) {
        const keys = Object.keys(object);
        return keys.map(key => object[key]);
    };


Object.prototype.forEach = Object.prototype.forEach || function forEach(callback, thisArg = null) {
        Object.entries(this).forEach((
            (entry, i) => callback.call(thisArg, entry, i, this)).bind(this));
    };

Object.filter = Object.filter || function filter(obj, predicate, thisArg = null) {
        let newObj = Object.assign({}, obj);
        Object.entries(this).forEach(((entry, i) => {
            if (!predicate.call(thisArg, entry, i, obj)) {
                const key = entry[0];
                delete newObj[key];
            }
        }));
        return newObj;
    };

Object.prototype.map = Object.prototype.map || function map(callback, thisArg = null) {
        let newObj = {};
        this.forEach((entry, i, obj) => {
            const [newKey, newVal] = callback.call(thisArg, entry, i, obj);
            newObj[newKey] = newVal;
        });
        return newObj;
    };

Object.prototype.find = Object.prototype.find || function find(predicate, thisArg = null) {
        const self = this;
        const keys = Object.keys(this);
        return keys.find(key => predicate.call(thisArg, [key, self[key]], key, self)) ;
    };

Map.prototype.filter = Map.prototype.filter || function filter(predicate, thisArg = null) {
        const self = this;
        return new Map([...this.entries()].filter((entry, i) => predicate(entry, i, self), thisArg));
    };


/**
 * Allow passing in flags in a RegExp string
 * @example
 * parseRegExp("/hello/gi")
 * //=> /hello/gi
 * new RegExp("/hello/gi")
 * //=> /\/hello\/gi/
 * @param {string} expr
 */
function parseRegExp(expr) {
    const skeleton = /^\/(.*)\/([A-Za-z]*)$/;
    let [, body, flags] = expr.match(skeleton) || [];
    return body ? new RegExp(body.replace(/\\\//g, '/'), flags) :
                  new RegExp(expr);
}


/* =CLI arguments parsing
 *------------------------------------------------------------*/

const fs = require('fs')

const { dirname, basename } = require('path');

const [, scriptPath, ...args] = process.argv

function generateUsage({ progDescription, optionDefinitions }) {
    function generateOptionHelp({ short, long, description = '' }) {
        let switches = [];
        if (short) { switches.push(`-${short}`); }
        if (long) { switches.push(`--${long}`); }
        return { switches: switches.join(', '), description: description};
    }
    let optInfos = Object.values(optionDefinitions).map(generateOptionHelp);
    /* Generate padding */
    const maxOptSwitchesLength = optInfos.map(({switches}) => switches.length)
                                         .reduce((p, c) => p > c ? p : c, 0);
    optInfos = optInfos.map(({ switches, description }) => ({
      switches: switches + Array(
            Math.max(0, maxOptSwitchesLength - switches.length + 1)).join(" "),
      description
    }));
    const optionDescriptions = optInfos.map(({ switches, description }) =>
                                           `${switches} ${description}`)
                                       .join('\n');
    return `${progDescription}\n${optionDescriptions}`;
}


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
    ignoreCollisions: {
      short: 'C', long: 'ignore-collisions', defaultValue: false,
      description: "Force rename on collision conflicts."
    },
};

const USAGE = generateUsage({
  progDescription: `${basename(scriptPath)} [OPTION]... EXPRESSION REPLACEMENT FILE\n`,
  optionDefinitions: OPTION_DEFINITIONS
});

const [[expression, replacement, ...files], options] = args.partition(arg => arg[0] !== '-');


function activateOption(options, defs, option) {
    options[option] = true;
    if (defs[option].callback) {
        defs[option].callback(options);
    }
}


function parseOptions(defs, args) {
    var options = {};

    args.forEach(arg => {
        if (/^--/.test(arg)) { /* long option */
            const long = arg.replace(/^--/, '');
            const option = defs.find(([opt, def]) => (def.long === long));
            if (!option) {
                logfailure(`No such option: --${long}`);
                process.exit(1);
            }
            activateOption(options, defs, option);
        } else { /* short options */
            const shorts = arg.replace(/-/, '').split('');
            shorts.forEach(short => {
                const option = defs.find(([opt, def]) => (def.short === short));
                if (!option) {
                    logfailure(`No such option: -${short}`);
                    process.exit(1);
                }
                activateOption(options, defs, option);
            });
        }
    })

    defs.forEach(([opt, def]) => {
        if (options[opt] === undefined) {
            options[opt] = def.defaultValue;
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
if (files.length === 0) {
    console.error(USAGE);
    process.exit(1);
}


const fsRename = !OPTS.dryRun ? fs.rename : (_old, _new, cb) => { cb(); };

const regexp = parseRegExp(expression);

/* =Specialized utilities
 *------------------------------------------------------------*/

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

function logCollisions(collisions) {
    logfailure(`Colliding files: ${
        collisions.map(collision =>
            `\n${collision.sources.map(c => `   "${c}"`).join(',\n')}\n=> "${collision.destination}"\n`
        ).join('\n')
        }`);
}

/* =Main
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

function getRenameOp(expression, replacement, file) {
    return [file, getRenamedPath(expression, replacement, file)];
}

/**
 *
 * @param {[orig,dest]} renameOps
 * @return collisions or null
 */
function checkNameCollisions(renameOps) {
    const destinations = renameOps.map(([orig, dest]) => dest);
    const duplicates = destinations.occurences()
                                   .filter(([, occurences]) => occurences > 1);
    const collisions = [...duplicates.entries()].map(([dest, ]) =>
                                        renameOps.filter(([orig, d]) => dest === d));
    if (collisions.length === 0) {
        return null;
    }
    return collisions.map(colliding => colliding.reduce(
        (p, [orig, dest]) => ({ sources: p.sources.concat(orig), destination: dest }),
        { sources: [], destination: '' }
    ));
}

function execRenameOp([filePath, newPath], callback) {
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

function checkInvalidFiles(invalidFiles) {
    if (invalidFiles.length !== 0) {
        invalidFiles.forEach(name => { logfailure(`INVALID FILE "${name}".`) });
        process.exit(1);
    }
}

function getRenameOps(files, match, subst, completion) {
    const renameOps = files.map(file => getRenameOp(regexp, replacement, file));
    const effectiveRenameOps = renameOps.filter(([oldName, newName]) => newName !== null);
    const collisions = checkNameCollisions(effectiveRenameOps);
    if (collisions) {
        logCollisions(collisions);
        process.exit(1);
    }
    completion(effectiveRenameOps);
}

function execRenameOps(renameOps, completion) {
    renameOps.mapAsync(execRenameOp, completion);
}

function finalization(renameOps) {
    renameOps.forEach(([oldName, newName]) => {
        log(`"${oldName}" => "${newName}"`);
    });
    log(`Renamed ${renameOps.length} out of ${files.length} files given.`);
    process.exit(failed ? 1 : 0)
}

function main() {
    files.partitionAsync(validFile, ([files, invalidFiles]) => {
        checkInvalidFiles(invalidFiles);
        getRenameOps(files, expression, replacement, (renameOps) => {
            execRenameOps(renameOps, (renameOps) => {
                finalization(renameOps);
            });
        });
    });
}
main();
