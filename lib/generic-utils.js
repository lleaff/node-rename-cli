/**
 * Warn before overriding a property if it exists
 */
export function override_prop(obj, prop, method) {
    if (process.env.NODE_ENV === "production") {
        if (typeof obj[prop] !== 'undefined') {
            console.warn(`Overriding "${prop}" in `, obj);
        }
    }
    obj[prop] = method;
}

export function noop() {
}

export function identity(a) {
    return a;
}

export function array_insert(array, i, item) {
    return [...array.slice(0, i), item, ...array.slice(i)];
}

/**
 * @example
 * [{ color: 'red', weight: 8 }, { color: 'blue', weight: 9 }].pluck('color')
 * //=> [ 'red', 'blue' ]
 */
override_prop(Array.prototype, 'pluck',
    function pluck(propName) {
        return this.map(obj => obj[propName]);
    });


override_prop(Array.prototype, 'has',
    function has(item) {
        return this.indexOf(item) !== -1;
    });

/**
 * @return { ([accepted[],rejected[]]) }
 */
override_prop(Array.prototype, 'partition',
    function partition(predicate, thisArg = null) {
        let truePart  = [],
            falsePart = [];
        this.forEach((val, i, col) => {
            ((predicate.call(thisArg, val, i, col)) ? truePart : falsePart).push(val);
        });
        return [truePart, falsePart];
    });

/**
 * @param { ([accepted[],rejected[]]) => {} } completionCb
 */
override_prop(Array.prototype, 'partitionAsync',
    function partitionAsync(predicateAsync, completionCb) {
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
    });

/**
 *
 * @param { (val, cb) => { cb(result) } } transformAsync
 */
override_prop(Array.prototype, 'mapAsync',
    function mapAsync(transformAsync, completionCb) {
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
    });

override_prop(Array.prototype, 'occurences',
    function occurences() {
        let occ = new Map(this.map(val => [val, 0]));
        this.forEach(val => {
            occ.set(val, occ.get(val) + 1);
        });
        return occ;
    });

override_prop(Object, 'entries',
    function entries(obj) {
        return Object.keys(obj).map(key => [key, obj[key]]);
    });

override_prop(Object ,'values',
    function values(object) {
        const keys = Object.keys(object);
        return keys.map(key => object[key]);
    });


override_prop(Object.prototype, 'forEach',
    function forEach(callback, thisArg = null) {
        Object.entries(this).forEach((
            (entry, i) => callback.call(thisArg, entry, i, this)).bind(this));
    });

override_prop(Object.prototype, 'filter',
    function filter(obj, predicate, thisArg = null) {
        let newObj = Object.assign({}, obj);
        Object.entries(this).forEach(((entry, i) => {
            if (!predicate.call(thisArg, entry, i, obj)) {
                const key = entry[0];
                delete newObj[key];
            }
        }));
        return newObj;
    });

override_prop(Object.prototype, 'map',
    function map(callback, thisArg = null) {
        let newObj = {};
        this.forEach((entry, i, obj) => {
            const [newKey, newVal] = callback.call(thisArg, entry, i, obj);
            newObj[newKey] = newVal;
        });
        return newObj;
    });

override_prop(Object.prototype, 'find',
    function find(predicate, thisArg = null) {
        const self = this;
        const keys = Object.keys(this);
        return keys.find(key => predicate.call(thisArg, [key, self[key]], key, self)) ;
    });

override_prop(Map.prototype, 'filter',
    function filter(predicate, thisArg = null) {
        const self = this;
        return new Map([...this.entries()].filter((entry, i) => predicate(entry, i, self), thisArg));
    });


/**
 * Allow passing in flags in a RegExp string
 * @example
 * parseRegExp("/hello/gi")
 * //=> /hello/gi
 * new RegExp("/hello/gi")
 * //=> /\/hello\/gi/
 * @param {string} expr
 */
export function parseRegExp(expr) {
    const skeleton = /^([\/#])(.*)(\1)([A-Za-z]*)$/;
    let [,, body,, flags] = expr.match(skeleton) || [];
    return body ? new RegExp(body.replace(/\\\//g, '/'), flags) :
        new RegExp(expr);
}

/**
 * Take a Node.js callback style async function and return a function that returns a Promise instead.
 * @param {function(..., cb)} fn - A function taking a callback as last argument,
 *      and to which it will pass eventual errors as first argument.
 * @param {int} [callbackPos] - Manually specify callback argument position, default to end
 */
export function promisify(fn, callbackPos) {
    const pos = callbackPos === undefined ? fn.length - 1 :callbackPos;

    return function promisified() {
        const promisifiedArgs = Array.prototype.slice.call(arguments);
        return new Promise(function (resolve, reject) {
            function promisifiedCallback(err, ...resolveArgs) {
                if (err) {
                    reject(err);
                } else {
                    resolve.apply(this, resolveArgs);
                }
            }
            const args = array_insert(promisifiedArgs, pos, promisifiedCallback);
            fn.apply(this, args);
        });
    };
}

