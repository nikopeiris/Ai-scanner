const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

module.exports = {
  port: process.env.PORT || 5000,
  openAiApiKey: process.env.OPENAI_API_KEY,
  githubToken: process.env.GITHUB_TOKEN,
  githubClientId: process.env.GITHUB_CLIENT_ID,
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET,
};
