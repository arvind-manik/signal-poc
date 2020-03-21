/* eslint-env jquery, browser */
$(document).ready(() => {
  // Place JavaScript code here...
  const socket = window.io.connect(window.$constants.socket_url, { forceNew: true });
  socket.on('connect', () => {
    const sockHandle = new window.SocketHandler(socket);
    sockHandle.initialize();
    sockHandle.register();
    window.sockHandle = sockHandle;
    window.handleSocketUp();
    window.initKeyHelper();
    window.$constants.csrf_token = document.getElementsByName('_csrf')[0].getAttribute('value');
    window.loadTranscript();
  });

  socket.on('reconnect', () => {
    window.sockHandle.register();
  });
});

window.SocketHandler = function (socket) {
  const sock = socket;

  this.emit = (event, data) => {
    sock.emit(event, data);
  };

  this.registerEvent = (event, callback) => {
    sock.on(event, callback);
  };
};

SocketHandler.prototype = {
  initialize() {
    console.log('Initialized socket');
  },
  register() {
    this.emit('register', { user_id: window.$constants.user_id });
  }
};

function handleSocketUp() {
  window.sockHandle.registerEvent('new-message', (data) => {
    let { message } = data;
    const who = message.sender_id === window.$constants.user_id
      ? Participant.you : Participant.other;
    message.who = who;
    message = Transcript.append(message);
    window.addMessageDom(message);
  });

  window.sockHandle.registerEvent('key-request', (data) => {
    console.log(data);
    data = data.message;
    const userId = data.user_id;
    const requestorSchema = Users.get(userId);
    const type = !requestorSchema.preKeyDetails ? 'key-offer' : 'key-answer';
    delete requestorSchema.sessionSetupComplete;
    handleSenderAndWaitForKey(userId, type);
  });

  window.sockHandle.registerEvent('key-offer', (data) => {
    console.log(data);
    data = data.message;
    const { key: keyData, user_id: userId } = data;
    const remoteDeviceId = keyData.deviceId;
    const userSpace = Users.get(userId);

    const processPreKeyObject = {
      deviceId: remoteDeviceId,
      registrationId: parseInt(keyData.registrationId, 10),
      identityKey: window.Util.base64ToArrayBuffer(keyData.identityKey),
      signedPreKey: {
        keyId: parseInt(keyData.signedPreKey.id, 10),
        publicKey: window.Util.base64ToArrayBuffer(keyData.signedPreKey.key),
        signature: window.Util.base64ToArrayBuffer(keyData.signedPreKey.signature)
      },
      preKey: {
        keyId: parseInt(keyData.preKey.id, 10),
        publicKey: window.Util.base64ToArrayBuffer(keyData.preKey.key)
      }
    };

    userSpace.preKeyDetails = processPreKeyObject;
    userSpace.registrationId = keyData.registrationId;
    userSpace.deviceId = remoteDeviceId;

    handleSenderAndWaitForKey(userId, 'key-answer');
    setupSession(userSpace.preKeyDetails, remoteDeviceId, function() {
      delete userSpace.preKeyDetails;
      userSpace.sessionSetupComplete = true;
      console.log('Session setup complete!');
      const shareMsgKey = JSON.stringify(myIds.serialMsgKey);
      const targetUser = userSpace.deviceId;
      getSecureMessage(shareMsgKey, Users.get(targetUser), function(data) {
        const payload = data; 
        const body = btoa(payload.body);
        window.sendKey(targetUser, body);
      });
    });
    // decipherMessages(userId);
  });

  window.sockHandle.registerEvent('key-answer', (data) => {
    console.log(data);
    data = data.message;
    const { key: keyData, user_id: userId } = data;
    const remoteDeviceId = keyData.deviceId;
    const userSpace = Users.get(userId);

    const processPreKeyObject = {
      deviceId: remoteDeviceId,
      registrationId: parseInt(keyData.registrationId, 10),
      identityKey: window.Util.base64ToArrayBuffer(keyData.identityKey),
      signedPreKey: {
        keyId: parseInt(keyData.signedPreKey.id, 10),
        publicKey: window.Util.base64ToArrayBuffer(keyData.signedPreKey.key),
        signature: window.Util.base64ToArrayBuffer(keyData.signedPreKey.signature)
      },
      preKey: {
        keyId: parseInt(keyData.preKey.id, 10),
        publicKey: window.Util.base64ToArrayBuffer(keyData.preKey.key)
      }
    };

    userSpace.preKeyDetails = processPreKeyObject;
    userSpace.registrationId = keyData.registrationId;
    userSpace.deviceId = remoteDeviceId;

    setupSession(userSpace.preKeyDetails, remoteDeviceId, function() {
      delete userSpace.preKeyDetails;
      userSpace.sessionSetupComplete = true;
      console.log('Session setup complete!');
      const shareMsgKey = JSON.stringify(window.myIds.serialMsgKey);
      const targetUser = userSpace.deviceId;
      getSecureMessage(shareMsgKey, Users.get(targetUser), function(data) {
        const payload = data; 
        const body = btoa(payload.body);
        window.sendKey(targetUser, body);
      });
    });
  });

  window.sockHandle.registerEvent('key-share', (data) => {
    console.log(data);
    data = data.message;
    const keyData = data.key;
    const remoteUserId = data.user_id;

    const encryptedMessageBody = atob(keyData.body);
    processSecureMessage(encryptedMessageBody, Users.get(remoteUserId), function(data) {
      Users.get(remoteUserId).serialMsgKey = JSON.parse(data);
      decipherMessages(remoteUserId);
    });
  });
}
