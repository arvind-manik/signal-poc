Sample implementation of a chat application integrated with Signal protocol for E2E encryption during communication

Passport authentication and schema used from hackathon starter template at https://github.com/sahat/hackathon-starter is used.

Requires node.js (with dependencies), MongoDB (for passport user authentication storage).
Needs a websocket client running in the same server to work. (socket.io used here)

Web client needs WebCrypto API support, libsignal js client library, jQuery, bootstrap.

Yet to do:
1. Share files (with E2E encryption)
2. Persist transcript on server side too (currently only preserved in client)
3. Implement proper key rotation (now signal is used for signalling message key once to other clients)
