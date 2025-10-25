/* eslint-disable space-before-function-paren */
export const errors = {
  status: {
    SUCCESS: 200,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    PAYMENT_REQUIRED: 402,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    METHOD_NOT_ALLOWED: 405,
    NOT_ACCEPTABLE: 406,
    PROXY_AUTHENTICATION_REQUIRED: 407,
    REQUEST_TIMEOUT: 408,
    CONFLICT: 409,
    GONE: 410,
    LENGTH_REQUIRED: 411,
    PRECONDITION_FAILED: 412,
    PAYLOAD_TOO_LARGE: 413,
    URI_TOO_LONG: 414,
    UNSUPPORTED_MEDIA_TYPE: 415,
    RANGE_NOT_SATISFIABLE: 416,
    EXPECTATION_FAILED: 417,
    MISDIRECTED_REQUEST: 421,
    UNPROCESSABLE_ENTITY: 422,
    DATA_MISSING: 422,
    LOCKED: 423,
    FAILED_DEPENDENCY: 424,
    TOO_EARLY: 425,
    UPGRADE_REQUIRED: 426,
    PRECONDITION_REQUIRED: 428,
    TOO_MANY_REQUESTS: 429,
    REQUEST_HEADER_FIELDS_TOO_LARGE: 431,
    UNAVAILABLE_FOR_LEGAL_REASONS: 451,
    INTERNAL_SERVER_ERROR: 500,
    NOT_IMPLEMENTED: 501,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
    GATEWAY_TIMEOUT: 504,
    HTTP_VERSION_NOT_SUPPORTED: 505,
    VARIANT_ALSO_NEGOTIATES: 506,
    INSUFFICIENT_STORAGE: 507,
    LOOP_DETECTED: 508,
    NOT_EXTENDED: 510,
    NETWORK_AUTHENTICATION_REQUIRED: 511
  },
  statusTexts: {
    SUCCESS: 'SUCCESS',
    BAD_REQUEST: 'BAD_USER_INPUT',
    UNAUTHORIZED: 'UNAUTHORIZED',
    PAYMENT_REQUIRED: 'PAYMENT_REQUIRED',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
    NOT_ACCEPTABLE: 'NOT_ACCEPTABLE',
    PROXY_AUTHENTICATION_REQUIRED: 'PROXY_AUTHENTICATION_REQUIRED',
    REQUEST_TIMEOUT: 'REQUEST_TIMEOUT',
    CONFLICT: 'CONFLICT',
    GONE: 'GONE',
    LENGTH_REQUIRED: 'LENGTH_REQUIRED',
    PRECONDITION_FAILED: 'PRECONDITION_FAILED',
    PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
    URI_TOO_LONG: 'URI_TOO_LONG',
    UNSUPPORTED_MEDIA_TYPE: 'UNSUPPORTED_MEDIA_TYPE',
    RANGE_NOT_SATISFIABLE: 'RANGE_NOT_SATISFIABLE',
    EXPECTATION_FAILED: 'EXPECTATION_FAILED',
    MISDIRECTED_REQUEST: 'MISDIRECTED_REQUEST',
    UNPROCESSABLE_ENTITY: 'UNPROCESSABLE_ENTITY',
    DATA_MISSING: 'DATA_MISSING',
    LOCKED: 'LOCKED',
    FAILED_DEPENDENCY: 'FAILED_DEPENDENCY',
    TOO_EARLY: 'TOO_EARLY',
    UPGRADE_REQUIRED: 'UPGRADE_REQUIRED',
    PRECONDITION_REQUIRED: 'PRECONDITION_REQUIRED',
    TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
    REQUEST_HEADER_FIELDS_TOO_LARGE: 'REQUEST_HEADER_FIELDS_TOO_LARGE',
    UNAVAILABLE_FOR_LEGAL_REASONS: 'UNAVAILABLE_FOR_LEGAL_REASONS',
    INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
    NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
    BAD_GATEWAY: 'BAD_GATEWAY',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
    GATEWAY_TIMEOUT: 'GATEWAY_TIMEOUT',
    HTTP_VERSION_NOT_SUPPORTED: 'HTTP_VERSION_NOT_SUPPORTED',
    VARIANT_ALSO_NEGOTIATES: 'VARIANT_ALSO_NEGOTIATES',
    INSUFFICIENT_STORAGE: 'INSUFFICIENT_STORAGE',
    LOOP_DETECTED: 'LOOP_DETECTED',
    NOT_EXTENDED: 'NOT_EXTENDED',
    NETWORK_AUTHENTICATION_REQUIRED: 'NETWORK_AUTHENTICATION_REQUIRED'
  },
  messages: {
    SUCCESS: 'SUCCESS',
    BAD_REQUEST: 'Bad User Input',
    UNAUTHORIZED: 'Unauthorized',
    PAYMENT_REQUIRED: 'Payment Required',
    FORBIDDEN: 'You don\'t have permission',
    NOT_FOUND: 'The data you\'re looking for was not found',
    METHOD_NOT_ALLOWED: 'Method Not Allowed',
    NOT_ACCEPTABLE: 'Not Acceptable',
    PROXY_AUTHENTICATION_REQUIRED: 'Proxy Authentication Required',
    REQUEST_TIMEOUT: 'Request Timeout',
    CONFLICT: 'Conflict',
    GONE: 'The Data You\'re Requested Has Been Removed',
    LENGTH_REQUIRED: 'Length Required',
    PRECONDITION_FAILED: 'Precondition Failed',
    PAYLOAD_TOO_LARGE: 'Payload Too Large',
    URI_TOO_LONG: 'Uri Too Long',
    UNSUPPORTED_MEDIA_TYPE: 'Unsupported Media Type',
    RANGE_NOT_SATISFIABLE: 'Range Not Satisfiable',
    EXPECTATION_FAILED: 'Expectation Failed',
    MISDIRECTED_REQUEST: 'Misdirected Request',
    UNPROCESSABLE_ENTITY: 'Unprocessable Entity',
    DATA_MISSING: 'Data missing',
    LOCKED: 'The Data You\'re Requested Has Been Locked',
    FAILED_DEPENDENCY: 'Failed Dependency',
    TOO_EARLY: 'Too Early',
    UPGRADE_REQUIRED: 'Upgrade Required',
    PRECONDITION_REQUIRED: 'Precondition Failed',
    TOO_MANY_REQUESTS: 'Too Many Request',
    REQUEST_HEADER_FIELDS_TOO_LARGE: 'Request Header Fields Too Large',
    UNAVAILABLE_FOR_LEGAL_REASONS: 'The Data You\'re Requested Unavailable For Legal Reason',
    INTERNAL_SERVER_ERROR: 'Internal Server Error',
    NOT_IMPLEMENTED: 'Not Implemented',
    BAD_GATEWAY: 'Bad Gateway',
    SERVICE_UNAVAILABLE: 'Service Unavailable',
    GATEWAY_TIMEOUT: 'Gateway Timeout',
    HTTP_VERSION_NOT_SUPPORTED: 'HTTP Version Not Supported',
    VARIANT_ALSO_NEGOTIATES: 'Variant Also Negotiates',
    INSUFFICIENT_STORAGE: 'Insufficient Storage',
    LOOP_DETECTED: 'Loop Detected',
    NOT_EXTENDED: 'Not Extended',
    NETWORK_AUTHENTICATION_REQUIRED: 'Network Authentication Required'
  }
}

