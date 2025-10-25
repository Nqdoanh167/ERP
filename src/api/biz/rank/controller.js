import { notFound, response } from "../../../services/response";
import Rank from "../../models/rank";
import { getCache, setCache } from "../../../services/cache";
import { removeServiceCache, setServiceCache } from "../../../services/cache";
import { cleanObjectBodymen } from "../../../utils/common";
import { NotFoundError } from "../../../services/response/errors";

export const getCurrentRank = async ({ point, bizId, ranks }) => {
  let currentRank = null;
  try {
    if (!ranks) {
      ranks = await getCacheRank({ bizId });
    }
    if (!ranks) return null;
    ranks = ranks.filter((r) => r.isActive);
    currentRank = ranks.find((row, index) => {
      const nextRank = ranks[index + 1];
      if (nextRank) {
        return row.point <= point && nextRank.point > point;
      }
      return point >= row.point;
    });
    if (!currentRank && point !== 0 && point >= ranks[ranks.length - 1]?.point) {
      currentRank = ranks[ranks.length - 1];
    }
  } catch (error) {
    console.log("error", error);
  }
  return currentRank;
};

export const getCacheRank = async ({ bizId }) => {
  try {
    let dataCache = await getCache({ model: "rank", alias: bizId });
    if (dataCache) {
      // parse cache string to json object
      let dataViewCache = dataCache.data;
      dataViewCache = dataViewCache.sort((a, b) => a.point - b.point);
      return dataViewCache
    }
    let ranks = await Rank.find({ bizId });

    let dataView = ranks.map((r) => r.view());
    dataView = dataView.sort((a, b) => a.point - b.point);

    setCache({
      model: "rank",
      alias: bizId,
      data: {
        data: dataView,
        status: 200,
        statusText: "SUCCESS",
        subStatus: 200,
        subStatusText: "",
        message: "Get success",
        _cache: true,
      },
    });
    return dataView;
  } catch (error) {
    console.log("error", error);
  }
  return [];
};

export const create = (req, res, next) => {
  const { biz, viewer, bodymen: { body }, } = req;
  new Promise(async (resolve, reject) => {
    try {
      cleanObjectBodymen(body);

      return resolve(
        Rank.create({
          ...body,
          bizId: biz.id,
          author: viewer.id,
          updatedBy: {
            id: viewer.id,
            name: viewer.name,
            email: viewer.email,
            picture: viewer.picture,
          },
        })
      );
    } catch (error) {
      return reject(
        new Error(JSON.stringify({ status: 500, message: error.toString() }))
      );
    }
  })
    .then((rank) => ({ data: rank.view(false) }))
    .then(data => response(res, data))
    .then((data) => removeServiceCache({ req, model: "rank" }))
    .catch(next);
};

export const index = (req, res, next) => {
  const { biz, querymen: { query, select, cursor }, } = req;
  query.bizId = biz.id;
  Rank.find(query, select, cursor)
    .then((ranks) => ({
      data: ranks.map((rank) => rank.view()),
    }))
    .then(data => response(res, data))
    .then((data) => setServiceCache({ req, model: "rank", data }))
    .catch(next);
};

export const show = (req, res, next) => {
  const { biz, params } = req;
  Rank.findOne({ _id: params.id, bizId: biz.id })
    .then(notFound(res))
    .then((rank) => ({ data: rank ? rank.view() : null }))
    .then(data => response(res, data))
    .then((data) => setServiceCache({ req, model: "rank", data }))
    .catch(next);
};

export const update = (req, res, next) => {
  const { biz, viewer, bodymen: { body }, params, } = req;
  Promise.resolve()
    .then(async () => {
      let rank = await Rank.findOne({ _id: params.id, bizId: biz.id });
      if (!rank) {
        throw new NotFoundError("Không tìm thấy hạng thành viên!");
      }
      cleanObjectBodymen(body)

      body.updatedBy = {
        id: viewer.id,
        name: viewer.name,
        email: viewer.email,
        picture: viewer.picture,
      };
      rank = await Object.assign(rank, body).save();
      return resolve({ data: rank.view() });
    })
    .then(data => response(res, data))
    .then((data) => removeServiceCache({ req, model: "rank" }))
    .catch(next);
};

export const destroy = (req, res, next) => {
  const { biz, params } = req;
  Rank.findOne({ _id: params.id, bizId: biz.id })
    .then(rank => {
      if (!rank) {
        throw new NotFoundError("Không tìm thấy hạng thành viên!");
      }
      return rank.remove();
    })
    .then((rank) => ({ data: rank.view(false) }))
    .then(data => response(res, data))
    .then((data) => removeServiceCache({ req, model: "rank" }))
    .catch(next);
};
