import { OPTS } from './main';
import { identity } from '../lib/generic-utils';

export const COLORS = {
    reset:      "\x1b[0m",
    bright:     "\x1b[1m",
    dim:        "\x1b[2m",
    underscore: "\x1b[4m",
    blink:      "\x1b[5m",
    reverse:    "\x1b[7m",
    hidden:     "\x1b[8m",
    fgBlack:    "\x1b[30m",
    fgRed:      "\x1b[31m",
    fgGreen:    "\x1b[32m",
    fgYellow:   "\x1b[33m",
    fgBlue:     "\x1b[34m",
    fgMagenta:  "\x1b[35m",
    fgCyan:     "\x1b[36m",
    fgWhite:    "\x1b[37m",
    bgBlack:    "\x1b[40m",
    bgRed:      "\x1b[41m",
    bgGreen:    "\x1b[42m",
    bgYellow:   "\x1b[43m",
    bgBlue:     "\x1b[44m",
    bgMagenta:  "\x1b[45m",
    bgCyan:     "\x1b[46m",
    bgWhite:    "\x1b[47m",
}.map(process.stdout.isTTY ? identity : ([name, code]) => [name, '']);


/**
 * @param {boolean} force - Force displaying of log even if verbose is false
 */
export function log(msg, force) {
    if (!OPTS.verbose && !force) {
        return;
    }
    console.log(msg);
}

export let failed = false;
export function logFailure() {
    console.error.apply(console, [`${COLORS.fgRed}ERROR: `, ...arguments, ...(COLORS.reset ? [COLORS.reset] : [])]);
    failed = true;
}

export function logCollisions(collisions) {
    (!OPTS.skipProblematic ? logFailure : log)(`Colliding files: ${
        collisions.map(collision =>
            `\n${collision.sources.map(c => `   "${c}"`).join(',\n')}\n=> "${collision.destination}"\n`
        ).join('\n')
        }`);
}

export function logArguments({ regexp, replacement }) {
    log(`Expression: "${regexp}"`);
    log(`Replacement: "${replacement}"`)
}
