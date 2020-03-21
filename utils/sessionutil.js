const sockets = require('./sockets');

const getWritableUser = (user) => {
  const userData = JSON.parse(JSON.stringify(user));
  delete userData.password;
  delete userData.tokens;
  return userData;
};

const needsLogin = (req) => {
  const requestPath = req.path;
  let needsLogin = true;
  switch (requestPath) {
    case '/login':
    case '/logout':
    case '/forgot':
    case '/signup':
      needsLogin = false;
      break;
    default:
  }

  if (needsLogin && (requestPath.startsWith('/reset') || requestPath.startsWith('/account'))) {
    needsLogin = false;
  }

  return needsLogin;
};

module.exports = {
  getWritableUser,
  needsLogin,
  broadcast: sockets.broadcast,
  notify: sockets.notify,
  getLiveUsers: sockets.findClientsSocket
};
