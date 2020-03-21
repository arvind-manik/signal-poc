const sessionUtils = require('../utils/sessionutil');

const shareKey = (req, res) => {
  const { user_id: targetUserId } = req.params;
  const requestUserId = req.user._id.toString();

  const message = {};
  const keyData = req.body;

  const { type } = keyData;
  delete keyData.type;

  if (keyData && Object.keys(keyData).length > 0) {
    message.key = keyData;
  }

  message.user_id = requestUserId;

  const eventData = {};
  eventData.event = type;
  eventData.message = message;

  sessionUtils.notify(targetUserId, eventData);

  res.status(204);
  res.end();
};

module.exports = {
  shareKey
};
