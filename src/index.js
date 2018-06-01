'use strict';

import isPlainObject from 'is-plain-object';

function isFunction (value) {
    return typeof value === 'function';
}
function isObject (value) {
    return (typeof value === 'object') && value !== null || isFunction(value);
}

const symbols = {
    replace: Symbol('@@combineObjects/replace'),
    opaque: Symbol('@@combineObjects/opaque'),
    opaqueFunction: Symbol('@@combineObjects/opaqueFunction'),
    remove: Symbol('@@combineObjects/remove'),
    scalars: Symbol('@@combineObjects/scalars'),
};

const replace = (obj) => { obj[symbols.replace] = true; return obj; };
const remove = () => symbols.remove;
const withScalars = (obj, scalars) => { obj[symbols.scalars] = scalars; return obj; };
const opaque = (obj) => {
    if (obj instanceof Function) {
        return {
            func: obj,
            [symbols.opaqueFunction]: true,
        };
    } else {
        obj[symbols.opaque] = true;
        return obj;
    }
};

const shouldRemove = (obj, key) => obj[key] === symbols.remove;

const isOpaqueFunction = (obj) => isObject(obj) && !!obj[symbols.opaqueFunction];
const isOpaque = (obj) => isObject(obj) && (!!obj[symbols.opaque] || !!obj[symbols.opaqueFunction]);
const hasScalars = (obj) => isObject(obj) && obj.hasOwnProperty(symbols.scalars);
const getScalars = (obj) => obj[symbols.scalars];
const isScalarProp = (obj, prop) => hasScalars(obj) && getScalars(obj).indexOf(prop) !== -1;

function canMerge (value, isUpdate) {
    if (!isPlainObject(value)) {
        return false;
    }
    if (isUpdate && value[symbols.replace]) {
        delete value[symbols.replace];
        return false;
    }
    if (isOpaque(value)) {
        return false;
    }
    return true;
}

// this is used in the case where the object needs to be copied without potential for merge, but function transforms could still be here
// I wonder if I can merge code paths earlier
function applyFunctionTransformScalar (source, update) {
    if (isFunction(update)) {
        return applyFunctionTransformScalar(source, update(source));
    }
    if (isOpaqueFunction(update)) {
        return update.func;
    }
    return update;
}

function removeIfNecessary (obj, prop) {
    if (shouldRemove(obj, prop)) {
        delete obj[prop];
    }
    return obj; // fluency
}

function merge (source, update) {
    const result = {};
    if (hasScalars(source)) {
        withScalars(result, getScalars(source));
    }
    Object.keys(source).forEach((key) => {
        if (update.hasOwnProperty(key)) {
            // don't merge scalar props
            if (isScalarProp(source, key)) {
                result[key] = applyFunctionTransformScalar(source[key], update[key]);
            } else {
                // eslint-disable-next-line no-use-before-define
                result[key] = internalCombineObjects(source[key], update[key]);
            }
            removeIfNecessary(result, key);
        } else {
            result[key] = source[key];
        }
    });
    // bring in other props from source
    // TODO maybe some way to optimize since, usually there won't be any new props
    Object.keys(update).forEach((key) => {
        if (!result.hasOwnProperty(key)) {
            result[key] = applyFunctionTransformScalar(undefined, update[key]);
            removeIfNecessary(result, key);
        }
    });

    return result;
}

function internalCombineObjects (source, update) {
    if (!canMerge(source, false) || !canMerge(update, true)) {
        if (isOpaqueFunction(update)) {
            return update.func;
        }
        if (isFunction(update)) {
            return internalCombineObjects(source, update(source));
        }
        return update;
    }
    return merge(source, update);
}
function combineObjects (source, ...updates) {
    return updates.reduce((src, update) => (
        internalCombineObjects(src, update)
    ), source);
}

combineObjects.replace = replace;
combineObjects.remove = remove;
combineObjects.withScalars = withScalars;
combineObjects.opaque = opaque;
combineObjects.isOpaque = isOpaque;
combineObjects.hasScalars = hasScalars;
combineObjects.getScalars = getScalars;
combineObjects.isScalarProp = isScalarProp;

export default combineObjects;
