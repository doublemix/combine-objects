import { expect } from 'chai';

import combine from '../src/index';

const {
  opaque, replace, withScalars, remove, ignore,
} = combine;

describe('combineObjects', () => {
  it('should replace scalars with scalars', () => {
    expect(combine(4, 5)).to.eql(5);
    expect(combine('string', 'other')).to.eql('other');
  });
  it('should replace objects with scalars', () => {
    expect(combine({}, 5)).to.eql(5);
  });
  it('should replace scalars with objects', () => {
    expect(combine(5, { x: 6 })).to.deep.eql({ x: 6 });
  });
  it('should merge objects with objects', () => {
    // the extra props are to show merge rather than replace
    expect(combine({ x: 5, y: 7 }, { x: 6 })).to.deep.eql({ x: 6, y: 7 });
  });
  it('should add new props from update', () => {
    expect(combine({ x: 5 }, { y: 6 })).to.deep.eql({ x: 5, y: 6 });
  });
  it('should merge deeply nested properties', () => {
    // the extra props are to show merge rather than replace
    expect(combine({
      deeply: {
        nested: {
          property: 5,
          x: 5,
        },
        x: 5,
      },
      x: 5,
    }, { deeply: { nested: { property: 7 } } }))
      .to.deep.eql({
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
  it('should replace (not merge) objects passed through replace(...)', () => {
    // extra props to show replace
    expect(combine({ x: { y: 6, z: 7 } }, { x: replace({ y: 8 }) }))
      .to.deep.eql({ x: { y: 8 } });

    expect(combine({ x: 6 }, replace({ y: 6 }))).to.deep.eql({ y: 6 });
  });
  it('should replace scalars passed through replace(...)', () => {
    expect(combine({ x: 8 }, replace(null))).to.eql(null);
  });
  it('should replace opaque objects passed through replace(...)', () => {
    expect(combine({ x: 8 }, replace(opaque({ x: 9 })))).to.deep.eql({ x: 9 });
  });
  it('should replace (not merge) opaque objects', () => {
    // doing multiple combines to show that opaque sticks with the object
    const obj1 = { x: 5 };
    const obj2 = combine(obj1, opaque({ y: 6 }));
    const obj3 = combine(obj2, { z: 7 });
    const obj4 = combine(obj3, { a: 8 });

    expect(obj2).to.deep.eql({ y: 6 });
    expect(obj3).to.deep.eql({ z: 7 });
    expect(obj4).to.deep.eql({ z: 7, a: 8 });
  });
  it('should replace (not merge) props marked as scalar (deprecated feature)', () => {
    // doing multiple combines to show that scalars are copied over to new object
    const obj1 = withScalars({ x: { a: 6 }, y: { a: 7 } }, ['x']);
    const obj2 = combine(obj1, { x: { b: 5 }, y: { b: 5 } });
    const obj3 = combine(obj2, { x: { c: 6 } });

    expect(obj2).to.deep.eql({ x: { b: 5 }, y: { a: 7, b: 5 } });
    expect(obj3.x).to.deep.eql({ c: 6 });
  });
  it('should replace when opaque is called on non-plain objects (deprecated use)', () => {
    // the only case where this is different than normal behavior is with functions
    // this should be considered deprecated behavior (use replace instead)
    function f(it) { return it + 1; }
    expect(combine({ x: 5 }, { x: opaque(f) })).to.deep.eql({ x: f });
  });
  it('should be able to remove props', () => {
    expect(combine({ x: 5, y: 6 }, { x: remove() })).to.deep.eql({ y: 6 });
  });
  it('should return undefined when removing at the top-level', () => {
    expect(combine({}, remove())).to.eql(undefined);
  });
  it('should be able to remove scalar props', () => {
    // just making sure withScalars and remove work together
    const obj = withScalars({ x: 5 }, ['x']);
    expect(combine(obj, { x: remove() })).to.deep.eql({});
  });
  it('should support multiple updates through variable arguments', () => {
    const obj = combine({ x: 4, y: 5, z: 8 }, { x: 6 }, { y: 7 });
    expect(obj).to.deep.eql({ x: 6, y: 7, z: 8 });
  });
  it('should use function transforms while combining objects', () => {
    const obj = combine({ x: 5 }, { x: (it) => it + 1 });
    expect(obj).to.deep.eql({ x: 6 });
  });
  it('should use function transforms at the top level', () => {
    const obj = combine(1, (it) => it + 1);
    expect(obj).to.deep.eql(2);
  });
  it('should recursively apply function transforms', () => {
    const obj = combine({ add: 1, x: 5 }, ({ add }) => ({ x: (it) => it + add }));
    expect(obj).to.deep.eql({ add: 1, x: 6 });
  });
  it('should apply function transform on new props', () => {
    const obj = combine({}, { x: () => 5 });
    expect(obj).to.deep.eql({ x: 5 });
  });
  it('should merge result of function transforms', () => {
    const obj = combine({ a: 5, b: 6 }, (it) => ({ sum: it.a + it.b }));
    expect(obj).to.deep.eql({ a: 5, b: 6, sum: 11 });
  });
  it('should not merge result of scalar props', () => {
    const sum = (it) => ({ sum: it.a + it.b });
    const obj = combine(withScalars({ x: { a: 5, b: 6 } }, ['x']), { x: sum });

    expect(obj).to.deep.eql({ x: { sum: 11 } });
  });
  it('should not apply function transforms when the function is passed through replace(...)', () => {
    function f(it) { return it + 1; }
    expect(combine({ x: 8 }, { x: replace(f) })).to.deep.eql({ x: f });
  });
  it('should allow function transforms to remove props', () => {
    const obj1 = combine({ x: 1 }, { x: () => remove() });
    expect(obj1).to.deep.eql({});

    const obj2 = combine(withScalars({ x: 1 }, ['x']), { x: () => remove() });
    expect(obj2).to.deep.eql({});
  });
  it('should allow the use of the key of the prop being transformed in the transform', () => {
    expect(combine({ x: 't' }, { x: (it, key) => it + key })).to.deep.equal({
      x: 'tx',
    });
  });
  it('should pass undefined as the value of a transform with no preceding value', () => {
    expect(combine({}, { x: (it) => typeof it })).to.deep.equal({
      x: 'undefined',
    });
  });
  it('should pass undefined as the value of a transform where is the no key (top level)', () => {
    expect(combine(1, (it, key) => typeof key)).to.eql('undefined');
  });
  it('should allow function transforms to work at deep levels, even if the source is shallow', () => {
    expect(combine({ x: 0 }, {
      x: {
        y: {
          z: () => 5,
        },
      },
    })).to.deep.equal({
      x: {
        y: {
          z: 5,
        },
      },
    });
  });
  it('should allow function transforms to work at deep levels, even if the source is undefined/scalar', () => {
    expect(combine(undefined, {
      x: {
        y: {
          z: () => 5,
        },
      },
    })).to.deep.equal({
      x: {
        y: {
          z: 5,
        },
      },
    });
  });
  it('should pass undefined to function transforms, when they occur at levels deeper than the source', () => {
    expect(combine(undefined, {
      x: (it) => it,
    })).to.deep.equal({
      x: undefined,
    });
  });
  it('should use the source value when the update value is ignore()', () => {
    expect(combine({ x: 5 }, ignore())).to.deep.eql({ x: 5 });
    expect(combine({ x: 5, y: 6, z: 7 }, { x: ignore(), y: 8 })).to.deep.eql({ x: 5, y: 8, z: 7 });
  });
  it('should maintain referential integrity when using ignore()', () => {
    const obj = {};
    expect(combine(obj, ignore())).to.equal(obj);
    expect(combine({ x: obj }, { x: ignore() }).x).to.equal(obj);
  });
  it('should allow function transforms to elect to use the source value by calling ignore()', () => {
    const transform = (it) => (it.x > 7 ? ignore() : { x: (it2) => it2 + 1 });
    expect(combine({ x: 3 }, transform)).to.deep.eql({ x: 4 });
    expect(combine({ x: 8 }, transform)).to.deep.eql({ x: 8 });
    const obj = { x: 8 };
    expect(combine(obj, transform)).to.equal(obj);
  });
  // TODO could probably use more test with functions, the relation to everything else is intricate
});
