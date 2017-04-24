import { parseRegExp } from './../lib/generic-utils';
import { failed, log, logArguments, logFailure } from './cli-output';
import renameFiles from './../lib/rename-files';


/* =CLI arguments parsing
 *------------------------------------------------------------*/

import { basename } from 'path';

const [, scriptPath, ...args] = process.argv;

function generateUsage({ progDescription, optionDefinitions }) {
    function generateOptionHelp({ short, long, description = '' }) {
        let switches = [];
        if (short) { switches.push(` -${short}`); }
        if (long)  { switches.push(`--${long}`); }
        return { switches: switches.join(', '), description: description};
    }
    let optInfos = Object.values(optionDefinitions).map(generateOptionHelp);
    /* Generate padding */
    const maxOptSwitchesLength = optInfos.map(({switches}) => switches.length)
                                         .reduce((p, c) => p > c ? p : c, 0);
    optInfos = optInfos.map(({ switches, description }) => ({
                switches: switches + Array(
                        Math.max(0, maxOptSwitchesLength - switches.length + 1) /* padding length */
                    ).join(" "),
                description
            }));
    const optionDescriptions = optInfos.map(({ switches, description }) =>
                                           `${switches} ${description}`)
                                       .join('\n');
    return ` ${progDescription}\n${optionDescriptions}`;
}


import OPTION_DEFINITIONS from './OPTION_DEFINITIONS';

const USAGE = generateUsage({
  progDescription: `${basename(scriptPath)} [OPTION]... PATTERN REPLACEMENT FILE...\n`,
  optionDefinitions: OPTION_DEFINITIONS
});

export function printUsage() {
    console.error(USAGE);
    process.exit(0);
}

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
                logFailure(`No such option: --${long}`);
                process.exit(1);
            }
            activateOption(options, defs, option);
        } else { /* short options */
            const shorts = arg.replace(/-/, '').split('');
            shorts.forEach(short => {
                const option = defs.find(([opt, def]) => (def.short === short));
                if (!option) {
                    logFailure(`No such option: -${short}`);
                    process.exit(1);
                }
                activateOption(options, defs, option);
            });
        }
    });

    defs.forEach(([opt, def]) => {
        if (options[opt] === undefined) {
            options[opt] = def.defaultValue;
        }
    });
    return options;
}

/* =Globals setup
 *------------------------------------------------------------*/

export const OPTS = parseOptions(OPTION_DEFINITIONS, options);

if (OPTS.help) {
    console.error(USAGE);
    process.exit(0);
}
if (files.length === 0) {
    console.error(USAGE);
    process.exit(1);
}

const regexp = parseRegExp(expression);

/* =Execution
 *------------------------------------------------------------*/

logArguments({ regexp, replacement });
renameFiles(files, regexp, replacement, OPTS).then(function finalization(renameOps) {
    renameOps.forEach(([oldName, newName]) => {
        log(`"${oldName}" => "${newName}"`, /*force: */ OPTS.dryRun);
    });
    log(`Renamed ${renameOps.length} out of ${files.length} files given.`);
    process.exit(failed ? 1 : 0);
});
