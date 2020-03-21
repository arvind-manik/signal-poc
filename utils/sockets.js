let ioPipe;

const initialize = (io) => {
  ioPipe = io;

  io.use((socket, next) => {
    console.log(socket.request);
    next();
  });

  io.on('connection', (socket) => {
    console.log(`${socket.toString()}\nNew user connected`);
    socket.emit('server-up', 'true');

    socket.on('register', (data) => {
      socket.user_id = data.user_id;
      socket.join(data.user_id);
    });

    socket.on('client-msg', (data) => {
      console.log(data);
      socket.emit('server-ack', 'got it');
    });

    socket.on('disconnect', () => {
      io.emit('User disconnected');
    });
  });
};

const broadcast = (data) => {
  ioPipe.sockets.emit(data.event, data);
};

const notify = (userId, data) => {
  ioPipe.sockets.in(userId).emit(data.event, data);
};

function findClientsSocket(roomId, namespace) {
  const res = [];
  // the default namespace is "/"
  const ns = ioPipe.of(namespace || '/');

  if (ns) {
    for (const id in ns.connected) {
      if (roomId) {
        const index = ns.connected[id].rooms.indexOf(roomId);
        if (index !== -1) {
          res.push(ns.connected[id]);
        }
      } else {
        res.push(ns.connected[id]);
      }
    }
  }
  return res;
}

module.exports = {
  initialize,
  broadcast,
  notify,
  findClientsSocket
};
