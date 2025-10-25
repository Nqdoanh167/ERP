import { $post, headers } from ".";

const paths = ['backdoor']


const findOneWard = (query) => {
  return $post(paths, [{ method: 'findOneWard', query }], { headers }).then(res => {

    try {
      if (res.data.length && res.data[0].response?.status === 200 && res.data[0].response?.data) {
        return res.data[0].response.data
      }
      throw new Error(res.data[0].response.message || "Truy vấn thất bại!")
    } catch (error) {
      console.log('findOneWard', error);
      throw new Error(error.toString())
    }
  })
}

const findOneDistrict = (query) => {
  return $post(paths, [{ method: 'findOneDistrict', query }], { headers }).then(res => {
    try {
      if (res.data.length && res.data[0].response?.status === 200 && res.data[0].response?.data) {
        return res.data[0].response.data
      }
      throw new Error(res.data[0].response.message || "Truy vấn thất bại!")
    } catch (error) {
      console.log('findOneDistrict', error);
      throw new Error(error.toString())
    }
  })
}
const findManyDistrict = (query) => {
  return $post(paths, [{ method: 'findManyDistrict', query }], { headers }).then(res => {

    try {
      if (res.data.length && res.data[0].response?.status === 200 && res.data[0].response?.data) {
        return res.data[0].response.data
      }
      throw new Error(res.data[0].response.message || "Truy vấn thất bại!")
    } catch (error) {
      console.log('findManyDistrict', error);
      throw new Error(error.toString())
    }
  })
}

const findOneProvince = (query) => {
  return $post(paths, [{ method: 'findOneProvince', query }], { headers }).then(res => {
    try {
      if (res.data.length && res.data[0].response?.status === 200 && res.data[0].response?.data) {
        return res.data[0].response.data
      }
      throw new Error(res.data[0].response.message || "Truy vấn thất bại!")
    } catch (error) {
      console.log('findOneProvince', error);
      throw new Error(error.toString())
    }
  })
}
const findManyWard = (query) => {
  return $post(paths, [{ method: 'findManyWard', query }], { headers }).then(res => {

    try {
      if (res.data.length && res.data[0].response?.status === 200 && res.data[0].response?.data) {
        return res.data[0].response.data
      }
      throw new Error(res.data[0].response.message || "Truy vấn thất bại!")
    } catch (error) {
      console.log('findOneWard', error);
      throw new Error(error.toString())
    }
  })
}
const findDetectAddress = (query) => {
  return $post(paths, [{ method: 'findDetectAddress', query }], { headers }).then(res => {

    try {
      if (res.data.length && res.data[0].response?.status === 200 && res.data[0].response?.data) {
        return res.data[0].response.data
      }
      throw new Error(res.data[0].response.message || "Truy vấn thất bại!")
    } catch (error) {
      console.log('findDetectAddress', error);
      throw new Error(error.toString())
    }
  })
}


export default {
  findOneWard,
  findOneDistrict,
  findManyDistrict,
  findOneProvince,
  findManyWard,
  findDetectAddress
}
