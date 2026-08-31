/**
 * Cloudflare Worker for XN Wallpaper
 * Domain: https://wallpaper.snvshal.workers.dev
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

      if (!assetRes.ok) {
        return new Response("Failed to fetch latest.json", { status: 502 });
      }

      const manifest = await assetRes.json();

      // Rewrite platform URLs so private release assets can be downloaded without auth
      if (manifest.platforms && typeof manifest.platforms === "object") {
        for (const platformKey of Object.keys(manifest.platforms)) {
          const platform = manifest.platforms[platformKey];
          if (platform?.url) {
            const rawUrl = platform.url;
            const filename = rawUrl.substring(rawUrl.lastIndexOf("/") + 1);
            const targetAsset = release.assets?.find((a) => a.name === filename);
            if (targetAsset) {
              platform.url = `${url.origin}/assets/${targetAsset.id}/${encodeURIComponent(targetAsset.name)}`;
            }
          }
        }
      }

      return new Response(JSON.stringify(manifest, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=60",
        },
      });
    }

    // 2. Authenticated Release Asset Proxy: /assets/:assetId/:filename
    if (path.startsWith("/assets/")) {
      const parts = path.split("/").filter(Boolean); // ["assets", "12345", "filename"]
      const assetId = parts[1];
      if (!assetId) {
        return new Response("Missing asset ID", { status: 400 });
      }

      const assetApiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/assets/${assetId}`;
      const assetRes = await fetch(assetApiUrl, {
        headers: { ...ghHeaders, Accept: "application/octet-stream" },
        redirect: "manual",
      });

      const downloadLocation = assetRes.headers.get("Location");
      if (downloadLocation) {
        return Response.redirect(downloadLocation, 302);
      }

      return new Response(assetRes.body, {
        status: assetRes.status,
        headers: {
          "Content-Type": "application/octet-stream",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // 3. Direct installer download: /download
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

      const assetApiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/assets/${exeAsset.id}`;
      const assetRes = await fetch(assetApiUrl, {
        headers: { ...ghHeaders, Accept: "application/octet-stream" },
        redirect: "manual",
      });

      const downloadLocation = assetRes.headers.get("Location");
      if (downloadLocation) {
        return Response.redirect(downloadLocation, 302);
      }

      return new Response(assetRes.body, {
        status: assetRes.status,
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename="${exeAsset.name}"`,
        },
      });
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

    // 5. PowerShell one-liner installer script: /install.ps1
    if (path === "/install.ps1") {
      const ps1Url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/web/install.ps1?ref=${GITHUB_BRANCH}`;
      const ps1Res = await fetch(ps1Url, {
        headers: { ...ghHeaders, Accept: "application/vnd.github.raw" },
      });

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
