window.$constants = window.$constants || {};

const Util = {
  decodeHTMLEntities: (value) => value
    .replace(/&#x2F;/g, '/')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&'),

  processXSS: (value, ignoredecode) => {
    if (!value) {
      return value;
    }
    if (!ignoredecode) {
      value = this.decodeHTMLEntities(value);
    }
    return value.replace(/&/g, '&amp;').replace(/\"/g, '&quot;').replace(/\'/g, '&#39;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
};

const you = {};
you.avatar = 'assets/defaultyou.png';
you.name = $constants.user_name;

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

function sendMessage(who, text, delay) {
  if (delay === undefined) {
    delay = 0;
  }

  const date = formatAMPM(new Date());

  let messageClass;
  let avatarDom;
  let textAlign;
  let textWrap;

  if (who === Participant.you) {
    messageClass = 'msj';
    avatarDom = `<div class="avatar"><img class="img-circle" style="width:100%;" src="${you.avatar}"/></div>`;
    textAlign = 'text-l';
    textWrap = `<p style="padding: 10px;">${Util.processXSS(text)}</p>`;
  } else {
    messageClass = 'msj-rta';
    avatarDom = `<div class="avatar recipient"><img class="img-circle" style="width:100%;" src="${recipient.avatar}" /></div>`;
    textAlign = 'text-r';
    textWrap = `<p style="padding: 10px 0px;">${Util.processXSS(text)}</p>`;
  }

  if (who === Participant.you) {
    control = `${'<li class="message" style="width:100%">'
                        + '<div class="msj macro">'
                        + '<div class="avatar"><img class="img-circle" style="width:100%;" src="'}${you.avatar}" /></div>`
                            + '<div class="text text-l">'
                                + `<p style="padding: 10px;">${text}</p>`
                                + `<p style="margin-bottom: 2px;"><small>${date}</small></p>`
                            + '</div>'
                        + '</div>'
                    + '</li>';
  } else {
    control = `${'<li class="message" style="width:100%;">'
                        + '<div class="msj-rta macro">'
                            + '<div class="text text-r">'
                                + '<p style="padding: 10px 0px;">'}${text}</p>`
                                + `<p style="margin-bottom: 2px;"><small>${date}</small></p>`
                            + '</div>'
                        + `<div class="avatar recipient"><img class="img-circle" style="width:100%;" src="${recipient.avatar}" /></div>`
                  + '</li>';
  }

  let control = `<li class="message" style="width:100%">'
                  '<div class="'${messageClass} macro">
                    ${who === Participant.you ? avatarDom : ''}
                    <div class="text ${textAlign}">
                      ${textWrap}
                      <p style="margin-bottom: 2px;"><small>${date}</small></p>
                    </div>
                  </div>
                </li>`;

  const transcript = $('#transcript');
  setTimeout(() => {
    transcript.append(control).scrollTop(transcript.prop('scrollHeight'));
  }, delay);
}

actionHandler = {
  sendMessage(elem) {
    const composer = elem.is('[composer]') ? elem : elem.parents('[composerarea]').find('[composer]');
    const text = composer.val();
    if (text !== '') {
      sendMessage(Participant.you, text);
      composer.val('');
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

// -- Print Messages
sendMessage(Participant.you, 'Hello Tom...', 0);
sendMessage(Participant.other, 'Hi, Pablo', 1500);
sendMessage(Participant.you, 'What would you like to talk about today?', 3500);
sendMessage(Participant.other, 'Tell me a joke', 7000);
sendMessage(Participant.you, 'Spaceman: Computer! Computer! Do we bring battery?!', 9500);
sendMessage(Participant.other, 'LOL', 12000);

