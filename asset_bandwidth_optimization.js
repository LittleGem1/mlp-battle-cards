/* MLP Battle Cards – safe bandwidth optimization (V18)
 * Register once, immediately BEFORE app.use(express.static(...)) in server.js.
 * Never touches Socket.IO, room routes, accounts or game logic.
 * When a browser supports WebP, it serves an alternative, smaller file while
 * preserving the original .png URL and leaving the original .png untouched.
 */
'use strict';
const path = require('node:path');
const fs = require('node:fs');
const express = require('express');

module.exports = function enableAssetBandwidthSaver(app) {
  const originalRoot = path.resolve(__dirname, 'public', 'assets');
  const optimizedRoot = path.resolve(__dirname, 'public', 'optimized_assets');
  const cacheSeconds = 3 * 60 * 60; // 3 h: less repeated traffic without week-long stale art
  const cacheHeader = `public, max-age=${cacheSeconds}, must-revalidate`;

  app.use('/assets', function serveModernImages(req, res, next) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    let requested;
    try { requested = decodeURIComponent(req.path); }
    catch (_) { return next(); }
    if (!requested.toLowerCase().endsWith('.png')) return next();

    // The same URL can return image/png or image/webp.
    // Vary is essential for correct caching of both formats.
    res.vary('Accept');
    const supportsWebp = /(?:^|[,\s])image\/webp(?:[,;\s]|$)/i.test(req.headers.accept || '');
    if (!supportsWebp) return next();

    const relative = requested.replace(/^\/+/, '');
    if (!relative || relative.includes('\\') || relative.includes('\0')) return next();
    const alternative = path.resolve(optimizedRoot, relative + '.webp');
    if (!alternative.startsWith(optimizedRoot + path.sep)) return next();
    if (!fs.existsSync(alternative)) return next();

    res.type('webp');
    res.setHeader('Cache-Control', cacheHeader);
    // sendFile supports ETag, Last-Modified and conditional requests (304).
    return res.sendFile(alternative, { maxAge: '3h' }, err => {
      if (err && !res.headersSent) next(err);
    });
  });

  // Covers other existing WebP images, animated WebP, GIFs, sounds and PNG fallback.
  // Requests outside /assets (scripts, CSS, accounts and page HTML) are unchanged.
  app.use('/assets', express.static(originalRoot, {
    etag: true,
    lastModified: true,
    maxAge: '3h',
    setHeaders: (res) => res.setHeader('Cache-Control', cacheHeader)
  }));
};
