/**
 * Cloudflare Worker for Nothing Wallpaper
 * Domain: https://nothing-wallpaper.snvshal.workers.dev
 *
 * Routes:
 * - GET /              -> Serves web/index.html from private GitHub repo (cached 5 min)
 * - GET /screenshot.png -> Serves web/screenshot.png from private GitHub repo (cached 7 days)
 * - GET /download      -> Redirects to latest Windows .exe installer from GitHub Releases
 * - GET /latest.json   -> Proxies Tauri v2 updater manifest from latest GitHub Release
 *
 * Required Cloudflare Worker Secret:
 * - GITHUB_TOKEN: GitHub Personal Access Token with read access to repository contents.
 */

const GITHUB_OWNER = "snvshal";
const GITHUB_REPO = "nothing-wallpaper";
const GITHUB_BRANCH = "main";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    const ghHeaders = {
      "User-Agent": "nothing-wallpaper-worker",
      ...(env.GITHUB_TOKEN ? { Authorization: `Bearer ${env.GITHUB_TOKEN}` } : {}),
    };

    // 1. Tauri updater endpoint: /latest.json
    if (path === "/latest.json") {
      const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
      const res = await fetch(apiUrl, { headers: ghHeaders });
      if (!res.ok) {
        return new Response("Release not found", { status: 404 });
      }

      const release = await res.json();
      const asset = release.assets?.find((a) => a.name === "latest.json");
      if (!asset) {
        return new Response("latest.json asset not found in release", { status: 404 });
      }

      const assetRes = await fetch(asset.url, {
        headers: { ...ghHeaders, Accept: "application/octet-stream" },
      });

      return new Response(assetRes.body, {
        status: assetRes.status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=60",
        },
      });
    }

    // 2. Direct installer download: /download
    if (path === "/download") {
      const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
      const res = await fetch(apiUrl, { headers: ghHeaders });
      if (!res.ok) {
        return new Response("Release not found", { status: 404 });
      }

      const release = await res.json();
      const exeAsset = release.assets?.find(
        (a) => a.name.endsWith(".exe") || a.name.endsWith(".msi"),
      );

      if (!exeAsset) {
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

      const rawUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/web/screenshot.png?ref=${GITHUB_BRANCH}`;
      const imgRes = await fetch(rawUrl, {
        headers: { ...ghHeaders, Accept: "application/vnd.github.raw" },
      });

      if (!imgRes.ok) {
        return new Response("Screenshot image not found", { status: 404 });
      }

      response = new Response(imgRes.body, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=86400, s-maxage=604800", // Cache 7 days on Cloudflare edge
        },
      });

      ctx.waitUntil(cache.put(request, response.clone()));
      return response;
    }

    // 4. Landing Page: / or /index.html
    if (path === "/" || path === "/index.html") {
      const htmlUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/web/index.html?ref=${GITHUB_BRANCH}`;
      const htmlRes = await fetch(htmlUrl, {
        headers: { ...ghHeaders, Accept: "application/vnd.github.raw" },
      });

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

    return new Response("Not Found", { status: 404 });
  },
};
