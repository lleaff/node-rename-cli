import { printUsage } from './main';

export default {
    help: {
        short: 'h', long: 'help', defaultValue: false,
        description: 'Show this help.', callback: printUsage
    },
    verbose: {
        short: 'v', long: 'verbose', defaultValue: false,
        description: "Print extended information."
    },
    dryRun: {
        short: 'd', long: 'dry-run', defaultValue: false,
        description: "Don't modify any file."
    },
    ignoreCollisions: {
      short: 'C', long: 'ignore-collisions', defaultValue: false,
      description: "Force rename on collision conflicts."
    },
    skipProblematic: {
        short: 'S', long: 'skip-problematic', defaultValue: false,
        description: "Continue renaming non-problematic files instead of stopping on errors."
    },
};
