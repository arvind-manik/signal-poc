/* eslint-env jquery, browser */

function getObject() {
  const obj = {};
  for (const key in this) {
    if (this.hasOwnProperty(key)) {
      obj[key] = this[key];
    }
  }

  return obj.store;
}

const UserStore = function () {
  let userStore = localStorage.getItem('users');
  userStore = userStore != null && userStore.length > 0 ? JSON.parse(userStore) : {};
  this.store = userStore;
};

UserStore.prototype = {
  add(id, data) {
    this.store[id] = data;
  },
  addDummyUser(id) {
    let data = { id, is_new: true };
    this.store[id] = data;
  },
  get(id) {
    if (!this.store.hasOwnProperty(id)) {
      this.addDummyUser(id);
    }
    return this.store[id];
  },
  getObject
};

let Users = new UserStore();
window.Users = Users;

const TranscriptStore = function () {
  let transcriptStore = localStorage.getItem('transcript');
  transcriptStore = transcriptStore != null && transcriptStore.length > 0 ? JSON.parse(transcriptStore) : { messages: [], seq: 0 };
  this.store = transcriptStore;
};

TranscriptStore.prototype = {
  append(message) {
    const currentSeq = this.store.seq + 1;
    this.store.seq = currentSeq;
    message.seq = currentSeq;
    this.store.messages.push(message);
    return message;
  },

  getPrev(message) {
    const { seq } = message;
    const index = seq - 1;
    return seq > 1 ? this.store.messages[index - 1] : null;
  },

  getNext(message) {
    const { seq } = message;
    const index = seq - 1;
    return seq < this.store.messages.length - 1 ? this.store.messages[index + 1] : null;
  },

  getObject
};

let Transcript = new TranscriptStore();
window.Transcript = Transcript;
