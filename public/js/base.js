/* eslint-env jquery, browser */
window.$constants = window.$constants || {};

const you = {};
you.avatar = 'assets/defaultyou.png';
you.name = window.$constants.user_name;

const recipient = {};
recipient.avatar = 'assets/defaultother.jpeg';

const Participant = {
  you: 'you',
  other: 'other'
};

let actionHandler = null;
let eventHandler = null;

function formatAMPM(date) {
  let hours = date.getHours();
  let minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours %= 12;
  hours = hours || 12; // the hour '0' should be '12'
  minutes = minutes < 10 ? `0${minutes}` : minutes;
  const strTime = `${hours}:${minutes} ${ampm}`;
  return strTime;
}

function sendKey(targetUserId, encryptedKeyData) {
  const data = {};
  data.body = encryptedKeyData;
  data.type = 'key-share';
  Util.makeAjax({
    url: `/keys/${targetUserId}`,
    type: 'POST',
    data
  });
}

function shareKey(senderId, type) {
  function makeRequest(data) {
    Util.makeAjax({
      url: `/keys/${senderId}`,
      type: 'POST',
      data
    });
  }

  Users.get(senderId).key_req_time = Date.now();
  let data = { type };
  if(type === 'key-request') {
    makeRequest(data);
  } else {
    getPreKeyForSend(function(preKeyData) {
      preKeyData.type = type;
      makeRequest(preKeyData);
    });
  }
}

function handleSenderAndWaitForKey(senderId, forcedShareType) {
  const userDetails = Users.get(senderId);
  const canShare = forcedShareType || (!userDetails.msgKey && !userDetails.serialMsgKey && (userDetails.is_new || !userDetails.is_blocked));
  delete userDetails.is_new;
  userDetails.is_blocked = true;

  setTimeout(() => {
    userDetails.is_blocked = false;
  }, 5000);

  if (canShare || forcedShareType) {
    if (!userDetails && senderId !== window.$constants.user_id) {
      shareKey(senderId, forcedShareType || 'key-request');
    } else if (userDetails && !userDetails.msgKey) {
      shareKey(senderId, forcedShareType || 'key-request');
    }
  }
  return !userDetails || (!userDetails.serialMsgKey && !userDetails.msgKey);
}

function decipherMessages(senderId) {
  function updateSenderMessages() {
    Transcript.store.messages.forEach((message) => {
      if (message.sender_id === senderId) {
        updateMessageDom(message);
      }
    });
  }

  const userSchema = Users.get(senderId);
  if (userSchema.serialMsgKey && !userSchema.msgKey) {
    deserializeKey(userSchema.serialMsgKey, function(cryptoKey) {
      userSchema.msgKey = cryptoKey;
      updateSenderMessages();
    });
  } else if (userSchema.msgKey) {
    updateSenderMessages();
  }
}

function handleMessageDom(message, isUpdate) {
  let senderName = message.sender_name;

  const {
    who, text, time, sender_id: senderId, seq
  } = message;

  const isLocalUser = senderId === window.$constants.user_id;
  const isWaiting = !isLocalUser && handleSenderAndWaitForKey(senderId);

  if ((!isWaiting || isLocalUser) && message.is_enc) {
    let msgKey = isLocalUser ? myIds.msgKey : Users.get(senderId).msgKey;

    function decryptThisMessage() {
      decryptMessage(msgKey, text, (decrypted) => {
        delete message.is_enc;
        message.text = decrypted;
        updateMessageDom(message);
      });
    }

    if (msgKey) {
      decryptThisMessage();
    } else { 
      deserializeKey(Users.get(senderId).serialMsgKey, function(data) {
        Users.get(senderId).msgKey = data;
        msgKey = data;
        decryptThisMessage();
      });
    }
    
  }

  const prevMessage = Transcript.getPrev(message);
  let ignoreSender = false;
  if (prevMessage) {
    ignoreSender = prevMessage.sender_id === senderId;
  }

  senderName = who === Participant.you ? 'You' : senderName;

  const date = formatAMPM(new Date(time));

  let messageClass;
  let avatarDom;
  let textAlign;
  const textWrap = `<p class="msgtxt">${!message.is_enc ? Util.processXSS(text) : 'Waiting for key...'}</p>`;

  if (who === Participant.other) {
    messageClass = `msj ${ignoreSender ? 'nosender' : ''}`;
    avatarDom = `<div class="avatar avatar-l"><img class="rounded-circle" style="width:100%;" src="${you.avatar}"/></div>`;
    textAlign = 'text-l';
  } else {
    messageClass = `msj-rta ${ignoreSender ? 'nosender' : ''}`;
    avatarDom = `<div class="avatar avatar-r recipient"><img class="rounded-circle" style="width:100%;" src="${recipient.avatar}" /></div>`;
    textAlign = 'text-r';
  }

  const senderDom = ignoreSender ? '' : `<div style="margin: 10px 0 5px;">${avatarDom}<span class="sender ${who}">${senderName}</span></div>`;
  const msgId = `${time}_${seq}`;
  let control = `<div msg-dom id="${msgId}" sender="${senderId}">
                    <li class="message" style="width:100%">
                      <div class="${messageClass} macro">
                        <div class="text ${textAlign}" style="width: 100%;">
                          ${textWrap}
                          <p style="margin-bottom: 2px;"><small>${date}</small></p>
                        </div>
                      </div>
                    </li>
                  </div>`;

  control = isUpdate ? control : `${senderDom}${control}`;

  const transcript = $('#transcript');
  if (!isUpdate) {
    transcript.append(control).scrollTop(transcript.prop('scrollHeight'));
  } else {
    transcript.find(`#${msgId}`).html(control);
  }
}

