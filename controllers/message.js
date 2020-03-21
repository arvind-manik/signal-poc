const sessionUtils = require('../utils/sessionutil');

const message = (req, res) => {
  const user = sessionUtils.getWritableUser(req.user);
  const senderId = user._id;
  const senderName = typeof user.profile !== 'undefined' ? user.profile.name : user.email;
  const inputData = req.body;

  const message = {};
  message.text = inputData.text;
  message.sender_id = senderId;
  message.sender_name = senderName;
  message.time = Date.now();
  message.is_enc = inputData.is_enc;

  const eventData = {};
  eventData.event = 'new-message';
  eventData.message = message;

  sessionUtils.broadcast(eventData);

  res.status(204);
  res.end();
};

module.exports = {
  message
};
