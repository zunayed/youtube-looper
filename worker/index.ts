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

    const url = new URL(request.url)
    const indexRequest = new Request(`${url.origin}/index.html`, request)

    return env.ASSETS.fetch(indexRequest)
  },
}
