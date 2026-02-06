export interface Env {
  ASSETS: {
    fetch(request: Request): Promise<Response>
  }
}

// Handles static asset delivery with an SPA fallback for client-side routing
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const assetResponse = await env.ASSETS.fetch(request)

    if (assetResponse.status !== 404) {
      return assetResponse
    }

    if (request.method !== "GET") {
      return assetResponse
    }

    const url = new URL(request.url)
    const acceptsHtml = request.headers.get("accept")?.includes("text/html") ?? false
    const hasFileExtension = /\.[a-zA-Z0-9]+$/.test(url.pathname)

    if (!acceptsHtml || hasFileExtension) {
      return assetResponse
    }

    const indexRequest = new Request(`${url.origin}/index.html`, request)

    return env.ASSETS.fetch(indexRequest)
  },
}
