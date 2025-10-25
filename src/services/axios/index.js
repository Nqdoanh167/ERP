import axios from 'axios';
import { serverAddress, serviceToken } from '../../config'

export const headers = {
  Authorization: `Bearer ${serviceToken}`
}
function createUrl(paths) {
  return serverAddress + '/' + paths.join('/');
}

export const $get = (paths, queryParams) => {
  return axios.get(createUrl(paths), queryParams)
    .then(res => res.data)
}
export const $getMockapi = (path, queryParams) => {
  return axios.get(path, queryParams)
    .then(res => res.data)
}

export const $post = (paths, body, config) => {
  return axios.post(createUrl(paths), body, config)
    .then(res => res.data)
}
