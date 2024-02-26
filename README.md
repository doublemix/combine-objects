Combine Objects
=========

[![Build Status](https://travis-ci.org/doublemix/combine-objects.svg?branch=master)](https://travis-ci.org/doublemix/combine-objects) [![Coverage Status](https://coveralls.io/repos/github/doublemix/combine-objects/badge.svg?branch=master)](https://coveralls.io/github/doublemix/combine-objects?branch=master)

Simple library for combining objects, recursively.

## Installation

```shell
npm install --save @doublemx2/combine-objects
```

## Purpose

This library was designed to simplify working with `Object.assign` to update parts of deeply nested objects, in an immutable.

The goal was to simplify code like this:

```javascript
return Object.assign({}, state, {
  app: Object.assign({}, state.app, {
    feature: Object.assign({}, state.app.feature, {
      field: newValue,
    }),
  }),
});
```

Modern JavaScript has the object spread operator, `...`, which removes the `Object.assign` calls. However, even this gets cumbersome at deeply nested levels, as you need to spread the full path to the state.

```javascript
return {
  ...state,
  app: {
    ...state.app,
    feature: {
      ...state.app.feature,
      field: newValue,
    }
  }
}
```

## Usage

For the code above:

```javascript
import combine from '@doublemx2/combine-objects';

combine(state, {
  app: {
    feature: {
      field: newValue,
    },
  },
});
```

The general usage of the `combine` function:

```javascript
combine(source, update);
```

The library automatically merges properties from the `source` and `update` object.
Then it does this recursively for each property, until one of the values is a scalar, like string or number. In this case, the value is replaced with the value in `update`.
Properties not listed in the `update` are copied over (objects will be referentially equal).
Properties in `update`, but not in `source` will be created.
The operation will not mutate the `source` or `update`.

(Through this document `====` will be used to represent deep equals)

### What's mergable?

In general, plain JavaScript objects, like those created with an object literal are considered for merging. Function, arrays, objects created with `new` are generally not mergable. Also,  booleans, strings, numbers, Symbols, `undefined`, and `null` are not mergable. The term scalar is used to refer to unmergable values.

### Specific usages

To replace a property:

```javascript
combine({ x: 5, y: 6 }, { x: 8 }) ==== { x: 8, y : 6 }
```

To add a new a property:

```javascript
combine({ x: 5 }, {y : 6 }) ==== { x: 5, y: 6 }
```

To merge deeply nested properties:

```javascript
combine({
  deeply: {
    nested: {
      property: 5,
      x: 6,
    },
    y: 7,
  }
  z: 8,
}, {
  deeply: {
    nested: {
      property: 9,
    }
  }
}) ==== {
  deeply: {
    nested: {
      property: 9,
      x: 6,
    },
    y: 7,
  },
  z: 8
}
```

### Opting out of merge

The default behavior when the `source` and `update` are both plain objects is to merge the objects.  However, sometimes it is necessary to replace (rather than merge) an object. The library provides a handful of methods that allow this, each with slightly different semantics and use cases. They are all available as functions on the default export of the library.

#### Replace

The `replace` function is used on the `update` object to say that the object should replace whatever is in the `source`, even if its another plain object.
It can be used in properties as well:

```javascript
const replace = combine.replace;

combine({ x: 6 }, replace({ y: 7 })) ==== { y: 7 }
combine({
  x: { y: 7 },
}, {
  x: replace({ z: 8 }),
}) ==== {
  x: { z: 8 }
}
```

Note that `replace` only signifies to replace the property one time. The next combine has the potential to merge.

```javascript
const combined = combine(
  { x: 5 },
  replace({ y: 6 })
)

combine(
  combined,
  { z: 7 },
 ) ==== {
  y: 6,
  z: 7,
}
```

#### Opaque

Indicates that the object should be treated as though it is not mergable, like it's a string or number or something else scalar. It can be used in properties as well

```javascript
const opaque = combine.opaque;

combine({ x: 5 }, opaque({ y: 6 })) ==== { y: 6 }
combine({
  x: { y: 7 },
}, {
  x: opaque({ z: 8 }),
}) ==== {
  x: { z: 8 }
}
```

Opaqueness sticks with objects, unlike the effect of replace, so it cannot be merged even if it's in the source.

```javascript
const combined = combine(
  { x: 5 },
  opaque({ y: 6 })
)

combine(
  combined,
  { z: 7 },
) ==== { z: 7 }
```

**Note:** Opaque adds a (non-enumerable) property to objects to implement this feature.

### Removing properties

With the default behavior, properties can be updated and created, but not removed. The `remove` function, available on the default export allows for the removal of properties.

```javascript
const remove = combine.remove

combine({
  x: 5,
  y: 6,
}, {
  x: replace(), // need to call it
}) ==== {
  y: 6, // x was deleted
}
```

### Transforms

When a function is supplied as the value of an update, it is used to transform the current value to the new value. The function receives, as its first parameter, the current value. It will receive `undefined` if the property does not exist. It should return the new value. 

```javascript
combine({
  x: 5,
}, {
  x: it => it + 1,
}) ==== {
  x: 6
};
```

This can be useful for applying more complicated updates. For example, if we want to add a value to an array.

```javascript
combine(obj, { anArray: it => [...it, newElement] })
```

It's the user's responsibility to maintain immutability with function transforms (if desired)

It should be noted that functions transform are applied recursively as well. That means the library can return a mergable object that will be used to update the current value.

  ```javascript
  combine({
    x: { a: 7, b: 6 },
  }, {
    x: (x) => ({ sum: x.a + x.b }),
  }) ==== {
    x: { a: 7, b: 6, sum: 13 },
  };
  ```

The transforms can be used to tranform scalar objects/properties.

A transform can also elect to remove a property:

```javascript
combine({
  x: 5,
}, {
  x: (x) => x === 5 ? remove() : x,
}) ==== {};
```

Additionally, the property name will be passed as the second argument to the transformer, if the transformer is applied to an object property. This can be occasionally useful if property name was computed, and you need to use it to look up something in another object. The following example is contrived.

```javascript
const state = {
  currentId: 'abc',
  incrementValues: {
    abc: 5,
    def: 10,
  },
  counters: {
    abc: { count: 1 },
    def: { count: 2 },
  },
};
// increment current counter by associated incrementValue
const result = combine(state, {
  counters: {
    [state.currentId]: (counter, id) => ({
      count: (it) => it + state.incrementValues[id],
    }),
  },
});
result.counters ==== {
  abc: { count: 6 },
  def: { count: 2 },
};
```

<!-- TODO write about update functions conventions -->

You can use `replace` to preserve a function passed as an update, so that it does not get called as a transformer.

```javascript
function f () {}
const obj = combine({
  x: 5
}, {
  x: replace(() => {}),
});
obj.x === f;
```

### Ignoring a update (or using the source)

The `ignore` function can be used to instruct the `combine` function to use the source as the result without any merging (i.e. *ignore* the update). This maintains referential integrity.

```javascript
combine({ x: 5 }, ignore()) ==== { x: 5 }
combine({ x: { y: 6 } }, { x: ignore() }) ==== { x: { y: 6 } };

// Referential Integrity
const obj = {};
combine(obj, ignore()) === obj; // strict equals
combine({ x: obj }, { x: ignore() }).x === obj; // strict equals
```

This isn't particulary useful by itself, but can be useful if the update is constructed conditionally, or returned conditionally from a function transform. It can be used to disallow (ignore an update) if an invalid state is detected:

```javascript
const increment = (it) => it + 1;
const incrementIfEditing = (it) => it.editing ? { x: increment } : ignore();

combine({ editing: true, x: 5 }, incrementIfEditing).x === 6;
combine({ editing: false, x: 5 }, incrementIfEditing).x === 5; // did not increment
```

### Chains of updates

It is occasionally useful to apply multiple updates to the source. This is especially useful when composing reusable updates. Chain takes updates as variable arguments.

```javascript
const increment = it => it + 1
const double = it => it * it

combine(5, chain(increment, double)) ==== 12
```

## Notes

The `opaque` function sets a non-enumerable properties on the input. This is mutating, but necessary to effect the way the object behaves in the library. Typically, `opaque` will be called with a newly constructed object, so it can be seem as part of the construction (and not as a mutating operation).

If `opaque` is called on a non-mergable object, it will defer to `replace`. Mergable objects are the only values which are treating specially as either the update of the source, so `replace` suffices for all other values. It is considered deprecated behavior to use `opaque` on non-mergable objects, and may stop working in the future.

## Tests

```shell
npm test
```

## Coverage

```shell
npm run cover
```

### Changes

- v0.3.1
  - Updated this `README`
- v0.3.0
  - Addition of the `ignore` function.
- v0.2.5
  - Fixed bug where `replace` only worked with objects, it can now be used on anything (which can be useful when the input type is unknown)
  - Deprecated use of `opaque` to store functions. Use `replace`.
- v0.2.4
  - Fixed bug where function transforms did not work if they were placed deeper in the update than the source.
