import { getCache, setCache } from '../cache'
import { $get, $post, headers } from '../axios'
import { service } from '../../config'
import Main from '../axios/main'
import { UnauthorizedError } from '../response/errors'

export const bizToken = ({ required, roles = [] } = {}) => (req, res, next) => {
  return new Promise(async (resolve, reject) => {
    if (!req.headers.authorization)
      return reject(new Error(JSON.stringify({ status: 401, message: 'Unauthorized' })))
    try {
      const token = req.headers.authorization

      let biz = await getCache({ model: 'biz-public', alias: req.params.bizAlias, queryParams: { authorization: token } })
      if (!biz) {
        biz = await $get(['public', 'bizs', req.params.bizAlias], {
          headers: {
            authorization: token,
          }
        })
        await setCache({ model: 'biz-public', expire: 100, data: biz, alias: req.params.bizAlias, queryParams: { authorization: token } })
      } 

      if (!biz?.data || biz?.status !== 200)
        return reject(new Error(JSON.stringify({ status: 401, message: 'Unauthorized' })))
      req.biz = biz.data;
      next();
    } catch (error) {
      console.log('token error', error);
      return reject(new Error(JSON.stringify({
        status: error.response?.data?.status || 401,
        statusText: error.response?.data?.statusText || 'ERROR',
        message: error.response?.data?.message || 'Unauthorized'
      })))
    }
  })
    .catch(next)
}
export const token = ({ required, roles = [] } = {}) => (req, res, next) => {
  return new Promise(async (resolve, reject) => {
    if (!req.headers.authorization)
      return reject(new UnauthorizedError('Unauthorized'));

    try {
      const token = req.headers.authorization
      const bufToken = token.split('.')[1];
      const dataToken = JSON.parse(Buffer.from(bufToken, 'base64').toString());
      // console.log('token', token);
      // console.log('dataToken', dataToken);
      let biz = await getCache({ model: 'biz', alias: req.params.bizAlias, queryParams: { authorization: dataToken.id } })
      // console.log('biz', biz);
      if (!biz) {
        biz = await $get(['bizs', req.params.bizAlias], {
          headers: {
            authorization: token,
          }
        })
        await setCache({ model: 'biz', expire: 100, data: biz, alias: req.params.bizAlias, queryParams: { authorization: dataToken.id } })
      }
      // console.log('biz', biz);
      if (!biz?.data || biz?.status !== 200)
        return reject(new UnauthorizedError('Unauthorized'))


      req.biz = biz.data;
      req.viewer = biz.viewer;
      next();
    } catch (error) {
      console.log('token error', error);
      return reject(new UnauthorizedError('Unauthorized'))
    }
  })
    .catch(next)
}

export const admin = ({ required, roles = ['DEV', 'MOD', 'ADMIN'] } = {}) => (req, res, next) => {
  return new Promise(async (resolve, reject) => {
    if (!req.headers.authorization)
      return reject(new Error(JSON.stringify({ status: 401, message: 'Unauthorized' })))
    try {
      const token = req.headers.authorization
      const bufToken = token.split('.')[1];
      const dataToken = JSON.parse(Buffer.from(bufToken, 'base64').toString());

      let me = await getCache({ model: 'user', alias: 'me', queryParams: { authorization: dataToken.id } })
      if (me) {
        me = JSON.parse(me);
      } else {
        me = await $get(['users', 'me'], {
          headers: {
            authorization: token
          }
        })
        await setCache({ model: 'user', expire: 100, data: me, alias: 'me', queryParams: { authorization: dataToken.id } })
      }
      if (!me?.data || me?.status !== 200 || !roles.includes(me.data.role))
        return reject(new Error(JSON.stringify({ status: 401, message: 'Unauthorized' })))

      // Nếu k phải MOD,ADMIN thì check xem có quyền dev k mới cho update
      if (!['ADMIN'].includes(me.data.role) && !me.data.devScopes?.includes(service))
        return reject(new Error(JSON.stringify({ status: 401, message: 'Unauthorized' })))

      req.viewer = me.data;
      next();
    } catch (error) {
      return reject(new Error(JSON.stringify({
        status: error.response?.data?.status || 401,
        statusText: error.response?.data?.statusText || 'ERROR',
        message: error.response?.data?.message || 'Unauthorized'
      })))
    }
  })
    .catch(next)
}

export const backdoor = ({ required, roles = [] } = {}) => (req, res, next) => {
  // console.log('backdoor');
  return new Promise(async (resolve, reject) => {

    if (!req.headers.authorization)
      return reject(new Error(JSON.stringify({ status: 401, message: 'Unauthorized' })))
    const backdoorToken = req.headers.authorization.replace('Bearer', '').trim();
    try {
      const backdoor = await Main.authService(backdoorToken);
      // console.log('backdoor', backdoor);
      if (!backdoor) {
        return reject(new UnauthorizedError('Unauthorized'))
      }
      req.backdoor = backdoor
      next();

    } catch (error) {
      console.log('error', error);
      return reject(new UnauthorizedError('Unauthorized'))
    }
  })
    .catch(next)
}
export const hasModScope = (user, scope) => {
  let hasPermission = user.role === 'ADMIN'
  if (!hasPermission) {
    if (user.role === 'MOD') {
      if (!scope) {
        hasPermission = true
      } else {
        const modScope = user.modScopes?.find(a => a.moduleAlias === 'main')
        if (modScope?.moduleScopes?.includes(scope)) {
          hasPermission = true
        }
      }
    }
  }
  return hasPermission;
}