export const getErrorStatusByStatusCode = (statusCode) => {
  const _error = Object.entries(errors.status).find(a => a[1] === statusCode)
  if (_error && errors.statusTexts[_error[0]]) return errors.statusTexts[_error[0]]
  return 'UNKNOW'
}


/**
 * CustomError
 *
 * The CustomError is a base class that allows you to create custom HTTP exceptions
 *
 * @class CustomError
 * @extends {Error}
 */
export class CustomError extends Error {
  /**
   * constructor
   * @param  {string} message - error message
   * @param  {string} status - error status
   * @param  {number} statusText - error statusText
   */
  constructor(
    message,
    status,
    statusText,
    error
  ) {
    super(message)
    this.message = message
    if (typeof status !== 'undefined' && status !== null) this.status = status
    if (typeof statusText !== 'undefined' && statusText !== null) this.statusText = statusText
    if (typeof error !== 'undefined' && error !== null) this.error = error
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * ForbiddenError
 *
 * @class ForbiddenError
 * @extends {CustomError}
 */
export const ForbiddenError = class extends CustomError {
  /**
   * constructor
   * @param  {string} message - custom error message
   */
  constructor(message) {
    super(message || errors.messages.FORBIDDEN, errors.status.FORBIDDEN, errors.statusTexts.FORBIDDEN);
  }
}

/**
 * NotFoundError
 *
 * @class NotFoundError
 * @extends {CustomError}
 */
export const NotFoundError = class extends CustomError {
  /**
   * constructor
   * @param  {string} message - custom error message
   */
  constructor(message) {
    super(message || errors.messages.NOT_FOUND, errors.status.NOT_FOUND, errors.statusTexts.NOT_FOUND);
  }
}


/**
 * UnauthorizedError
 *
 * @class UnauthorizedError
 * @extends {CustomError}
 */
export const UnauthorizedError = class extends CustomError {
  /**
   * constructor
   * @param  {string} message - custom error message
   */
  constructor(message) {
    super(message || errors.messages.UNAUTHORIZED, errors.status.UNAUTHORIZED, errors.statusTexts.UNAUTHORIZED);
  }
}

/**
 * BadRequestError
 *
 * @class BadRequestError
 * @extends {CustomError}
 */
export const BadRequestError = class extends CustomError {
  /**
   * constructor
   * @param  {string} message - custom error message
   */
  constructor(message) {
    super(message || errors.messages.BAD_REQUEST, errors.status.BAD_REQUEST, errors.statusTexts.BAD_REQUEST);
  }
}


/**
 * InternalServerError
 *
 * @class InternalServerError
 * @extends {CustomError}
 */
export const InternalServerError = class extends CustomError {
  /**
   * constructor
   * @param  {string} message - custom error message
   */
  constructor(message) {
    super(
      message || errors.messages.INTERNAL_SERVER_ERROR,
      errors.status.INTERNAL_SERVER_ERROR,
      errors.statusTexts.INTERNAL_SERVER_ERROR
    );
  }
};

/**
 * InternalServerError
 *
 * @class InternalServerError
 * @extends {CustomError}
 */
export const DataMissingError = class extends CustomError {
  /**
   * constructor
   * @param  {string} message - custom error message
   */
  constructor(message) {
    super(
      message || errors.messages.DATA_MISSING,
      errors.status.DATA_MISSING,
      errors.statusTexts.DATA_MISSING
    );
  }
};
/**
 * InternalServerError
 *
 * @class InternalServerError
 * @extends {CustomError}
 */
export const ConflictError = class extends CustomError {
  /**
   * constructor
   * @param  {string} message - custom error message
   */
  constructor(message) {
    super(
      message || errors.messages.CONFLICT,
      errors.status.CONFLICT,
      errors.statusTexts.CONFLICT
    );
  }
};