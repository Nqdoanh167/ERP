import Backdoor from '../../api/models/backdoor'
import { getCache, setCache } from '../cache';

export const getBackdoorFromRedis = async (id) => {
    let cache = await getCache({ model: 'backdoor', alias: id });
    if (cache) return cache.data;

    let item = await Backdoor.findById(id).populate({ path: 'module', options: { limit: 1, select: 'alias name'} })
    if (item) {
        item = item.view(true);
        await setCache({ model: 'backdoor', alias: id, data: { data: item } })
    }
    return item
}