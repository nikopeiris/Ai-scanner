const scannerService = require("../services/scannerService");
const { addClient, removeClient, parseGitHubUrl } = require("../utils/helpers");

exports.handleSSEStream = (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  if (res.flushHeaders) res.flushHeaders();

  const clientId = Date.now();
  const newClient = { id: clientId, res };
  addClient(newClient);

  res.write(
    `event: connected\ndata: ${JSON.stringify({ message: "SSE Connection established" })}\n\n`
  );

  req.on("close", () => {
    removeClient(clientId);
  });
};

exports.scanRepo = async (req, res) => {
  const { repoUrl, owner: reqOwner, repo: reqRepo } = req.body;
  const authHeader = req.headers.authorization;
  const authToken = authHeader ? authHeader.replace("Bearer ", "").trim() : null;

  let owner = reqOwner;
  let repo = reqRepo;

  if (!owner || !repo) {
    if (!repoUrl) {
      return res.status(400).json({ error: "repoUrl or owner/repo is required" });
    }
    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) {
      return res.status(400).json({
        error: "Invalid GitHub repository URL. Format: https://github.com/owner/repo",
      });
    }
    owner = parsed.owner;
    repo = parsed.repo;
  }

  try {
    const report = await scannerService.scanRepository({
      owner,
      repo,
      authToken,
    });

    return res.json({
      success: true,
      repo: `${owner}/${repo}`,
      report,
    });
  } catch (error) {
    console.error("Scan controller error:", error);
    return res.status(500).json({ error: "Failed to scan repository", details: error.message });
  }
};

exports.getUserRepos = async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Authorization header required" });
  }

  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) {
    return res.status(401).json({ error: "Token missing" });
  }

  try {
    const repos = await scannerService.getUserRepositories(token);
    return res.json({ success: true, repos });
  } catch (error) {
    console.error("Error fetching user repos:", error);
    return res.status(500).json({ error: "Failed to fetch repositories", details: error.message });
  }
};
