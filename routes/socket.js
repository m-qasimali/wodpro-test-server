let sockets = [];

function initSocket(io) {
  io.on("connection", (socket) => {
    console.log("socket connected... id: " + socket.id);

    socket.on("disconnect", () => {
      console.log(socket.id);
    });
  });
}
module.exports = initSocket