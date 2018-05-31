'use strict';

/* eslint-disable */

var expect = require('chai').expect;
import combine from '../src/index';

const { opaque, replace, withScalars, remove, isObject } = combine;

describe('combineObjects', function () {
    it('should replace scalars with scalars', function () {
        expect(combine(4, 5)).to.eql(5);
        expect(combine("string", "other")).to.eql("other");
    });
    it('should replace objects with scalars', function () {
        expect(combine({}, 5)).to.eql(5);
    });
    it('should replace scalars with objects', function () {
        expect(combine(5, { x: 6 })).to.deep.eql({ x: 6 });
    });
    it('should merge objects with objects', function () {
        // the extra props are to show merge rather than replace
        expect(combine({ x: 5, y: 7 }, { x: 6 })).to.deep.eql({ x: 6, y: 7 });
    });
    it('should add new props from update', function () {
        expect(combine({ x: 5 }, { y: 6 })).to.deep.eql({ x: 5, y: 6 });
    })
    it('should merge deeply nested properties', function () {
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
    it('should replace (not merge) objects passed through replace(...)', function () {
        // extra props to show replace
        expect(combine({ x: { y: 6, z: 7 } }, { x: replace({ y: 8 }) }))
            .to.deep.eql({ x: { y: 8 } });
    });
    it('should replace (not merge) opaque objects', function () {
        // doing multiple combines to show that opaque sticks with the object
        const obj1 = { x: 5 };
        const obj2 = combine(obj1, opaque({ y: 6 }));
        const obj3 = combine(obj2, { z: 7 });
        const obj4 = combine(obj3, { a: 8 });

        expect(obj2).to.deep.eql({ y: 6});
        expect(obj3).to.deep.eql({ z: 7 });
        expect(obj4).to.deep.eql({ z: 7, a: 8 });
    });
    it('should replace (not merge) props marked as scalar', function () {
        // doing multiple combines to show that scalars are copied over to new object
        const obj1 = withScalars({ x: { a: 6 }, y: { a: 7 } }, ["x"]);
        const obj2 = combine(obj1, { x: { b: 5}, y: { b: 5 } });
        const obj3 = combine(obj2, { x: { c: 6 } });

        expect(obj2).to.deep.eql({ x: { b: 5}, y: { a: 7, b: 5 }});
        expect(obj3.x).to.deep.eql({ c: 6 });
    });
    it('should be able to remove props', function () {
        expect(combine({ x: 5, y: 6 }, { x: remove() })).to.deep.eql({ y: 6 });
    });
    it('should be able to remove scalar props', function () {
        // just making sure withScalars and remove work together
        const obj = withScalars({ x: 5 }, ["x"]);
        expect(combine(obj, { x: remove() })).to.deep.eql({});
    });
    it('should support multiple updates through variable arguments', function () {
        const obj = combine({ x: 4, y: 5, z: 8 }, { x: 6 }, { y: 7 });
        expect(obj).to.deep.eql({ x: 6, y: 7, z: 8 });
    });
    it('should use function transforms', function () {
        const obj = combine({ x: 5 }, { x: (value) => value + 1 });
        expect(obj).to.deep.eql({ x: 6 });
    });
    it('should recursively apply function transforms', function () {
        const obj = combine({ x: 5 }, { x: (value) => (value) => value + 1 });
        expect(obj).to.deep.eql({ x: 6 });
    });
    it('should apply function transform on new props', function () {
        const obj = combine({}, { x: () => 5 });
        expect(obj).to.deep.eql({ x: 5 });
    });
    it('should merge result of function transforms', function () {
        const obj = combine({ a: 5, b: 6 }, (obj) => ({ sum: obj.a + obj.b }));
        expect(obj).to.deep.eql({ a: 5, b: 6, sum: 11 });
    });
    it('should not merge result of scalar props', function () {
        const sum = (obj) => ({ sum: obj.a + obj.b });
        const obj = combine(withScalars({ x: { a: 5, b: 6 } }, ["x"]), { x: sum });

        expect(obj).to.deep.eql({ x: { sum: 11 } });
    });
    it('should apply function transforms when the function is opaque', function () {
        const obj = combine({ x: 5 }, { x: opaque((x) => x + 1 ) });
        expect(typeof obj.x).to.equal('function');

        const obj2 = combine({}, { x: opaque(() => 5) });
        expect(typeof obj.x).to.equal('function');
    });
    it('should help me', function () {
        isObject({});
        isObject(() => {});
    });
    // TODO could probably use more test with functions, the relation to everything else is intricate
});
