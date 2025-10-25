import multer from "multer";
import path from "path";
import slug from "slug";

const storage = (folder) => {
  return multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, path.join(__dirname, folder));
    },
    filename: function (req, file, cb) {
      // console.log('file', file);
      const datetimestamp = Date.now();
      cb(
        null,
        slug(file.originalname).toLowerCase() +
        "-" +
        datetimestamp +
        "." +
        file.originalname.split(".")[file.originalname.split(".").length - 1]
      );
    },
  });
};
export const uploadExcel = ({ fileSize }) => {
  return multer({
    fileFilter: function (req, file, callback) {
      const ext = path.extname(file.originalname);
      if (![".xls", ".xlsx", ".csv"].includes(ext))
        return callback(
          new Error(JSON.stringify({ status: 403, statusText: "UPLOAD_MALFORMED", message: 'File kkhông đúng định dạng' }))
        );
      const contentSize = parseInt(req.headers['content-length']);
      if (contentSize > fileSize) {
        return callback(
          new Error(JSON.stringify({ status: 413, statusText: "FILE_TOO_LARGE", message: 'Tệp quá lớn. Vui lòng giảm kích thước tệp tin.' }))
        );
      }
      callback(null, true);
    },
    limits: {
      fileSize
    },
  })
};

/**
 * 
 * @param {*} fileSize: Dung lượng file tối đa, Mặc định: 5MB 
 * @returns 
 */
export const uploadImage = ({ fileSize = 5 * 1024 * 1024 }) => {
  return multer({
    fileFilter: function (req, file, callback) {
      const ext = path.extname(file.originalname);
      if (![".png", ".jpg", ".gif", ".jpeg", ".ico"].includes(ext))
        return callback(
          new Error(JSON.stringify({ status: 403, statusText: "UPLOAD_MALFORMED", message: 'File kkhông đúng định dạng' }))
        );
      const contentSize = parseInt(req.headers['content-length']);
      if (contentSize > fileSize) {
        return callback(
          new Error(JSON.stringify({ status: 413, statusText: "FILE_TOO_LARGE", message: 'Tệp quá lớn. Vui lòng giảm kích thước tệp tin.' }))
        );
      }
      callback(null, true);
    },
    limits: {
      fileSize
    },
  })
};

