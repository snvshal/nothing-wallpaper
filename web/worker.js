/**
 * Cloudflare Worker for XN Wallpaper
 * Domain: https://wallpaper.snvshal.workers.dev
 *
 * Routes:
 * - GET /              -> Serves web/index.html from public GitHub repo (cached 5 min)
 * - GET /screenshot.png -> Serves web/screenshot.png from public GitHub repo (cached 7 days)
 * - GET /download      -> Redirects to latest Windows .exe installer from GitHub Releases
 * - GET /latest.json   -> Proxies Tauri v2 updater manifest from latest GitHub Release
 * - GET /install.ps1   -> Serves web/install.ps1 PowerShell installer script
 */

const GITHUB_OWNER = "snvshal";
const GITHUB_REPO = "nothing-wallpaper";
const GITHUB_BRANCH = "main";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    const rawBase = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}`;

    // 1. Tauri updater endpoint: /latest.json
    if (path === "/latest.json") {
      const manifestUrl = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest/download/latest.json`;
      const res = await fetch(manifestUrl, {
        headers: { "User-Agent": "nothing-wallpaper-worker" },
      });

      if (!res.ok) {
        return new Response("Release manifest not found", { status: 404 });
      }

      return new Response(res.body, {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=60",
        },
      });
    }

    // 2. Direct installer download: /download -> 302 redirect directly to public GitHub release asset
    if (path === "/download") {
      const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
      const res = await fetch(apiUrl, {
        headers: { "User-Agent": "nothing-wallpaper-worker" },
      });
      if (!res.ok) {
        return new Response("Release not found", { status: 404 });
      }

      const release = await res.json();
      const exeAsset = release.assets?.find(
        (a) => a.name.endsWith(".exe") || a.name.endsWith(".msi"),
      );

      if (!exeAsset || !exeAsset.browser_download_url) {
        return new Response("Installer asset not found", { status: 404 });
      }

      return Response.redirect(exeAsset.browser_download_url, 302);
    }

    // 3. Screenshot image: /screenshot.png (cached via Cloudflare Edge Cache)
    if (path === "/screenshot.png") {
      const cache = caches.default;
      let response = await cache.match(request);
      if (response) {
        return response;
      }

      const imgRes = await fetch(`${rawBase}/web/screenshot.png`);
      if (!imgRes.ok) {
        return new Response("Screenshot image not found", { status: 404 });
      }

      response = new Response(imgRes.body, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=86400, s-maxage=604800", // Cache 7 days
        },
      });

      ctx.waitUntil(cache.put(request, response.clone()));
      return response;
    }

    // 4. Landing Page: / or /index.html
    if (path === "/" || path === "/index.html") {
      const htmlRes = await fetch(`${rawBase}/web/index.html`);
      if (!htmlRes.ok) {
        return new Response("Page not found", { status: 404 });
      }

      return new Response(htmlRes.body, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=300", // Cache 5 min
        },
      });
    }

    // 5. PowerShell installer script: /install.ps1
    if (path === "/install.ps1") {
      const ps1Res = await fetch(`${rawBase}/web/install.ps1`);
      if (!ps1Res.ok) {
        return new Response("Installer script not found", { status: 404 });
      }

      return new Response(ps1Res.body, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=60",
        },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
};
