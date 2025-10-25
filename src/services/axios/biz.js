import { $post, headers } from '.'
import { getCache, setCache } from "../cache"

const paths = ['backdoor']

const findOne = (query) => {
  return $post(paths, [{ method: 'findOne', query }], { headers }).then(res => {
    try {
      if (res.data.length && res.data[0].response?.status === 200 && res.data[0].response?.data) {
        return res.data[0].response.data
      }
      throw new Error(res.data[0].response.message || 'Không tim thấy biz!')
    } catch (error) {
      const messageError = 'biz.findOne: ' + String(error?.response?.data?.message || error);
      throw new Error(messageError)
    }
  })
}

const findById_byCache = async (bizId) => {
  try {
    let biz = await getCache({ model: 'biz-backdoor', alias: bizId })
    if (!biz) {
      biz = await findOne({ id: bizId })
      await setCache({ model: 'biz-backdoor', data: biz, alias: bizId })
    }
    return biz
  } catch (error) {
    const messageError = 'biz.findById_byCache: ' + String(error?.response?.data?.message || error);
    throw new Error(messageError)
  }
}

export default { findOne, findById_byCache }
