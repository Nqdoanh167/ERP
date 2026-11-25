/**
 * Xóa key có value là undefined ( Vì khi sử dụng bodymen các giá trị mặc định sẽ được gán là undefined nếu không truyền lên theo body)
 * @param {*} obj
 */
export const cleanObjectBodymen = (obj) => {
  Object.keys(obj).forEach((key) => {
    if (obj[key] === undefined) {
      delete obj[key];
    }
  });
  return obj;
};

/**
 * Xóa key có value là null, undefined, empty
 * @param  {} obj
 */
export const cleanObject = (obj) => {
  for (let key in obj) {
    if (obj[key] !== null && typeof obj[key] === "object") {
      cleanObject(obj[key]);
    }
    if (
      obj[key] === null ||
      obj[key] === undefined ||
      (typeof obj[key] === "object" && Object.keys(obj[key]).length === 0)
    ) {
      delete obj[key];
    }
  }
  return obj;
};
/**
 * Copy value
 * @param  {} targetObj
 * @param  {} sourceObj
 */
export const assignObject = (targetObj, sourceObj) => {
  for (let key in targetObj) {
    const typeOfT = typeof targetObj[key];
    const typeOfC = typeof sourceObj[key];
    // console.log({ key, typeOfT, typeOfC })
    if (typeOfT === "object" && typeOfC === "object") {
      assignObject(targetObj[key], sourceObj[key]);
    }
    if (
      typeof typeOfC !== "object" &&
      typeOfC !== "function" &&
      typeOfC !== "undefined" &&
      sourceObj[key] !== null
    ) {
      // console.log('==================>>', key, targetObj[key], sourceObj[key])
      targetObj[key] = sourceObj[key];
    }
  }
  return targetObj;
};

export const xoa_dau = (str) => {
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  str = str.replace(/đ/g, "d");
  str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
  str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
  str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
  str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
  str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
  str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
  str = str.replace(/Đ/g, "D");
  return str;
};

export const equalObjIds = (objId_1, objId_2) => {
  if (!objId_1 || !objId_2) return false;
  const _id1 =
    typeof objId_1.toString === "function" ? objId_1.toString() : objId_1;
  const _id2 =
    typeof objId_2.toString === "function" ? objId_2.toString() : objId_2;
  return _id1 === _id2;
};
export const isPhone = (phone) => {
  return /^\d{9,11}$/.test(phone);
};
export const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return "";
  phoneNumber = phoneNumber
    .replace(/[^0-9]/g, "") // replace kí tự không phải số thành ''
    .replace(/^84/, "0") // replace 84 thành 0
    .replace(/^0+/, ""); // replace các số 0 ở đầu thành ''

  phoneNumber = "0" + phoneNumber; // thêm số 0 ở đầu
  return phoneNumber;
};
export const isEmail = (email) => {
  return /^\S+@\S+\.\S+$/.test(email);
};
/**
 * Kiểm tra định dạng alias của biz
 * @param {*} alias: string
 * @returns boolean
 */
export const isBizAlias = (alias) => {
  return /^[A-Za-z0-9](?:[A-Za-z0-9\-_]{0,61}[A-Za-z0-9])?$/gm.test(alias);
};

/**
 * Hàm retry
 * @param {Function} fn - Hàm cần thực thi (có thể async)
 * @param {number} retries - Số lần thử lại (mặc định: 3)
 * @param {number} delay - Thời gian chờ giữa các lần thử (ms)
 */
export async function retry(fn, retries = 3, delay = 1000) {
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.warn(`Attempt ${attempt} failed:`, error);

      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Chuẩn hoá SĐT làm key (vd limit flash-sale): "+84 912-345-678" → "0912345678".
 * Trả về null nếu không phải SĐT hợp lệ.
 */
export const normalizePhone = (phone) => {
  const normalized = formatPhoneNumber(String(phone || ""));
  return /^0\d{8,10}$/.test(normalized) ? normalized : null;
};
