import { $post, headers } from '.'
import { getCache, setCache } from "../cache"

const paths = ['backdoor']

const authService = async (backdoorToken) => {
  try {
    let backdoor = await getCache({ model: 'authService', queryParams: { backdoorToken } })
    if (!backdoor) {
      const res = await $post(paths, [{ method: 'authService', query: { backdoorToken } }], { headers });
      if (res.data.length && res.data[0].response?.status === 200 && res.data[0].response?.data) {
        backdoor = res.data[0].response.data
        await setCache({ model: 'authService', data: backdoor, queryParams: { backdoorToken } })
      } else {
        throw new Error(res.data[0].response.message || 'Không tim thấy backdoor!')
      }
    }
    return backdoor
  } catch (error) {
    const messageError = 'main.authService: ' + String(error?.response?.data?.message || error);
    throw new Error(messageError)
  }
}

export default { authService }
