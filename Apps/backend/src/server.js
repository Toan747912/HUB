const createApp = require("./app");

const PORT = process.env.PORT || 4000;

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`Backend listening on port ${PORT}`);
  });
}

module.exports = createApp;
