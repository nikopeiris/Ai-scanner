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
    summary: `Analysis of ${owner}/${repo}: Found critical async error handling gaps in API endpoints, unvalidated parameters in webhook handlers, and unbounded in-memory cache growth. Address critical bugs immediately to prevent runtime exceptions under load.`,
    rating: "74",
    criticalBugs: [
      {
        file: "src/controllers/authController.js",
        issue: "Unhandled promise rejection in async login handler when database connection fails.",
        impact: "Server crash under database timeout or connectivity loss (UnhandledPromiseRejectionError).",
        brokenCode: `async function loginUser(req, res) {\n  const user = await db.findUser(req.body.email);\n  res.json({ token: generateToken(user) });\n}`,
        recommendedFix: `async function loginUser(req, res, next) {\n  try {\n    const user = await db.findUser(req.body.email);\n    if (!user) return res.status(401).json({ error: "Invalid credentials" });\n    res.json({ token: generateToken(user) });\n  } catch (error) {\n    next(error);\n  }\n}`
      },
      {
        file: "src/utils/paymentGateway.js",
        issue: "Missing null check on transaction payload object before dereferencing 'payload.amount.currency'.",
        impact: "TypeError crash during webhook callbacks with malformed payloads.",
        brokenCode: `function processWebhook(payload) {\n  const currency = payload.amount.currency;\n  return executePayment(currency, payload.amount.value);\n}`,
        recommendedFix: `function processWebhook(payload) {\n  if (!payload?.amount?.currency) {\n    throw new Error("Invalid payload: missing currency");\n  }\n  const currency = payload.amount.currency;\n  return executePayment(currency, payload.amount.value);\n}`
      }
    ],
    fragileLogic: [
      {
        file: "src/middleware/rateLimiter.js",
        risk: "Memory leak causing Node.js process to hit OOM limits under high traffic.",
        scenario: "Sustained high volume of unique client IPs accessing public endpoints.",
        brokenCode: `const ipMap = {};\nfunction rateLimiter(req, res, next) {\n  const ip = req.ip;\n  ipMap[ip] = (ipMap[ip] || 0) + 1;\n  next();\n}`,
        recommendedFix: `const LRU = require("lru-cache");\nconst rateLimitCache = new LRU({ max: 5000, ttl: 1000 * 60 * 15 });\nfunction rateLimiter(req, res, next) {\n  const ip = req.ip;\n  const count = (rateLimitCache.get(ip) || 0) + 1;\n  rateLimitCache.set(ip, count);\n  next();\n}`
      },
      {
        file: "src/services/userService.js",
        risk: "Data inconsistency and state overwrite during concurrent modifications.",
        scenario: "Multiple fast concurrent updates from identical user ID without atomic transactions.",
        brokenCode: `async function updateUserProfile(id, updates) {\n  const user = await User.findById(id);\n  Object.assign(user, updates);\n  await user.save();\n}`,
        recommendedFix: `async function updateUserProfile(id, updates) {\n  return await User.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true });\n}`
      }
    ],
    maintainabilitySuggestions: [
      {
        file: "src/routes/api.js",
        issue: "Route handlers perform redundant inline payload data transformations.",
        brokenCode: `router.post('/users', (req, res) => {\n  const formatted = {\n    name: req.body.first_name + ' ' + req.body.last_name,\n    email: req.body.email.toLowerCase().trim()\n  };\n  db.save(formatted);\n});`,
        recommendedFix: `// Extract to src/transformers/userTransformer.js\nfunction transformUserInput(body) {\n  return {\n    name: \`\${body.first_name || ''} \${body.last_name || ''}\`.trim(),\n    email: body.email?.toLowerCase().trim()\n  };\n}\n\nrouter.post('/users', (req, res) => {\n  db.save(transformUserInput(req.body));\n});`
      },
      {
        file: "src/config/database.js",
        issue: "Hardcoded connection timeout default of 30,000ms without environment variable fallback.",
        brokenCode: `const config = {\n  host: "localhost",\n  connectionTimeout: 30000\n};`,
        recommendedFix: `const config = {\n  host: process.env.DB_HOST || "localhost",\n  connectionTimeout: parseInt(process.env.DB_TIMEOUT_MS, 10) || 30000\n};`
      }
    ]
  };
}

module.exports = {
  addClient,
  removeClient,
  sendSSEEvent,
  parseGitHubUrl,
  generateMockReport,
};
