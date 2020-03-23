# Ozen Signal POC

### Overview
Sample implementation of a chat application integrated with Signal protocol for E2E encryption during communication
JS signal protocol library - Libsignal (https://github.com/signalapp/libsignal-protocol-javascript)
Passport authentication and schema used from express boilerplate (https://github.com/sahat/hackathon-starter).

### Dependencies
Requires node.js (with dependencies), MongoDB (for passport user authentication storage).
Needs a websocket client running in the same server to work. (socket.io used here)
Web client needs WebCrypto API support, libsignal js client library, jQuery, bootstrap.

### How to run
1. Clone repo
2. run `npm install` on root directory to install the dependencies
3. run `npm run start` to start the appserver and socket listener.

### Yet to do:
1. Share files (with E2E encryption)
2. Persist transcript on server side too (currently only preserved in client)
3. Implement proper key rotation (now signal is used for signalling message key once to other clients)
