/* eslint-disable max-classes-per-file */

import isPlainObject from './is-plain-object';

import { multipleUpdatesDeprecationWarnings, opaqueFunctionDeprecationWarning } from './warnings';

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
const isChain = (obj) => obj instanceof Chain;
const isRemove = (value) => value === symbols.remove;

function removeIfNecessary(obj, prop) {
  if (shouldRemove(obj, prop)) {
    // eslint-disable-next-line no-param-reassign
    delete obj[prop];
  }
  return obj; // fluency
}

function combineObjects(source, update) {
  const result = {};
  const keysToUpdate = Object.keys(source)
  for (const key of Object.keys(update)) {
    if (!keysToUpdate.includes(key)) {
      keysToUpdate.push(key)
    }
  }
  keysToUpdate.forEach((prop) => {
    if (Object.prototype.hasOwnProperty.call(update, prop)) {
      // mutually recursive functions
      // eslint-disable-next-line no-use-before-define
      result[prop] = internalCombine(source[prop], update[prop], prop, Object.hasOwnProperty.call(source, prop));
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

function internalCombine(source, update, key = undefined, isPresent = true) {
  if (isChain(update)) {
    let _result = source
    let _isPresent = isPresent

    for (const _update of update.updates) {
      var _intermediateResult = internalCombine(_result, _update, key, _isPresent)
      if (isRemove(_intermediateResult)) {
        _result = undefined
        _isPresent = false
      } else {
        _result = _intermediateResult
        _isPresent = true
      }
    }

    return _isPresent === false ? remove() : _result
  }
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
    if (isPresent === false) {
      return remove()
    } else {
      return source;
    }
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
function combine(source, ...updates) {
  let update = updates[0]
  if (updates.length !== 1) {
    multipleUpdatesDeprecationWarnings()
    update = chain(...updates)
  }
  return internalCombine2(source, update)
}


combine.replace = replace;
combine.remove = remove;
combine.ignore = ignore;
combine.opaque = opaque;
combine.isOpaque = isOpaque;
combine.chain = chain;

export default combine;
export {
  combine,
  replace,
  remove,
  ignore,
  opaque,
  isOpaque,
  chain,
}
