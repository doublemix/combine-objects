Combine Objects
=========

[![Build Status](https://travis-ci.org/doublemix/combine-objects.svg?branch=master)](https://travis-ci.org/doublemix/combine-objects) [![Coverage Status](https://coveralls.io/repos/github/doublemix/combine-objects/badge.svg?branch=master)](https://coveralls.io/github/doublemix/combine-objects?branch=master)

Simple library for combining objects, recursively.

## Installation

    npm install --save @doublemx2/combine-objects

## Purpose

This library was inspired by dissatification working with `Object.assign` to combine deeply nested objects.

The goal is to simplify code like this:

    Object.assign({}, state, {
      app: Object.assign({}, state.app, {
        feature: Object.assign({}, state.app.feature, {
          field: newValue,
        }),
      }),
    });

## Usage

For the code above:

    import combine from '@doublemx2/combine-objects';

    combine(state, {
      app: {
        feature: {
          field: newValue,
        },
      },
    });

The general usage of the `combine` function:

    combine(source, update);

The library automatically merges properties the `source` and `update` object.
Then it does this recursively, until one of the values is unmergable, like string or number, which it replaces.
Properties not listed in the `update` are copied over (objects will be referentially equal).
Properties in `update`, but not in `source` will be created.
The operation will not mutate the `source` or `update`.

(Through this document `====` will be used to represent deep equals)

### What's mergable?

In general, plain javascript objects, like those created with a literal. Function, arrays, objects created with `new` are generally not mergable. Also, most booleans, strings, numbers, Symbols, `undefined`, and `null` should not be mergable. The term scalar is used to refer to unmergable values.

### Specific usages

To replace a property:

    combine({ x: 5, y: 6 }, { x: 8 }) ==== { x: 8, y : 6 }

To add a new a property:

    combine({ x: 5 }, {y : 6 }) ==== { x: 5, y: 6 }

To add merge deeply nested properties:

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

To do multiple updates at once (uses variable args):

    combine(
      { x: 5 },
      { y: 6 },
      { z: 7 },
    ) === {
      x: 5,
      y: 6,
      z: 7
    }

### Alternatives to merging objects

The default behavior when the `source` and `update` are both plain objects is to merge the objects.  However, sometimes you want to replace, rather than merge an object. There, are three mechanisms for this provided by the library. They all allow this to be accomplished but have slightly different semantics. They are all available as functions on the default export of the library. (Symbols are used internally, so they shouldn't mess with property iteration, correct me where I'm wrong).

#### Replace

The `replace` function is used on the `update` object to say that the object should replace, whatever is in the `source`, even if its another plain object.
It can be used in properties as well:

    const replace = combine.replace;

    combine({ x: 6 }, replace({ y: 7 })) ==== { y: 7 }
    combine({
      x: { y: 7 },
    }, {
      x: replace({ z: 8 }),
    }) ==== {
      x: { z: 8 }
    }

Note that `replace` only signifies to replace the property one time. The next combine has the potential to merge.

    combine(
      { x: 5 },
      replace({ y: 6 }),
      { z: 7 },
    } ==== {
      y: 6,
      z: 7,
    )

#### Opaque

Indicates that the object should be treated as though it is not mergable, like it's a string or number or something scalar. It can be used in properties as well

    const opaque = combine.opaque;

    combine({ x: 5 }, opaque({ y: 6 })) ==== { y: 6 }
    combine({
      x: { y: 7 },
    }, {
      x: opaque({ z: 8 }),
    }) ==== {
      x: { z: 8 }
    }

Opaqueness sticks with objects, unlike the effect of replace, so it cannot be merged even if it's in the source.

    combine(
      { x: 5 },
      opaque({ y: 6 }),
      { z: 7 },
    ) ==== { z: 7 }

(Note that there is an additional Symbol property on each of the opaque objects, but the deep equal provided by mocha expectations does not consider this as inequal (convenient for tests) (possibly because it's not iterable))

#### With scalars

The `withScalars` function identifies a list of properties on an object which should always be treated as scalars. This only applies to the `source` object. The scalars will be copied over to the updated object, so they remain active through many updates.

    const withScalars = combine.withScalars;
    const obj = withScalars({
      x: { y: 6 },
      z: { y: 7 },
    }, ["x"]); // mark x as a scalar property
    combine(obj, {
      x: { a: 8 },
      z: { b: 9 },
    }) ==== {
      x: { a: 8 }, // replaced because x is scalar
      z: { y: 7, b: 9 } // merged
    }

This, like opaque, uses a Symbol property on the object.

### Removing properties

With the default behavior, you can replace and add properties, but you cannot remove props. The `remove` function, available on the default export allows you to remove properties.

    const remove = combine.remove

    combine({
      x: 5,
      y: 6,
    }, {
      x: replace(), // need to call it
    }) ==== {
      y: 6, // x was deleted
    }

### Transforms

By default, when a function is supplied as the value in an update, it is used to transform the current value to the new value. The function receives, as it only parameter, the current value. It will receive undefined if the property does not exist. It should return the new value.

    const add1 = (x) => x + 1;
    combine({
      x: 5,
    }, {
      x: add1,
    }) ==== {
      x: 6
    };

(I find this useful when I want to, say, append to an array)

    combine(obj, { anArray: (arr) => [...arr, newElement] })

It's your responsibility to maintain immutability (if you want to)

It should be noted that functions transform are applied recursively as well. That means you can...

- return another function, which will then be called with the same value as the first (this isn't particularly useful (in my experience so far), but is just how the library works
- more usefully: return a mergable object will be used to update the current value

      combine({
        x: { a: 7, b: 6 },
      }, {
        x: (x) => ({ sum: x.a + x.b }),
      }) ==== {
        x: { a: 7, b: 6, sum: 13 },
      };

The transforms can be used to tranform scalar objects/properties, but can should not merge (due to scalars). A transform can also elect to remove a property

    combine({
      x: 5,
    }, {
      x: (x) => x === 5 ? remove() : x,
    }) ==== {};

In my experience, the type of objects I use this on don't have functions for props. If you want to store a function through an update you can use the `opaque` function. (Do not use `replace`, the library is not designed for this)

    const obj = combine({
      x: 5
    }, {
      x: opaque(() => {}),
    });
    typeof obj.x === "function"

### Notes

The `replace`, `opaque`, `withScalars`, and `remove` functions all use internal Symbols which are not exported.

The `replace`, `opaque`, and `withScalars` all mutate their input, and return the same object (for fluency). The majority of use cases for these functions are with newly created objects, usually through literals, so it can just be thought of as part of the construction process.

## Tests

    npm test

## Coverage

    npm run cover
