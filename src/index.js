/* eslint-disable max-classes-per-file */

import isPlainObject from './is-plain-object';

import { opaqueFunctionDeprecationWarning } from './warnings';

const EMPTY = {};

function isFunction(value) {
  return typeof value === 'function';
}
function isObject(value) {
  return ((typeof value === 'object') && value !== null) || isFunction(value);
}

class Replace {
  constructor(value) {
    this.value = value;
  }
}

class Chain {
  constructor (updates) {
    this.updates = updates;
  }
}

class Remove {}
class Ignore {}

const symbols = {
  opaque: '@@combineObjects/opaque',
  remove: new Remove(),
  ignore: new Ignore(),
};

function setSymbolLikeProperty(obj, property, value) {
  Object.defineProperty(obj, property, {
    value,
    writable: true,
    enumerable: false,
    configurable: true,
  });
}

const replace = (obj) => new Replace(obj);
const chain = (...updates) => new Chain(updates);
const remove = () => symbols.remove;
const ignore = () => symbols.ignore;

const opaque = (obj) => {
  if (!isPlainObject(obj)) {
    opaqueFunctionDeprecationWarning();
    return replace(obj);
  }
  setSymbolLikeProperty(obj, symbols.opaque, true);
  return obj;
};

const shouldRemove = (obj, prop) => obj[prop] === symbols.remove;

const isReplace = (obj) => obj instanceof Replace;
const isIgnore = (obj) => obj instanceof Ignore;
const isOpaque = (obj) => isObject(obj) && !!obj[symbols.opaque];

function removeIfNecessary(obj, prop) {
  if (shouldRemove(obj, prop)) {
    // eslint-disable-next-line no-param-reassign
    delete obj[prop];
  }
  return obj; // fluency
}

function combineObjects(source, update) {
  const result = {};
  [
    ...Object.keys(source),
    ...Object.keys(update),
  ].forEach((prop) => {
    if (Object.prototype.hasOwnProperty.call(result, prop)) {
      return; // already processed
    }
    if (Object.prototype.hasOwnProperty.call(update, prop)) {
      // mutually recursive functions
      // eslint-disable-next-line no-use-before-define
      result[prop] = internalCombine(source[prop], update[prop], prop);
      removeIfNecessary(result, prop);
    } else {
      result[prop] = source[prop];
    }
  });

  return result;
}

function shouldReplace(source, update) {
  return (
    !isPlainObject(source)
        || !isPlainObject(update)
        || isOpaque(source)
  );
}

function internalCombine(source, update, key = undefined) {
  if (isFunction(update)) {
    return internalCombine(source, update(source, key), key);
  }
  if (isOpaque(update)) {
    return update;
  }
  if (isReplace(update)) {
    return update.value;
  }
  if (isIgnore(update)) {
    return source;
  }
  if (shouldReplace(source, update)) {
    if (isPlainObject(update)) {
      return combineObjects(EMPTY, update); // allows nested function transforms to happen
    }
    return update;
  }
  return combineObjects(source, update);
}
function internalCombine2(source, update) {
  const result = internalCombine(source, update);
  return result === symbols.remove ? undefined : result;
}
function internalCombine3(source, update) {
  if (update instanceof Chain) {
    return update.reduce((src, singleUpdate) => {
      internalCombine3(source, singleUpdate)
    }, source)
  }
  return internalCombine2(source, update)
}
function combine(source, ...updates) {
  let update = updates[0]
  if (updates.length > 1) {
    multipleUpdatesWarning()
    update = chain(updates)
  }
  return internalCombine3(source, update)
}


combine.replace = replace;
combine.remove = remove;
combine.ignore = ignore;
combine.opaque = opaque;
combine.isOpaque = isOpaque;
combine.chain = chain;

export default combine;
export {
  replace,
  remove,
  ignore,
  opaque,
  isOpaque,
  chain,
}
