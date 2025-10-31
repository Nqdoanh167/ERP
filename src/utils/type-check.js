export function isNull(val) {
  return val === null;
}

export function isUndefined(val) {
  return val === undefined;
}

export function isNil(val) {
  return isNull(val) || isUndefined(val);
}

export function isObject(val) {
  return typeof val === "object";
}

export function isBoolean(val) {
  return typeof val === "boolean";
}

export function isArray(val) {
  return Array.isArray(val);
}

export function isEmptyArray(val) {
  return isArray(val) && val.length === 0;
}

export function isDefined(val) {
  return isUndefined(val) === false;
}
