const express = require("express");
const config = require("../config/env");
const router = express.Router();

// Step 1: Redirect user to GitHub OAuth login
router.get("/github", (req, res) => {
  if (!config.githubClientId) {
    return res.status(500).json({
      error: "GITHUB_CLIENT_ID is not configured in server environment.",
    });
  }

  const redirectUri = `https://github.com/login/oauth/authorize?client_id=${config.githubClientId}&scope=repo,user`;
  return res.redirect(redirectUri);
});

// Step 2: GitHub OAuth Callback & Token Exchange
router.post("/github/callback", async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: "Authorization code is required" });
  }

  if (!config.githubClientId || !config.githubClientSecret) {
    return res.status(500).json({
      error: "GitHub OAuth credentials (CLIENT_ID / CLIENT_SECRET) are missing on server.",
    });
  }

  try {
    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: config.githubClientId,
        client_secret: config.githubClientSecret,
        code,
      }),
    });

    const data = await response.json();

    if (data.error) {
      return res.status(400).json({ error: data.error_description || data.error });
    }

    // Fetch GitHub User profile with token
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${data.access_token}`,
        "User-Agent": "AIScanner-App",
      },
    });

    const userData = await userRes.json();

    return res.json({
      success: true,
      accessToken: data.access_token,
      user: {
        login: userData.login,
        name: userData.name,
        avatarUrl: userData.avatar_url,
        htmlUrl: userData.html_url,
      },
    });
  } catch (error) {
    console.error("OAuth Exchange Error:", error);
    return res.status(500).json({ error: "Failed to exchange authorization code", details: error.message });
  }
});

module.exports = router;
