/* eslint-env browser, jquery */

function SignalProtocolStore() {
  let store = localStorage.getItem('my_store');
  store = store != null && store.length > 0 ? JSON.parse(store) : {};
  this.store = store;
  this.deserializeStore();
}

SignalProtocolStore.prototype = {
  util: window.util,

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
    for (const id in this.store) {
      if (id.startsWith(`session${identifier}`)) {
        delete this.store[id];
      }
    }
    return Promise.resolve();
  },
  getSerializedStore() {
    const { store } = this;
    Object.keys(store).forEach((key) => {
      let val = store[key];
      if (key.startsWith('25519Key') || key.startsWith('identityKey')) {
        if (val instanceof ArrayBuffer || typeof val === 'string') {
          val = btoa(util.toString(val));
        } else {
          Object.keys(val).forEach((keyComponent) => {
            val[keyComponent] = btoa(util.toString(val[keyComponent]));
          });
        }
      }
      store[key] = val;
    });
    return JSON.stringify(store);
  },
  deserializeStore() {
    const { store } = this;
    Object.keys(store).forEach((key) => {
      let val = store[key];
      if (key.startsWith('25519Key') || key.startsWith('identityKey')) {
        if (typeof val === 'string') {
          val = atob(val);
          try {
            val = util.toArrayBuffer(val);
          } catch (e) {
            console.log(e);
          }
        } else {
          Object.keys(val).forEach((keyComponent) => {
            val[keyComponent] = util.toArrayBuffer(atob(val[keyComponent]));
          });
        }
      }
      store[key] = val;
    });
    this.store = store;
  }
};

const util = (function () {
  const StaticArrayBufferProto = new ArrayBuffer().__proto__;

  return {
    toString(thing) {
      if (typeof thing === 'string') {
        return thing;
      }
      return new dcodeIO.ByteBuffer.wrap(thing).toString('binary');
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
      return new dcodeIO.ByteBuffer.wrap(thing, 'binary').toArrayBuffer();
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
      return a.substring(0, Math.min(maxLength, a.length)) == b.substring(0, Math.min(maxLength, b.length));
    }
  };
}());

window.SignalProtocolStore = SignalProtocolStore;
window.lsUtil = util;
