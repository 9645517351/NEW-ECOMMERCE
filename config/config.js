const sessionSecret = 'mysitesessionsecret'


const emailUser = 'shijil369@gmail.com'
const emailPassword = 'qmjnhwqggpybgzxq'

module.exports = {
    sessionSecret,
    emailUser,
    emailPassword
}


const multer = require("multer");
require("dotenv").config();

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./public/assets/uploads");
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname);
    },
});

const upload = multer({ storage: storage });

module.exports = {
    upload
};
