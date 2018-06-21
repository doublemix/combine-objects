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

const shouldRemove = (obj, prop) => obj[prop] === symbols.remove;

const isOpaqueFunction = (obj) => isObject(obj) && !!obj[symbols.opaqueFunction];
const isOpaque = (obj) => isObject(obj) && (!!obj[symbols.opaque] || !!obj[symbols.opaqueFunction]);
const hasScalars = (obj) => isObject(obj) && obj.hasOwnProperty(symbols.scalars);
const getScalars = (obj) => obj[symbols.scalars];
const isScalarProp = (obj, prop) => hasScalars(obj) && getScalars(obj).indexOf(prop) !== -1;

function removeIfNecessary (obj, prop) {
    if (shouldRemove(obj, prop)) {
        delete obj[prop];
    }
    return obj; // fluency
}

function combineObjects (source, update) {
    const result = {};
    if (hasScalars(source)) {
        withScalars(result, getScalars(source));
    }
    [
        ...Object.keys(source),
        ...Object.keys(update),
    ].forEach((prop) => {
        if (result.hasOwnProperty(prop)) {
            return; // already processed
        }
        if (update.hasOwnProperty(prop)) {
            // I have to ignore this with my implementation
            // eslint-disable-next-line no-use-before-define
            result[prop] = internalCombine(source[prop], update[prop], prop, isScalarProp(source, prop));
            removeIfNecessary(result, prop);
        } else {
            result[prop] = source[prop];
        }
    });

    return result;
}

function canCombine (value, isUpdate) {
    if (!isPlainObject(value)) {
        return false;
    }
    if (isUpdate && value[symbols.replace]) {
        return false;
    }
    if (isOpaque(value)) {
        return false;
    }
    return true;
}

function shouldReplace (source, update) {
    return (!canCombine(source, false) || !canCombine(update, true));
}

function internalCombine (source, update, key = undefined, isScalarField = false) {
    if (shouldReplace(source, update)) {
        if (isOpaqueFunction(update)) {
            return update.func;
        }
        if (isFunction(update)) {
            return internalCombine(source, update(source, key), key, isScalarField);
        }
        return update;
    }
    if (isScalarField) {
        return update;
    }
    return combineObjects(source, update);
}
function combine (source, ...updates) {
    return updates.reduce((src, update) => (
        internalCombine(src, update)
    ), source);
}

combine.replace = replace;
combine.remove = remove;
combine.withScalars = withScalars;
combine.opaque = opaque;
combine.isOpaque = isOpaque;
combine.hasScalars = hasScalars;
combine.getScalars = getScalars;
combine.isScalarProp = isScalarProp;

export default combine;
