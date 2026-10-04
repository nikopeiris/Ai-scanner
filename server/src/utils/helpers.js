let sseClients = [];

function addClient(client) {
  sseClients.push(client);
}

function removeClient(clientId) {
  sseClients = sseClients.filter((client) => client.id !== clientId);
}

function sendSSEEvent(eventType, data) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach((client) => {
    try {
      client.res.write(payload);
    } catch (err) {
      console.error("Error writing to SSE client:", err);
    }
  });
}

function parseGitHubUrl(url) {
  if (!url || typeof url !== "string") return null;
  const cleaned = url.trim().replace(/\/+$/, "").replace(/\.git$/, "");
  const match = cleaned.match(/github\.com\/([^\/]+)\/([^\/]+)/i);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}

function generateMockReport(repoUrl, owner, repo) {
  return {
    summary: `Analysis of ${owner}/${repo}: Found critical async error handling gaps in API endpoints, unvalidated parameters in user input handlers, and missing error boundary wrappers for asynchronous operations.`,
    criticalBugs: [
      {
        file: `src/controllers/authController.js`,
        issue: `Unhandled promise rejection in async login handler when database connection fails.`,
        impact: `Server crash under database timeout or connectivity loss (UnhandledPromiseRejectionError).`,
        recommendedFix: `Wrap async DB call in a try/catch block and forward error to express error handling middleware via next(error).`,
      },
      {
        file: `src/utils/paymentGateway.js`,
        issue: `Missing null check on transaction payload object before dereferencing 'payload.amount.currency'.`,
        impact: `TypeError crash during webhook callbacks with malformed payloads.`,
        recommendedFix: `Use optional chaining (payload?.amount?.currency) and validate payload schema prior to processing.`,
      },
    ],
    fragileLogic: [
      {
        file: `src/middleware/rateLimiter.js`,
        issue: `In-memory rate limiter object grows unbounded without expiration or memory eviction policy.`,
        risk: `Memory leak causing Node.js process to hit OOM limits under high traffic.`,
        scenario: `Sustained high volume of unique client IPs accessing public endpoints.`,
      },
      {
        file: `src/services/userService.js`,
        issue: `Potential race condition during simultaneous user profile update requests.`,
        risk: `Data inconsistency and state overwrite during concurrent modifications.`,
        scenario: `Multiple fast concurrent updates from identical user ID without atomic transactions.`,
      },
    ],
    improvements: [
      {
        file: `src/routes/api.js`,
        issue: `Route handlers perform redundant data transformations inline.`,
        category: `Code Quality & Refactoring`,
        suggestion: `Extract payload mapping logic into dedicated DTO transformer helpers to keep route handlers clean and testable.`,
      },
      {
        file: `src/config/database.js`,
        issue: `Hardcoded connection timeout default of 30,000ms without configurable environment variable.`,
        category: `Performance & Flexibility`,
        suggestion: `Extract DB timeout configuration to process.env.DB_TIMEOUT_MS with fallback default.`,
      },
    ],
  };
}

module.exports = {
  addClient,
  removeClient,
  sendSSEEvent,
  parseGitHubUrl,
  generateMockReport,
};
