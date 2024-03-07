import { expect } from "chai";

import combine from "../src/index";
import { __isWarningDisplayed, __resetWarnings, __setTestMode } from "../src/warnings";

const { opaque, replace, remove, ignore, chain, transform, updateCreator } = combine;

describe("combineObjects", () => {
  before(() => {
    __setTestMode(true)
  })
  after(() => {
    __setTestMode(false)
  })
  beforeEach(() => {
    __resetWarnings()
  })

  it("should replace scalars with scalars", () => {
    expect(combine(4, 5)).to.eql(5);
    expect(combine("string", "other")).to.eql("other");
  });
  it("should replace objects with scalars", () => {
    expect(combine({}, 5)).to.eql(5);
  });
  it("should replace scalars with objects", () => {
    expect(combine(5, { x: 6 })).to.deep.eql({ x: 6 });
  });
  it("should merge objects with objects", () => {
    // the extra props are to show merge rather than replace
    expect(combine({ x: 5, y: 7 }, { x: 6 })).to.deep.eql({ x: 6, y: 7 });
  });
  it("should add new props from update", () => {
    expect(combine({ x: 5 }, { y: 6 })).to.deep.eql({ x: 5, y: 6 });
  });
  it("should merge deeply nested properties", () => {
    // the extra props are to show merge rather than replace
    expect(
      combine(
        {
          deeply: {
            nested: {
              property: 5,
              x: 5,
            },
            x: 5,
          },
          x: 5,
        },
        { deeply: { nested: { property: 7 } } }
      )
    ).to.deep.eql({
      deeply: {
        nested: {
          property: 7,
          x: 5,
        },
        x: 5,
      },
      x: 5,
    });
  });
  it("should replace (not merge) objects passed through replace(...)", () => {
    // extra props to show replace
    expect(
      combine({ x: { y: 6, z: 7 } }, { x: replace({ y: 8 }) })
    ).to.deep.eql({ x: { y: 8 } });

    expect(combine({ x: 6 }, replace({ y: 6 }))).to.deep.eql({ y: 6 });
  });
  it("should replace scalars passed through replace(...)", () => {
    expect(combine({ x: 8 }, replace(null))).to.eql(null);
  });
  it("should replace opaque objects passed through replace(...)", () => {
    expect(combine({ x: 8 }, replace(opaque({ x: 9 })))).to.deep.eql({ x: 9 });
  });
  it("should replace (not merge) opaque objects", () => {
    // doing multiple combines to show that opaque sticks with the object
    const obj1 = { x: 5 };
    const obj2 = combine(obj1, opaque({ y: 6 }));
    const obj3 = combine(obj2, { z: 7 });
    const obj4 = combine(obj3, { a: 8 });

    expect(obj2).to.deep.eql({ y: 6 });
    expect(obj3).to.deep.eql({ z: 7 });
    expect(obj4).to.deep.eql({ z: 7, a: 8 });
  });
  it("should replace when opaque is called on non-plain objects (deprecated use)", () => {
    // the only case where this is different than normal behavior is with functions
    // this should be considered deprecated behavior (use replace instead)
    function f(it) {
      return it + 1;
    }
    expect(combine({ x: 5 }, { x: opaque(f) })).to.deep.eql({ x: f });
  });
  it("should be able to remove props", () => {
    expect(combine({ x: 5, y: 6 }, { x: remove() })).to.deep.eql({ y: 6 });
  });
  it("should return undefined when removing at the top-level", () => {
    expect(combine({}, remove())).to.eql(undefined);
  });
  it("should support multiple updates through chain", () => {
    const obj = combine({ x: 4, y: 5, z: 8 }, chain({ x: 6 }, { y: 7 }));
    expect(obj).to.deep.eql({ x: 6, y: 7, z: 8 });
  });
  it("should use function transforms while combining objects", () => {
    const obj = combine({ x: 5 }, { x: (it) => it + 1 });
    expect(obj).to.deep.eql({ x: 6 });
  });
  it("should use function transforms at the top level", () => {
    const obj = combine(1, (it) => it + 1);
    expect(obj).to.deep.eql(2);
  });
  it("should recursively apply function transforms", () => {
    const obj = combine({ add: 1, x: 5 }, ({ add }) => ({
      x: (it) => it + add,
    }));
    expect(obj).to.deep.eql({ add: 1, x: 6 });
  });
  it("should apply function transform on new props", () => {
    const obj = combine({}, { x: () => 5 });
    expect(obj).to.deep.eql({ x: 5 });
  });
  it("should merge result of function transforms", () => {
    const obj = combine({ a: 5, b: 6 }, (it) => ({ sum: it.a + it.b }));
    expect(obj).to.deep.eql({ a: 5, b: 6, sum: 11 });
  });
  it("should not apply function transforms when the function is passed through replace(...)", () => {
    function f(it) {
      return it + 1;
    }
    expect(combine({ x: 8 }, { x: replace(f) })).to.deep.eql({ x: f });
  });
  it("should allow function transforms to remove props", () => {
    const obj1 = combine({ x: 1, y: 2 }, { x: () => remove() });
    expect(obj1).to.deep.eql({ y: 2 });
  });
  it("should allow the use of the key of the prop being transformed in the transform", () => {
    expect(combine({ x: "t" }, { x: (it, key) => it + key })).to.deep.equal({
      x: "tx",
    });
  });
  it("should pass undefined as the value of a transform with no preceding value", () => {
    expect(combine({}, { x: (it) => typeof it })).to.deep.equal({
      x: "undefined",
    });
  });
  it("should pass undefined as the value of a transform where is the no key (top level)", () => {
    expect(combine(1, (it, key) => typeof key)).to.eql("undefined");
  });
  it("should allow function transforms to work at deep levels, even if the source is shallow", () => {
    expect(
      combine(
        { x: 0 },
        {
          x: {
            y: {
              z: () => 5,
            },
          },
        }
      )
    ).to.deep.equal({
      x: {
        y: {
          z: 5,
        },
      },
    });
  });
  it("should allow function transforms to work at deep levels, even if the source is undefined/scalar", () => {
    expect(
      combine(undefined, {
        x: {
          y: {
            z: () => 5,
          },
        },
      })
    ).to.deep.equal({
      x: {
        y: {
          z: 5,
        },
      },
    });
  });
  it("should pass undefined to function transforms, when they occur at levels deeper than the source", () => {
    expect(
      combine(undefined, {
        x: (it) => it,
      })
    ).to.deep.equal({
      x: undefined,
    });
  });
  it("should use the source value when the update value is ignore()", () => {
    expect(combine({ x: 5 }, ignore())).to.deep.eql({ x: 5 });
    expect(combine({ x: 5, y: 6, z: 7 }, { x: ignore(), y: 8 })).to.deep.eql({
      x: 5,
      y: 8,
      z: 7,
    });
  });
  it("should maintain referential integrity when using ignore()", () => {
    const obj = {};
    expect(combine(obj, ignore())).to.equal(obj);
    expect(combine({ x: obj }, { x: ignore() }).x).to.equal(obj);
  });
  it("should allow function transforms to elect to use the source value by calling ignore()", () => {
    const transform = (it) => (it.x > 7 ? ignore() : { x: (it2) => it2 + 1 });
    expect(combine({ x: 3 }, transform)).to.deep.eql({ x: 4 });
    expect(combine({ x: 8 }, transform)).to.deep.eql({ x: 8 });
    const obj = { x: 8 };
    expect(combine(obj, transform)).to.equal(obj);
  });
  it("should not create a property when the update is ignore()", () => {
    expect(combine({}, { x: ignore() })).to.not.haveOwnProperty("x")
  })
  it("should return source when no updates are passed (deprecated use)", () => {
    const obj = {};
    expect(combine(obj)).to.equal(obj);
    expect(combine(5)).to.equal(5);
  });
  // TODO could probably use more test with functions, the relation to everything else is intricate
  it("should return source when passed a chain of no updates", () => {
    const obj = {};
    expect(combine(obj, chain())).to.equal(obj);
    expect(combine(5, chain())).to.equal(5);
  });
  it("should allow multiple updates at nested levels with chain", () => {
    expect(combine(
      { x: { y: 5 } },
      { x: { y: chain(it => it + 1, it => it * it) } },
    )).to.deep.equal({ x: { y: 36 } })
  })
  it("should provide the key at each entry of the chain", () => {
    expect(combine(
      { x: "base" },
      { x: chain((it, key) => "(" + it + "-" + key + ")", (it, key) => it + "--" + key) }
    )).to.deep.equal({
      x: "(base-x)--x"
    })
  })
  it("should allow chain to remove property", () => {
    expect(combine({ x: 5 }, { x: chain(6, remove()) })).to.deep.equal({})
  })
  it("should behave as though property is removed in middle of change", () => {
    expect(combine({ x: 5 }, { x: chain(remove(), x => x === 5 ? "bad" : "good") }))
      .to.deep.equal({ x: "good" })
  })
  it("should work when a remove is followed by ignore in a chain", () => {
    expect(combine({ x: 5}, { x: chain(remove(), ignore()) })).to.not.haveOwnProperty("x")
  })
  it("should work with nested chains", () => {
    expect(combine({ x: 5 }, { x: chain(x => x + 1, chain(x => x + 2, x => x + 3)) }))
      .to.deep.equal({ x: 11 })
  })
  it("should work with remove from nested chains", () => {
    expect(combine({ x: 5 }, { x: chain(chain(remove(), ignore()), ignore()) }))
      .to.not.haveOwnProperty("x")
  })
  it("should allow a transformer to access whether a value is present", () => {
    const checkPresence = (valueIfPresent, valueIfAbsent) => (_, __, isPresent) => replace(isPresent ? valueIfPresent : valueIfAbsent)

    const result = combine(
      {
        x: "present",
      },
      {
        x: checkPresence("here", "not here"),
        y: checkPresence("here", "not here"),
      }
    )

    expect(result).to.deep.equal({
      x: "here",
      y: "not here",
    })
  })
  it("should have the correct value for isPresent during a chain", () => {
    const checks = []
    const checkPresence = () => (value, _, isPresent) => {
      checks.push(isPresent ? "here" : "not here")
      return isPresent ? value : remove()
    }
    combine(
      {
        x: "initial",
      },
      {
        x: chain(
          checkPresence(),
          remove(),
          checkPresence(),
          "update",
          checkPresence(),
        )
      }
    )

    expect(checks).to.deep.equal(["here", "not here", "here"])
  })
  it("should allow transformers to call an combine as their fourth argument, and respond to remove() being returned", () => {
    const arrayMap = (update) => (it, _, __, internalCombine) => {
      const result = []
      let index = 0
      for (const item of it) {
        const { result: itemResult, isPresent: isItemPresent } = internalCombine(item, update, index)
        if (isItemPresent) {
          result.push(itemResult)
        }
        index++
      }
      return result
    }

    // return items whose values are less than 10 or after the fourth item
    const result = combine(
      [5, 10, 4, 20, 3, 30],
      arrayMap((it, index) => it < 10 || index >= 4 ? ignore() : remove())
    )

    expect(result).to.deep.equal([5, 4, 3, 30])
  })
  it("should warn if a possible invalid transform use is detected", () => {
    const increment = () => it => it + 1

    const result = combine(1, increment)
    expect(result).to.equal(2)

    expect(__isWarningDisplayed('possibleIncorrectUpdateCreatorUse')).to.be.true
  })
  it("should not warn if transform is explicitly returned", () => {
    const doubleTransform = () => it => transform(it2 => it + it2)

    const result = combine(2, doubleTransform())
    expect(result).to.equal(4)

    expect(__isWarningDisplayed('possibleIncorrectUpdateCreatorUse')).to.be.false
  })
  it("should warn it same function is re-used after being marked transform", () => {
    const incrementTransform = it => it + 1

    combine({ x: 1 }, { x: () => transform(incrementTransform) })

    expect(__isWarningDisplayed('possibleIncorrectUpdateCreatorUse')).to.be.false

    __resetWarnings();

    combine({ x: 1 }, { x: () => incrementTransform })

    expect(__isWarningDisplayed('possibleIncorrectUpdateCreatorUse')).to.be.true
  })
  it("should warn if transform is marked with transform() outside of combine", () => {
    const incrementTransform = transform(it => it + 1)

    combine({ x: 1 }, { x: () => incrementTransform })

    expect(__isWarningDisplayed('possibleIncorrectUpdateCreatorUse')).to.be.true
  })
  it("should throw if a update creator is used incorrectly", () => {
    const increment = updateCreator(() => it => it + 1)

    expect(() => combine(1, increment)).to.throw()
  })
});
