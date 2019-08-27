export function deprecationWarning (message) {
    let displayed = false;
    return function _deprecationWarning () {
        if (!displayed) {
            // eslint-disable-next-line no-console
            console.warn(message);
            displayed = true;
        }
    };
}

export const withScalarsDeprecationWarning = deprecationWarning('`withScalars` is deprecated and set to be removed in v1.0.0');
export const opaqueFunctionDeprecationWarning = deprecationWarning('`opaque` should only be used with plain objects. Try using `replace` instead');
