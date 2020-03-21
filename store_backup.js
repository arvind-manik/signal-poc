/* eslint-env browser, jquery */
window.SignalProtocolStore = function () {
  let store = localStorage.getItem('my_store');
  store = store != null && store.length > 0 ? JSON.parse(store) : {};
  this.store = store;
  this.deserializeStore();
};

window.SignalProtocolStore.prototype = {
  Direction: {
    SENDING: 1,
    RECEIVING: 2,
  },

  getIdentityKeyPair() {
    return Promise.resolve(this.get('identityKey'));
  },
  getLocalRegistrationId() {
    return Promise.resolve(this.get('registrationId'));
  },
  put(key, value) {
    if (key === undefined || value === undefined || key === null || value === null) throw new Error('Tried to store undefined/null');
    this.store[key] = value;
  },
  get(key, defaultValue) {
    if (key === null || key === undefined) throw new Error('Tried to get value for undefined/null key');
    if (key in this.store) {
      return this.store[key];
    }
    return defaultValue;
  },
  remove(key) {
    if (key === null || key === undefined) throw new Error('Tried to remove value for undefined/null key');
    delete this.store[key];
  },

  isTrustedIdentity(identifier, identityKey, direction) {
    if (identifier === null || identifier === undefined) {
      throw new Error('tried to check identity key for undefined/null key');
    }
    if (!(identityKey instanceof ArrayBuffer)) {
      throw new Error('Expected identityKey to be an ArrayBuffer');
    }
    const trusted = this.get(`identityKey${identifier}`);
    if (trusted === undefined) {
      return Promise.resolve(true);
    }
    return Promise.resolve(util.toString(identityKey) === util.toString(trusted));
  },
  loadIdentityKey(identifier) {
    if (identifier === null || identifier === undefined) throw new Error('Tried to get identity key for undefined/null key');
    return Promise.resolve(this.get(`identityKey${identifier}`));
  },
  saveIdentity(identifier, identityKey) {
    if (identifier === null || identifier === undefined) throw new Error('Tried to put identity key for undefined/null key');

    const address = new libsignal.SignalProtocolAddress.fromString(identifier);

    const existing = this.get(`identityKey${address.getName()}`);
    this.put(`identityKey${address.getName()}`, identityKey);

    if (existing && util.toString(identityKey) !== util.toString(existing)) {
      return Promise.resolve(true);
    }
    return Promise.resolve(false);
  },

  /* Returns a prekeypair object or undefined */
  loadPreKey(keyId) {
    let res = this.get(`25519KeypreKey${keyId}`);
    if (res !== undefined) {
      res = { pubKey: res.pubKey, privKey: res.privKey };
    }
    return Promise.resolve(res);
  },
  storePreKey(keyId, keyPair) {
    return Promise.resolve(this.put(`25519KeypreKey${keyId}`, keyPair));
  },
  removePreKey(keyId) {
    return Promise.resolve(this.remove(`25519KeypreKey${keyId}`));
  },

  /* Returns a signed keypair object or undefined */
  loadSignedPreKey(keyId) {
    let res = this.get(`25519KeysignedKey${keyId}`);
    if (res !== undefined) {
      res = { pubKey: res.pubKey, privKey: res.privKey };
    }
    return Promise.resolve(res);
  },
  storeSignedPreKey(keyId, keyPair) {
    return Promise.resolve(this.put(`25519KeysignedKey${keyId}`, keyPair));
  },
  removeSignedPreKey(keyId) {
    return Promise.resolve(this.remove(`25519KeysignedKey${keyId}`));
  },

  loadSession(identifier) {
    return Promise.resolve(this.get(`session${identifier}`));
  },
  storeSession(identifier, record) {
    return Promise.resolve(this.put(`session${identifier}`, record));
  },
  removeSession(identifier) {
    return Promise.resolve(this.remove(`session${identifier}`));
  },
  removeAllSessions(identifier) {
    Object.keys(this.store).forEach((id) => {
      if (id.startsWith(`session${identifier}`)) {
        delete this.store[id];
      }
    });

    return Promise.resolve();
  },
  getSerializedStore() {
    const { store } = this;
    Object.keys(store).forEach((key) => {
      const val = store[key];
      if (key.startsWith('25519Key') || key.startsWith('identityKey')) {
        Object.keys(val).forEach((keyComponent) => {
          val[keyComponent] = btoa(util.toString(val[keyComponent]));
        });
      }
      store[key] = val;
    });
    return JSON.stringify(store);
  },
  deserializeStore() {
    const { store } = this;
    Object.keys(store).forEach((key) => {
      const val = store[key];
      if (key.startsWith('25519Key') || key.startsWith('identityKey')) {
        Object.keys(val).forEach((keyComponent) => {
          val[keyComponent] = util.toArrayBuffer(atob(val[keyComponent]));
        });
      }
      store[key] = val;
    });
    this.store = store;
  }
};

// Util import from src/helpers.js
const util = (() => {
  const StaticArrayBufferProto = new ArrayBuffer().__proto__;

  return {
    toString(thing) {
      if (typeof thing === 'string') {
        return thing;
      }
      return new dcodeIO.ByteBuffer.wrap(thing).toString('base64');
    },
    toArrayBuffer(thing) {
      if (thing === undefined) {
        return undefined;
      }
      if (thing === Object(thing)) {
        if (thing.__proto__ == StaticArrayBufferProto) {
          return thing;
        }
      }

      let str;
      if (typeof thing === 'string') {
        str = thing;
      } else {
        throw new Error(`Tried to convert a non-string of type ${typeof thing} to an array buffer`);
      }
      return new dcodeIO.ByteBuffer.wrap(thing, 'base64').toArrayBuffer();
    },
    serialize(obj) {
      if (typeof obj === 'string') {
        return btoa(obj);
      }
      if (Array.isArray(obj)) {
        const newObj = [];
        obj.forEach((val) => {
          newObj.push(util.toString(val));
        });
        return newObj;
      }
      if ($.isPlainObject(obj)) {
        Object.keys(obj).forEach((key) => {
          obj[key] = util.toString(obj[key]);
        });
        return obj;
      }
    },
    isEqual(a, b) {
      // TODO: Special-case arraybuffers, etc
      if (a === undefined || b === undefined) {
        return false;
      }
      a = util.toString(a);
      b = util.toString(b);
      const maxLength = Math.max(a.length, b.length);
      if (maxLength < 5) {
        throw new Error('a/b compare too short');
      }
      return a.substring(0, Math.min(maxLength, a.length)) === b.substring(0, Math.min(maxLength, b.length));
    }
  };
})();

window.util = util;