function addMessageDom(message) {
  handleMessageDom(message, false);
}

function updateMessageDom(message) {
  handleMessageDom(message, true);
}

function getEncodedMessage(text) {
  const enc = new TextEncoder();
  return enc.encode(text);
}

function getDecodedBuffer(buffer) {
  const dec = new TextDecoder();
  return dec.decode(buffer);
}

function encryptMessage(key, data, callback) {
  const iv = window.crypto.getRandomValues(new Uint8Array(16));
  data = getEncodedMessage(data);
  window.crypto.subtle.encrypt({
    name: 'AES-CBC',
    // Don't re-use initialization vectors!
    // Always generate a new iv every time your encrypt!
    iv
  },
  key, // from generateKey or importKey above
  data // ArrayBuffer of data you want to encrypt
  ).then((encrypted) => {
    // returns an ArrayBuffer containing the encrypted data
    callback(`${Util.arrayBufferToBase64(iv)}|${Util.arrayBufferToBase64(new Uint8Array(encrypted))}`);
  }).catch((err) => {
    console.error(err);
  });
}

function decryptMessage(key, data, callback) {
  const dataSplit = data.split('|');
  const iv = Util.base64ToArrayBuffer(dataSplit[0]);
  data = Util.base64ToArrayBuffer(dataSplit[1]);
  window.crypto.subtle.decrypt({
    name: 'AES-CBC',
    iv // The initialization vector you used to encrypt
  },
  key, // from generateKey or importKey above
  data // ArrayBuffer of the data
  )
    .then((decrypted) => {
    // returns an ArrayBuffer containing the decrypted data
      callback(getDecodedBuffer(new Uint8Array(decrypted)));
    })
    .catch((err) => {
      console.error(err);
    });
}

actionHandler = {
  sendMessage(elem) {
    const composer = elem.is('[composer]') ? elem : elem.parents('[composerarea]').find('[composer]');
    const text = composer.val();
    if (text !== '') {
      encryptMessage(window.myIds.msgKey, text, (encryptedText) => {
        const messageData = { text: encryptedText, is_enc: true };
        window.Util.makeAjax({
          url: '/message',
          type: 'POST',
          data: messageData,
          contentType: 'application/json'
        });
        composer.val('');
      });
    }
  }
};

function resetChat() {
  $('#transcript').empty();
}

eventHandler = {
  click(event) {
    const elem = $(event.target);
    const purpose = elem.attr('purpose');
    if (typeof actionHandler[purpose] === 'function') {
      actionHandler[purpose](elem, event);
    }
  },

  keydown(event) {
    if (event.which === 13) {
      actionHandler.sendMessage($(event.target), event);
    }
  }
};

const doc = $(document);
doc.on('keydown', eventHandler.keydown);
doc.on('click', '[purpose]', eventHandler.click);

resetChat();

function loadTranscript() {
  resetChat();
  Transcript.store.messages.forEach((message) => {
    addMessageDom(message);
  });
}

function backupLocals() {
  const usersObj = Users.getObject();
  const transcriptObj = Transcript.getObject();

  if (Object.keys(usersObj).length > 0) {
    Object.keys(usersObj).forEach((key) => {
      const userSpace = usersObj[key];
      delete userSpace.preKeyDetails;
      delete userSpace.is_blocked;
      delete userSpace.msgKey;
      delete userSpace.sessionSetupComplete;
    });

    localStorage.setItem('users', JSON.stringify(usersObj));
  }

  if (transcriptObj.messages.length > 0) {
    localStorage.setItem('transcript', JSON.stringify(transcriptObj));
  }
}

function clearStore() {
  localStorage.removeItem('transcript');
  Transcript = new TranscriptStore();

  localStorage.removeItem('users');
  Users = new UserStore();
}

function clearAll() {
  clearStore();
  clearCredentials();
}

$(window).on('unload', () => {
  backupLocals();
  window.backupIds();
});

setInterval(backupLocals, 30000);
