/* eslint-disable max-classes-per-file */

import isPlainObject from "./is-plain-object";

import {
  opaqueFunctionDeprecationWarning,
  possibleIncorrectUpdateCreatorUseWarning,
} from "./warnings";

const EMPTY = {};

const hasOwnProperty = Object.prototype.hasOwnProperty;
function hasOwn(object, property) {
  return hasOwnProperty.call(object, property);
}

function isFunction(value) {
  return typeof value === "function";
}
function isObject(value) {
  return (typeof value === "object" && value !== null) || isFunction(value);
}

class Replace {
  constructor(value) {
    this.value = value;
  }
}

class Chain {
  constructor(updates) {
    this.updates = updates;
  }
}

const GlobalContext = {
  isInTransform: false,
  markedUpdate: null,
};

const symbols = {
  opaque: Symbol("@@combineObjects/opaque"),
  remove: Symbol("@@combineObjects/remove"),
  ignore: Symbol("@@combineObjects/ignore"),
  updateCreator: Symbol("@@combineObjects/updateCreator"),
  customMerge: Symbol("@@combineObjects/customMerge"),
};

function updateCreator(updateCreator) {
  if (isFunction(updateCreator)) {
    updateCreator[symbols.updateCreator] = true;
    return updateCreator;
  }
  throw new Error("updateCreator should only be called on functions.");
}

const replace = updateCreator((value) => new Replace(value));
const chain = updateCreator((...updates) => new Chain(updates));
const remove = updateCreator(() => symbols.remove);
const ignore = updateCreator(() => symbols.ignore);

const opaque = (value) => {
  if (!isPlainObject(value)) {
    opaqueFunctionDeprecationWarning();
    return replace(value);
  }
  value[symbols.opaque] = true;
  return value;
};

function update(updateValue) {
  if (!GlobalContext.isInTransform) {
    throw new Error(
      "update should only be called within executing transformers."
    );
  }

  GlobalContext.markedUpdate = updateValue;
  return updateValue;
}

const isReplace = (value) => value instanceof Replace;
const isIgnore = (value) => value === symbols.ignore;
const isOpaque = (value) => isObject(value) && !!value[symbols.opaque];
const isChain = (value) => value instanceof Chain;
const isRemove = (value) => value === symbols.remove;
const isTransform = (value) => isFunction(value);
const isScalar = (value, isUpdate) => {
  return (
    isOpaque(value) ||
    (!isPlainObject(value) && (!isUpdate || !isTransform(value)))
  );
};

function combineObjects(source, update) {
  const processedKeys = new Set();

  const sourcePropertyDescriptors = Object.getOwnPropertyDescriptors(source);
  const updatePropertyDescriptors = Object.getOwnPropertyDescriptors(update);

  const result = {};

  processKeys(Object.getOwnPropertyNames(source));
  processKeys(Object.getOwnPropertySymbols(source));
  processKeys(Object.getOwnPropertyNames(update));
  processKeys(Object.getOwnPropertySymbols(update));

  return result;

  function processKeys(keys) {
    for (const key of keys) {
      if (processedKeys.has(key)) continue;
      processedKeys.add(key);

      const sourcePropertyDescriptor = sourcePropertyDescriptors[key];
      const updatePropertyDescriptor = updatePropertyDescriptors[key];

      const sourceIsPresent = sourcePropertyDescriptor !== undefined;
      const sourceValue = sourceIsPresent ? source[key] : undefined;

      const updateIsPresent =
        updatePropertyDescriptor !== undefined &&
        updatePropertyDescriptor.enumerable;

      let resultValue;
      let resultIsPresent = true;
      if (updateIsPresent) {
        const updateValue = update[key];

        resultValue = internalCombine(
          sourceValue,
          updateValue,
          key,
          sourceIsPresent
        );

        if (isRemove(resultValue)) {
          resultIsPresent = false;
        }
      } else {
        resultValue = sourceValue;
      }

      if (resultIsPresent) {
        Object.defineProperty(result, key, {
          configurable: true,
          enumerable: sourceIsPresent
            ? sourcePropertyDescriptor.enumerable
            : true,
          value: resultValue,
          // we don't copy writable over, because this may not even be a value property
          // for computed properties we could derive writable by presence of a setter
          writable: true,
        });
      }
    }
  }
}

function internalCombineForTransformers(
  source,
  update,
  key = undefined,
  isPresent = true
) {
  const result = internalCombine(source, update, key, isPresent);
  const isResultPresent = !isRemove(result);
  return {
    value: isResultPresent ? result : undefined,
    isPresent: isResultPresent,
  };
}

function internalCombine(source, update, key = undefined, isPresent = true) {
  if (isChain(update)) {
    let result = source;
    let resultIsPresent = isPresent;
    for (const individualUpdate of update.updates) {
      const intermediateResult = internalCombine(
        result,
        individualUpdate,
        key,
        resultIsPresent
      );
      if (isRemove(intermediateResult)) {
        result = undefined;
        resultIsPresent = false;
      } else {
        result = intermediateResult;
        resultIsPresent = true;
      }
    }

    if (!resultIsPresent) {
      return remove();
    }
    return result;
  }

  if (isTransform(update)) {
    if (update[symbols.updateCreator]) {
      throw new Error(
        "Update creator cannot be called as transformer, creators should be called during update creation"
      );
    }

    let computedUpdate;
    const prevIsInTransform = GlobalContext.isInTransform;
    GlobalContext.isInTransform = true;
    const prevMarkedUpdate = GlobalContext.markedUpdate;
    let markedUpdate;
    try {
      computedUpdate = update(
        source,
        key,
        isPresent,
        internalCombineForTransformers
      );
    } finally {
      GlobalContext.isInTransform = prevIsInTransform;
      markedUpdate = GlobalContext.markedUpdate;
      GlobalContext.markedUpdate = prevMarkedUpdate;
    }

    if (isTransform(computedUpdate)) {
      if (markedUpdate !== computedUpdate) {
        possibleIncorrectUpdateCreatorUseWarning();
      }
    }

    return internalCombine(source, computedUpdate, key, isPresent);
  }

  if (isReplace(update)) {
    return update.value;
  }

  if (isIgnore(update)) {
    if (isPresent === false) {
      return remove();
    } else {
      return source;
    }
  }

  if (isScalar(update, true)) {
    return update;
  }

  if (isObject(source) && isFunction(source[symbols.customMerge])) {
    return source[symbols.customMerge](update, internalCombineForTransformers);
  }

  let mergeSource = source;
  if (!isPresent || isScalar(source, false)) {
    mergeSource = EMPTY; // allows nested function transforms to happen
  }

  return combineObjects(mergeSource, update);
}

function combine(source, update) {
  if (arguments.length < 2) {
    throw new Error("Not enough arguments");
  }
  const result = internalCombine(source, update);
  if (isRemove(result)) {
    throw new Error("Cannot return remove() from combine()");
  }
  return result;
}

combine.replace = replace;
combine.remove = remove;
combine.ignore = ignore;
combine.opaque = opaque;
combine.isOpaque = isOpaque;
combine.chain = chain;
combine.update = update;
combine.updateCreator = updateCreator;
combine.customMerge = symbols.customMerge;

export default combine;
