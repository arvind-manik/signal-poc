/* eslint-env browser, jquery */
const ls = window.libsignal;
const { KeyHelper } = ls;

let myStore = new window.SignalProtocolStore();

const preKeyCount = 5;

let myIds = (() => {
  const myIds = localStorage.getItem('my_credentials');
  return myIds != null && myIds.length > 0 ? JSON.parse(myIds) : {};
})();

function serializeKey(msgKey, callback) {
  window.crypto.subtle.exportKey('jwk', msgKey).then((data) => {
    callback(data);
  });
}

function deserializeKey(serialMsgKey, callback) {
  window.crypto.subtle.importKey('jwk', serialMsgKey, { name: 'AES-CBC' }, true, ['encrypt', 'decrypt']).then((data) => {
    callback(data);
  });
}

window.myIds = myIds;

if (myIds.serialMsgKey) {
  deserializeKey(myIds.serialMsgKey, function(data) {
    window.myIds.msgKey = data;
  });
}

let idKeyPair = myStore.store.identityKey;
window.idKeyPair = idKeyPair;
let { registrationId, deviceId } = myIds;
const preKeys = [];
window.preKeys = preKeys;
const sendPreKeys = [];
window.sendPreKeys = sendPreKeys;
const signedPreKey = {};
window.signedPreKey = signedPreKey;

let isKeyHelperInitialized = false;

function getSecureMessage(message, recipientSchema, callback) {
  const { registrationId, deviceId } = recipientSchema;
  message = getEncodedMessage(message);
  const signalMessageToAddress = new ls.SignalProtocolAddress(registrationId, deviceId);
  const sessionCipher = new ls.SessionCipher(myStore, signalMessageToAddress);

  sessionCipher.encrypt(message).then((encrypted) => {
    callback(encrypted);
  }).catch((err) => {
    console.log(err);
  });
}

function processSecureMessage(message, senderSchema, callback) {
  const { registrationId, deviceId } = senderSchema;
  const signalMessageFromAddress = new ls.SignalProtocolAddress(registrationId, deviceId);
  const sessionCipher = new ls.SessionCipher(myStore, signalMessageFromAddress);

  function decryptCallback(plaintext) {
    const decryptedMessage = window.lsUtil.toString(plaintext);
    callback(decryptedMessage);
  }

  sessionCipher.decryptPreKeyWhisperMessage(message, 'binary').then(decryptCallback).catch(function (e) {
    console.log(`${e}\nTrying normal decrypt now`);
    sessionCipher.decryptWhisperMessage(message, 'binary').then(decryptCallback).catch((err) => {
      console.log(err);
    });
   });
}

function setupSession(processPreKeyObject, incomingDeviceIdStr, callback) {
  const recipientAddress = new ls.SignalProtocolAddress(processPreKeyObject.registrationId, incomingDeviceIdStr);
  const sessionBuilder = new ls.SessionBuilder(myStore, recipientAddress);
  sessionBuilder.processPreKey(processPreKeyObject)
    .then((resp) => {
      console.log(resp);
      callback();
    }).catch((err) => {
      console.log(`Failed! ${err}`);
    });
}

function generateSignedPreKey(callback) {
  KeyHelper.generateSignedPreKey(idKeyPair, registrationId - 1).then((signedPreKey) => {
    signedPreKey = {
      keyId: signedPreKey.keyId,
      keyPair: signedPreKey.keyPair,
      signature: signedPreKey.signature
    };
    myStore.storeSignedPreKey(signedPreKey.keyId, signedPreKey.keyPair);
    window.signedPreKey = signedPreKey;

    if (typeof callback === 'function') {
      callback();
    }
  });
}

function generatePreKeys(callback) {
  const listOfPreKeysPromise = [];
  for (let i = 0; i < preKeyCount; i++) {
    listOfPreKeysPromise.push(KeyHelper.generatePreKey(registrationId + i + 1));
  }
  Promise.all(listOfPreKeysPromise).then((preKeys) => {
    preKeys.forEach((preKey) => {
      const preKeyObject = {
        keyId: preKey.keyId,
        keyPair: preKey.keyPair
      };
      preKeys.push(preKeyObject);
      myStore.storePreKey(preKeyObject.keyId, preKeyObject.keyPair);
      const preKeyObjectToSend = {
        id: preKeyObject.keyId,
        key: window.Util.arrayBufferToBase64(preKeyObject.keyPair.pubKey)
      };
      sendPreKeys.push(preKeyObjectToSend);
    });

    generateSignedPreKey(callback);
  });
}

function getPreKey(callback) {
  const preKey = sendPreKeys.shift();
  if (!preKey) {
    generatePreKeys(() => {
      callback(window.sendPreKeys.shift());
    });
  } else {
    callback(preKey);
  }
}

function getPreKeyForSend(callback) {
  getPreKey((preKey) => {
    callback({
      deviceId,
      registrationId,
      identityKey: window.Util.arrayBufferToBase64(window.idKeyPair.pubKey),
      signedPreKey: {
        id: window.signedPreKey.keyId,
        key: window.Util.arrayBufferToBase64(window.signedPreKey.keyPair.pubKey),
        signature: window.Util.arrayBufferToBase64(window.signedPreKey.signature)
      },
      preKey
    });
  });
}

function generateIdKey() {
  KeyHelper.generateIdentityKeyPair().then((identityKeyPair) => {
    idKeyPair = identityKeyPair;
    window.idKeyPair = identityKeyPair;
    myStore.put('identityKey', idKeyPair);
    generatePreKeys();
  });
}

function generateRegistrationId(myDeviceId, callback) {
  registrationId = ls.KeyHelper.generateRegistrationId();
  window.crypto.subtle.generateKey({
    name: 'AES-CBC',
    length: 256, // can be  128, 192, or 256
  },
  true, // whether the key is extractable (i.e. can be used in exportKey)
  ['encrypt', 'decrypt'] // can be "encrypt", "decrypt", "wrapKey", or "unwrapKey"
  ).then((key) => {
    // returns a key object
    window.myIds.msgKey = key;
    serializeKey(window.myIds.msgKey, function(data) {
      window.myIds.serialMsgKey = data;
    });
    callback();
  });

  myIds.registrationId = registrationId;
  myIds.deviceId = myDeviceId;
  myStore.put('registrationId', registrationId);
  generateIdKey();
}

function initialize(callback) {
  deviceId = window.$constants.user_id;
  generateRegistrationId(deviceId, callback);
}

window.initKeyHelper = () => {
  function callback() {
    isKeyHelperInitialized = true;
  }
  if (typeof registrationId === 'undefined') {
    initialize(callback);
  } else {
    callback();
  }
};

function clearCredentials() {
  localStorage.removeItem('my_credentials');
  localStorage.removeItem('my_store');

  myIds = null;
  myStore = null;
}

window.backupIds = () => {
  if (myIds) {
    delete myIds.msgKey;
    localStorage.setItem('my_credentials', JSON.stringify(window.myIds));
  }

  if (myStore) {
    localStorage.setItem('my_store', myStore.getSerializedStore());
  }
};
