import { promisify } from './generic-utils';
import { logFailure, logCollisions } from '../src/cli-output';
import fs from 'fs';
import path from 'path';

const fsP = {
    rename: promisify(fs.rename),
    stat:   promisify(fs.stat)
};



function validFile(file) {
    return fsP.stat(file).then((stat) => Promise.resolve(stat),
        (err) => Promise.resolve(false));
}

/**
 * @param {boolean} valid
 * @returns {Promise.<{string, boolean}>}}
 */
function validateFile(file) {
    return validFile(file).then((validity) => Promise.resolve({ name: file, validity }));
}

function getRenamedPath(expression, replacement, filePath) {
    const filePart = path.basename(filePath);
    if (!expression.test(filePart)) {
        return null;
    }
    const dirName = path.dirname(filePath);
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

function handleCollisions(renameOps, options = {}) {
    if (options.ignoreCollisions) {
        return renameOps;
    }
    const collisions = checkNameCollisions(renameOps);
    if (collisions) {
        logCollisions(collisions);
        if (options.skipProblematic) {
            const affectedSources = collisions.reduce((p, { sources }) => p.concat(sources), []);
            return renameOps.filter(([oldName]) => !affectedSources.has(oldName));
        } else {
            return false;
        }
    }
    return renameOps;
}

function execRenameOp([filePath, newPath], options = {}) {
    const fsPRename = !options.dryRun ? fsP.rename : (_old, _new) => new Promise((resolve) => resolve());
    if (newPath !== null) {
        return fsPRename(filePath, newPath)
            .then(() => Promise.resolve([filePath, newPath]),
                (err) => Promise.reject(logFailure(`FAILED "${filePath}" => "${newPath}":`, err)));
    }
    return Promise.resolve([filePath, null]);
}

function checkInvalidFiles(invalidFiles) {
    if (invalidFiles.length !== 0) {
        invalidFiles.forEach(name => { logFailure(`INVALID FILE "${name}".`); });
        return false;
    }
    return true;
}

function getRenameOps(files, match, subst, options) {
    const renameOps = files.map(file => getRenameOp(match, subst, file));
    let effectiveRenameOps = renameOps.filter(
        ([oldName, newName]) => newName !== null && oldName !== newName);
    return handleCollisions(effectiveRenameOps, options);
}

function checkDestinationAvailability([source, destination]) {
    return validateFile(destination).then(({name, validity }) =>
        Promise[validity ? 'reject' : 'resolve']([source, destination]));
}

function logInvalidDestination([source, destination]) {
    logFailure(`"${source}" would be renamed as "${destination}" which already exists.`);
}


export default function renameFiles(files, regexp, replacement, options) {
    return Promise.all(files.map(validateFile))
        .then(files => {
            const [validFiles, invalidFiles] = files.partition(({name, validity}) => !!validity)
                .map(fls => fls.pluck('name'));
            return !checkInvalidFiles(invalidFiles) ?
                Promise.reject() :
                Promise.resolve(getRenameOps(validFiles, regexp, replacement, options));
        })
        .catch(err => console.error(err))
        .then(files => Promise.all(files.map(checkDestinationAvailability)))
        .catch((err) => logInvalidDestination(err))
        .then(renameOps => Promise.all(renameOps.map(op => execRenameOp(op, options))));

}
