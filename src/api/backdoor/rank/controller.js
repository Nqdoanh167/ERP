import { resolveBackdoor, rejectBackdoor } from '../../../services/response'
import { queryValidator, bodyValidator } from '../../../utils/validation'
import { getCache, setCache } from '../../../services/cache'
import Rank, { rankModel } from '../../models/rank'

export const findOne = async (queryParams) => {
  let result = {}
  try {
    // Valid
    const queryModel = {
      bizId: { type: String, required: true },
      id: { type: String, paths: ['_id'], required: true }
    }

    const handlerValidator = await queryValidator(queryParams.query, queryModel);
    if (!handlerValidator.valid) {
      return rejectBackdoor({ queryParams, status: 422, statusText: 'BAD_USER_INPUT', data: handlerValidator })
    }

    const { querymen: { query, select } } = handlerValidator;
    // getcache
    const cache = await getCache({ model: 'customer', queryParams: query, alias: query.bizId });
    console.log('cache', cache);
    if (cache) return resolveBackdoor({ queryParams, data: cache });


    const data = await Rank.findOne(query);
    if (!data) {
      return rejectBackdoor({ queryParams, status: 404, statusText: 'NOT_FOUND', message: 'Rank not found' })
    }
    result.data = data.view(true);

    await setCache({ model: 'rank', alias: query.bizId, data: result, queryParams: query });

    result = resolveBackdoor({ queryParams, data: result })
    // save cache

  } catch (error) {
    result.status = 500;
    result.message = error.toString()
    result = resolveBackdoor({ queryParams, data: result })
  }
  return result

}

export const findMany = async (queryParams) => {
  let result = {}
  try {
    // Valid
    const queryModel = {
      bizId: { type: String, required: true },
      id: { type: String },
      ids: { type: [String], paths: ['id'] },
      emails: [String],
      phones: [String],
      gender: String,
      provinceCode: String,
      isActive: Boolean
    }

    const handlerValidator = await queryValidator(queryParams.query, queryModel);
    if (!handlerValidator.valid) {
      return rejectBackdoor({ queryParams, status: 422, statusText: 'BAD_USER_INPUT', data: handlerValidator })
    }

    const { querymen: { query, select, cursor } } = handlerValidator;
    // getcache
    const cache = await getCache({ model: 'rank', queryParams: query, alias: query.bizId });
    if (cache) return resolveBackdoor({ queryParams, data: cache.data });

    const total = await Rank.countDocuments(query);
    result.total = total;
    result.data = [];

    if (!total) {
      const data = await Rank.find(query, select, cursor);
      result.data = data.map(item => item.view(true));
    }
    // save cache
    await setCache({ model: 'customer', alias: query.bizId, data: result.data, queryParams: query });

    result = resolveBackdoor({ queryParams, data: data })

  } catch (error) {
    result.status = 500;
    result.message = error.toString()
    result = resolveBackdoor({ queryParams, data: result })
  }
  return result
}

export const updateOne = async (bodyParams) => {
  let result = {}
  try {

    const handlerQueryValidator = await queryValidator(bodyParams.query, {
      bizId: { type: String, required: true },
      id: { type: String, required: true },
    });
    const handlerValidator = await bodyValidator(bodyParams.data, {
      ...rankModel,
      name: String,
      loyalty: { type: Object }
    });
    if (!handlerValidator.valid) {
      return rejectBackdoor({ bodyParams, status: 422, statusText: 'BAD_USER_INPUT', data: handlerValidator })
    }
    const { body } = handlerValidator;
    const { querymen: { query } } = handlerQueryValidator;

    // handle update data
    result.data = {}
    return resolveBackdoor({ bodyParams, data: result })
  } catch (error) {
    result.status = 500;
    result.message = error.toString()
    result = resolveBackdoor({ bodyParams, data: result })
  }
  return result
}