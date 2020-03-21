/* eslint-env browser, jquery */
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
      value = Util.decodeHTMLEntities(value);
    }
    return value.replace(/&/g, '&amp;').replace(/\"/g, '&quot;').replace(/\'/g, '&#39;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  },

  arrayBufferToBase64: (buffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  },

  base64ToArrayBuffer: (base64) => {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  },

  makeAjax(params) {
    params = $.extend({}, params, { headers: { 'X-CSRF-Token': window.$constants.csrf_token } });
    if (typeof params.data !== 'undefined' && params.contentType === 'application/json') {
      params.data = JSON.stringify(params.data);
    }

    function successCallback(data) {
      if (typeof params.onSuccess === 'function') {
        params.onSuccess(data);
      }
    }

    $.ajax(params).done(successCallback);
  },

  cloneObject(obj) {
    return JSON.parse(JSON.stringify(obj));
  }
};

window.Util = Util;
