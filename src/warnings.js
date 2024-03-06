const warningState = { displayed: {}, testMode: false }
export function warning(key, message) {
  return function _warning() {
    if (!warningState.displayed[key]) {
      // eslint-disable-next-line no-console
      if (!warningState.testMode) console.warn(message);
      warningState.displayed[key] = true;
    }
  };
}

export const opaqueFunctionDeprecationWarning = warning(
  'opaqueFunctionDeprecation',
  '`opaque` should only be used with plain objects. Try using `replace` instead',
);
export const multipleUpdatesDeprecationWarnings = warning(
  'multipleUpdatesDeprecation',
  'passing multiple updates to `combine` is deprecated. Use `chain` instead.'
)
export const possibleIncorrectUpdateCreatorUseWarning = warning(
  'possibleIncorrectUpdateCreatorUseWarning',
  'A transform returned another transform. This may indicate invalid update creator use. If this is intentional, mark return transforms with `transform`'
)


// test
export function __resetWarnings() {
  warningState.displayed = {}
}
export function __setTestMode(isTestMode) {
  warningState.testMode = isTestMode
}
export function __isWarningDisplayed(key) {
  return !!warningState.displayed[key]
}