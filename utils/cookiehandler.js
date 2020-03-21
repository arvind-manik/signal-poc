const sessionUtils = require('../utils/sessionutil');

let encryptor;

const middleware = (req, res, next) => {
  let cookie = req.cookies[process.env.AUTH_COOKIE_NAME];
  const isCookieSet = typeof cookie !== 'undefined';
  let isAuthenticated = typeof req.user !== 'undefined';

  if (typeof cookie === 'undefined' && isAuthenticated) {
    const userId = req.user._id.toString();
    const validity = Date.now() + 86400000;
    cookie = encryptor.encrypt(`${userId}|${validity}`);
  } else if (isAuthenticated) {
    try {
      const cookieVal = encryptor.decrypt(cookie);
      const split = cookieVal.split('|');
      const expiryTime = split[1];
      if (expiryTime < Date.now()) {
        throw new Error('Cookie validtity over');
      }
    } catch (e) {
      isAuthenticated = false;
      console.log(`Wrong cookie used ${e}`);
    }
  }

  if (isAuthenticated && !isCookieSet) {
    res.cookie(process.env.AUTH_COOKIE_NAME, cookie, { maxAge: 86400000 });
  } else if (sessionUtils.needsLogin(req) && !isAuthenticated) {
    return res.redirect('/login');
  }
  next();
};

const initialize = (encryptorInstance) => {
  encryptor = encryptorInstance;
  return middleware;
};

module.exports = {
  initialize
};
