const crypto = require('crypto');

const algorithm = 'aes-256-cbc';
const hashAlgorithm = 'sha256';
const outputEnc = 'base64';
const ivLen = 16;

let key;

function encrypt(text) {
  const iv = crypto.randomBytes(ivLen);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv);
  let encrypted = cipher.update(text);

  encrypted = Buffer.concat([encrypted, cipher.final()]);

  return `${iv.toString(outputEnc)}:${encrypted.toString(outputEnc)}`;
}

function decrypt(text) {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift(), outputEnc);
  const encryptedText = Buffer.from(textParts.join(':'), outputEnc);
  const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key), iv);
  let decrypted = decipher.update(encryptedText);

  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString();
}

const initialize = (aesKeySecret) => {
  key = crypto.createHash(hashAlgorithm)
    .update(String(aesKeySecret))
    .digest(outputEnc)
    .substr(0, 32);
};

module.exports = {
  encrypt,
  decrypt,
  initialize
};
