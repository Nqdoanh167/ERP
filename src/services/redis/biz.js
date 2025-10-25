import { delRedis, getRedis, setRedis } from "./index"
import Biz from '../../api/models/biz'
import Module from '../../api/models/module'
import Axios from 'axios'
import { CustomError, errors, ForbiddenError, UnauthorizedError } from "../response/errors"
import { response } from "../response"
import config from "../../config"
import Promise from 'bluebird'
import { delCache, getCache, serviceCache, setCache } from "../cache"
import { sendKafkaMessage } from "../kafka"
import { equalObjIds } from "../../utils/common"

export const verifyPartner = (module) => (req, res, next) =>
  Promise.resolve()
    .then(async __ => {
      // console.log(headers)
      if (!req.headers.authorization) {
        throw new UnauthorizedError()
      }
      // verify token
      const jsonRespone = await Axios({
        baseURL: config.server,
        url: `/backdoors/verify`,
        headers: {
          Authorization: req.headers.authorization
        }
      }).then(a => a.data)
        .catch(e => {
          // console.log(e.config)
          if (e.response?.data?.status) {
            throw new CustomError(e.response.data.message, e.response?.data?.status, e.response?.data?.statusText)
          }
          console.error(e.response)
        })
      if (jsonRespone?.data) {
        req.backdoor = jsonRespone.data
      }

      if (!req.backdoor || !req.backdoor.scopes || !req.backdoor.scopes.includes(module)) {
        throw new ForbiddenError()
      }
      // console.log(req.backdoor)
      next()
    })
    .catch(err => {
      // console.error(err)
      response(res, {
        status: err.status || errors.status.FORBIDDEN,
        statusText: err.statusText || errors.statusTexts.FORBIDDEN,
        message: err.message
      })
    })

export const verifyBackdoor = (module) => (req, res, next) =>
  Promise.resolve()
    .then(async __ => {
      // console.log(headers)
      if (!req.headers.authorization) {
        throw new UnauthorizedError()
      }
      // verify token
      const jsonRespone = await Axios({
        baseURL: config.server,
        url: `/backdoors/verify`,
        headers: {
          Authorization: req.headers.authorization
        }
      }).then(a => a.data)
        .catch(e => {
          // console.log(e.config)
          if (e.response?.data?.status) {
            throw new CustomError(e.response.data.message, e.response?.data?.status, e.response?.data?.statusText)
          }
          console.error(e.response)
        })
      if (jsonRespone?.data) {
        req.backdoor = jsonRespone.data
      }

      if (!req.backdoor || !req.backdoor.scopes || !req.backdoor.scopes.includes(module)) {
        throw new ForbiddenError()
      }
      // console.log(req.backdoor)
      next()
    })
    .catch(err => {
      // console.error(err)
      response(res, {
        status: err.status || errors.status.FORBIDDEN,
        statusText: err.statusText || errors.statusTexts.FORBIDDEN,
        message: err.message
      })
    })

export const delBizFromRedis = async (biz) => {
  await delCache({ model: 'biz', alias: biz.alias })
  await delCache({ model: 'biz', alias: biz.id || biz._id })
  biz.users?.forEach(async user => {
    await delCache({ model: 'biz', userId: user.id })
  });
  // console.log('biz-clean', JSON.stringify({
  //   id: biz.id || biz._id,
  //   alias: biz.alias
  // }));
  await sendKafkaMessage('biz', { verb: 'updated', id: biz.id || biz._id, alias: biz.alias }).catch(e => {
    console.log('sendKafkaMessage biz-updated error', e);
  })
}

export const patchBizFromRedis = async (biz) => {
  // console.log('biz', biz);
  const modules = await getModulesFromCache().then(items => items.map(item => ({
    name: item.name,
    alias: item.alias,
    desc: item.desc,
    icon: item.icon,
    picture: item.picture,
  })))
  biz.modules = modules;

  // xu ly biz.user
  biz.users = (biz.users || []).map(user => {
    // xét role
    const hasRole = biz.roles?.find(a => equalObjIds(a.id, user.roleId));
    user.roleModules = hasRole?.modules || [];
    user.roleBranchIds = hasRole?.branchIds || [];
    return user
  })
}

export const getBizFromRedis = async (bizId) => {
  let biz = await getCache({ model: 'biz', alias: bizId })
  if (!biz) {
    biz = await Biz.findById(bizId)
      .populate({ path: 'author', options: { limit: 1, select: 'name picture email' } })
      .then(a => a ? a.view(true) : null)
    if (biz) {

      await setCache({ model: 'biz', alias: bizId, data: { data: biz } })
    }
  } else {
    biz = biz.data;
  }
  if (biz) {
    await patchBizFromRedis(biz)
  }
  return biz
}

export const getBizFromRedisByAlias = async (bizAlias) => {
  let biz = await getCache({ model: 'biz', alias: bizAlias });
  if (!biz) {
    biz = await Biz.findOne({ alias: bizAlias })
      .populate([{ path: 'author', select: 'name picture email', options: { limit: 1 } }])
      .then(a => a ? a.view(true) : null)
    if (biz) {
      await setCache({ model: 'biz', alias: bizAlias, data: { data: biz } })
    }
  } else {
    biz = biz.data;
  }
  if (biz) {
    await patchBizFromRedis(biz)
  }
  return biz
}

export const delModulesFromRedis = () =>
  delRedis('modules')


export const getModulesFromCache = async () => {
  let cacheModule = await getCache({ model: 'module' });
  if (cacheModule) return cacheModule.data
  const modules = await Module.find({}).sort('weight').then(items => items.map(item => item.view(true)));
  if (modules) {
    await setCache({ model: 'module', data: { data: modules } })
  }
  return modules || []
}
