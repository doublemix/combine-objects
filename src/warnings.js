export function deprecationWarning(message) {
  let displayed = false;
  return function _deprecationWarning() {
    if (!displayed) {
      // eslint-disable-next-line no-console
      console.warn(message);
      displayed = true;
    }
  };
}

export const opaqueFunctionDeprecationWarning = deprecationWarning(
  '`opaque` should only be used with plain objects. Try using `replace` instead',
);
export const multipleUpdatesDeprecationWarnings = deprcationWarning(
  'passing multiple updates to `combine` is deprecated. Use `chain` instead.'
)