import { getErrorStatusByStatusCode } from "./errors.js"

export const response = (res, { status, statusText, message, viewer, setting, data, total, refToken, after } = {}) => {
  status = status || 200
  if (!statusText) {
    if ([200, 201].includes(status)) {
      statusText = 'SUCCESS'
    } else {
      statusText = getErrorStatusByStatusCode(status)
    }
  }
  res.status(status).send({ status, statusText, message, data, total, after, viewer, setting, refToken });
  return { status, statusText, message, data, total, after, viewer, setting, refToken }
}

export const success = (res, { status, statusText, message, viewer } = {}) => (entity) => {
  return response(res, {
    status,
    statusText,
    message,
    viewer,
    data: entity
  })
}

export const notFound = (error) => (entity) => {
  if (entity) {
    return entity
  }
  throw error
}

export const authorOrAdmin = (res, user, userField) => (entity) => {
  if (entity) {
    const isAdmin = user.role === 'admin'
    const isAuthor = entity[userField] && entity[userField].equals(user.id)
    if (isAuthor || isAdmin) {
      return entity
    }
    res.status(401).end()
  }
  return null
}


export const resolveBackdoor = ({ bodyParams, queryParams, data, status = 200, statusText }) => {
  return {
    ...bodyParams,
    ...queryParams,
    response: {
      status: status,
      statusText: getErrorStatusByStatusCode(status),
      message: "Get success",
      ...data,
    },
  }
}

export const rejectBackdoor = ({ bodyParams, queryParams, data, message, status = 404, statusText }) => {
  return {
    ...bodyParams,
    ...queryParams,
    response: {
      status: status,
      statusText: getErrorStatusByStatusCode(status),
      message: message || "The data you're looking for was not found",
      ...data,
    },
  }
}