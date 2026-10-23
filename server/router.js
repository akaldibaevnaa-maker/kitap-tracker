// Қарапайым маршруттаушы: '/api/books/:id' үлгілері.
export class Router {
  constructor() {
    this.routes = [];
  }
  add(method, pattern, auth, handler) {
    const keys = [];
    const re = new RegExp(
      '^' + pattern.replace(/\//g, '\\/').replace(/:(\w+)/g, (_, k) => (keys.push(k), '([^\\/]+)')) + '\\/?$',
    );
    this.routes.push({ method, re, keys, auth, handler });
  }
  get(p, a, h) { this.add('GET', p, a, h); }
  post(p, a, h) { this.add('POST', p, a, h); }
  put(p, a, h) { this.add('PUT', p, a, h); }
  patch(p, a, h) { this.add('PATCH', p, a, h); }
  delete(p, a, h) { this.add('DELETE', p, a, h); }
  match(method, path) {
    let pathMatched = false;
    for (const r of this.routes) {
      const m = r.re.exec(path);
      if (!m) continue;
      pathMatched = true;
      if (r.method !== method) continue;
      const params = {};
      r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
      return { route: r, params };
    }
    return pathMatched ? { methodNotAllowed: true } : null;
  }
}
