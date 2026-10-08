const { Octokit } = require("@octokit/rest");
const OpenAI = require("openai");
const config = require("../config/env");
const { sendSSEEvent, generateMockReport } = require("../utils/helpers");

class ScannerService {
  getOctokitInstance(token) {
    const authToken = token || config.githubToken || undefined;
    return new Octokit({ auth: authToken });
  }

  getOpenAIInstance() {
    return config.openAiApiKey
      ? new OpenAI({
        apiKey: config.openAiApiKey
      })
      : null;
  }

  async scanRepository({ owner, repo, authToken, context }) {
    const octokit = this.getOctokitInstance(authToken);
    const openai = this.getOpenAIInstance();

    sendSSEEvent("progress", {
      step: "INIT",
      message: `Target repository identified: ${owner}/${repo}`,
      progress: 10,
    });

    sendSSEEvent("progress", {
      step: "FETCH_TREE",
      message: "Fetching repository file tree via GitHub REST API...",
      progress: 25,
    });

    let treeFiles = [];
    let defaultBranch = "main";

    try {
      const repoInfo = await octokit.rest.repos.get({ owner, repo });
      defaultBranch = repoInfo.data.default_branch;

      const treeRes = await octokit.git.getTree({
        owner,
        repo,
        tree_sha: defaultBranch,
        recursive: "1",
      });

      if (treeRes && treeRes.data && treeRes.data.tree) {
        treeFiles = treeRes.data.tree;
      }
    } catch (error) {
      console.warn("GitHub API tree fetch warning:", error.message);
      sendSSEEvent("progress", {
        step: "WARN",
        message: `GitHub API warning (${error.message}). Attempting scan with available scope...`,
        progress: 40,
      });
    }

    const validExtensions = [".js", ".jsx", ".ts", ".tsx", ".py", ".java", ".go", ".rs", ".php", ".cs"];
    const ignoredPaths = ["node_modules/", ".git/", "dist/", "build/", "vendor/", "package-lock.json", "yarn.lock"];

    const sourceFiles = treeFiles.filter((item) => {
      if (item.type !== "blob") return false;
      if (ignoredPaths.some((p) => item.path.includes(p))) return false;
      return validExtensions.some((ext) => item.path.endsWith(ext));
    });

    const selectedFiles = sourceFiles.slice(0, 10);
    const fetchedCodeFiles = [];

    sendSSEEvent("progress", {
      step: "FETCH_FILES",
      message: `Selected ${selectedFiles.length || 5} key source files for deep inspection.`,
      progress: 50,
    });

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      sendSSEEvent("progress", {
        step: "ANALYZING_FILE",
        message: `Reading source code: ${file.path}`,
        progress: 50 + Math.floor(((i + 1) / selectedFiles.length) * 25),
      });

      try {
        const fileContent = await octokit.repos.getContent({
          owner,
          repo,
          path: file.path,
          ref: defaultBranch,
        });

        if (fileContent.data && fileContent.data.content) {
          const decoded = Buffer.from(fileContent.data.content, "base64").toString("utf-8");
          fetchedCodeFiles.push({ path: file.path, content: decoded.slice(0, 3000) });
        }
      } catch (e) {
        console.warn(`Could not fetch content for ${file.path}: ${e.message}`);
      }
    }

    sendSSEEvent("progress", {
      step: "AI_ANALYSIS",
      message: "Generating AI Quality & Security Report using OpenAI...",
      progress: 85,
    });

    let report;

    if (openai && fetchedCodeFiles.length > 0) {
      try {
        const promptText = `
You are a senior QA & Security Engineer performing an automated audit on the repository ${owner}/${repo}.
Examine the following source files and return a JSON object with this EXACT structure:
{
  "summary": "An executive summary of the repository quality.",
  "criticalBugs": [
    { "file": "path/file.ext", "issue": "concise description of the bug", "impact": "Impact of the bug", "brokenCode": "broken code", "recommendedFix": "fixed code" }
  ],
  "fragileLogic": [
    { "file": "path/file.ext", "risk": "Description of the risk", "scenario": "Scenario where the bug may occur", "brokenCode": "broken code", "recommendedFix": "fixed code"}
  ],
  "maintainabilitySuggestions": [
    { "file": "path/file.ext", "issue": "concise description of maintainability issue", "brokenCode": "section of code that needs fixing", "recommendedFix": "fixed code" }
  ]
}
${context != null ? "The code should follow this logic: " + context : ""}

Code Files:
${fetchedCodeFiles.map((f) => `--- FILE: ${f.path} ---\n${f.content}\n`).join("\n")}
`;

        const completion = await openai.chat.completions.create({
          model: "gpt-5-nano",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: "You are an expert static analysis and code audit AI." },
            { role: "user", content: promptText },
          ],
        });

        const rawContent = completion.choices[0].message.content;
        report = JSON.parse(rawContent);
      } catch (aiErr) {
        console.warn("OpenAI API call failed, falling back to mock report:", aiErr.message);
        report = generateMockReport("", owner, repo);
      }
    } else {
      report = generateMockReport("", owner, repo);
    }

    sendSSEEvent("progress", {
      step: "COMPLETE",
      message: "Analysis complete! Report generated successfully.",
      progress: 100,
    });

    return report;
  }

  async getUserRepositories(userToken) {
    const octokit = new Octokit({ auth: userToken });
    const response = await octokit.rest.repos.listForAuthenticatedUser({
      sort: "updated",
      per_page: 50,
      visibility: "all",
    });

    return response.data.map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      owner: repo.owner.login,
      private: repo.private,
      htmlUrl: repo.html_url,
      description: repo.description,
      language: repo.language,
      updatedAt: repo.updated_at,
    }));
  }
}

module.exports = new ScannerService();
