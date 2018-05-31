'use strict';

import isPlainObject from 'is-plain-object';

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

const isOpaqueFunction = (obj) => !!obj[symbols.opaqueFunction];
const isOpaque = (obj) => !!obj[symbols.opaque] || !!obj[symbols.opaqueFunction];
const hasScalars = (obj) => obj.hasOwnProperty(symbols.scalars);
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

function merge (source, update) {
    let result = {};
    if (hasScalars(source)) {
        result = withScalars(getScalars(source));
    }
    Object.keys(source).forEach((key) => {
        if (update.hasOwnProperty(key)) {
            if (shouldRemove(update, key)) {
                return; // don't copy over key
            }
            // don't merge scalar props
            if (!isScalarProp(source, key)) {
                // eslint-disable-next-line no-use-before-define
                result[key] = internalCombineObjects(source[key], update[key]);
                return;
            }
        }
        result[key] = source[key];
    });
    // bring in other props from source
    // TODO maybe some way to optimize since, usually there want be any new props
    Object.keys(update).forEach((key) => {
        if (!result.hasOwnProperty(key) && !shouldRemove(update, key)) {
            result[key] = update[key];
        }
    });

    return result;
}

function internalCombineObjects (source, update) {
    if (!canMerge(source, false) || !canMerge(update, true)) {
        if (isOpaqueFunction(update)) {
            return update.func;
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
