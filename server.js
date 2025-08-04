/*
 * Minimal HTTP server to power the investment advisor dashboard. Rather than
 * depending on external packages like Express, this file uses Node's built‑in
 * modules (http, fs and url) to handle routing, serve static files and expose
 * a small JSON API. This design allows the app to run in a restricted
 * environment without downloading extra dependencies.
 */

const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

// Load the sample stock and news data
const sampleData = JSON.parse(fs.readFileSync(path.join(__dirname, 'sample_data.json'), 'utf8'));

// File to persist the user portfolio
const portfolioFile = path.join(__dirname, 'portfolio.json');

function loadPortfolio() {
  try {
    return JSON.parse(fs.readFileSync(portfolioFile, 'utf8'));
  } catch (err) {
    return [];
  }
}

function savePortfolio(data) {
  fs.writeFileSync(portfolioFile, JSON.stringify(data, null, 2));
}

// Helper: summarises news articles by concatenating descriptions
function summariseNews(news) {
  if (!news || news.length === 0) return '';
  const combined = news.map(n => n.description).join(' ');
  const maxLength = 300;
  return combined.length > maxLength ? combined.slice(0, maxLength) + '…' : combined;
}

// Helper: set CORS headers
function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// Route handlers for API endpoints
async function handleApi(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const parts = parsedUrl.pathname.split('/').filter(Boolean); // remove empty segments
  const method = req.method;

  // Search endpoint: /api/search?q=...
  if (parts[1] === 'search' && method === 'GET') {
    const query = (parsedUrl.query.q || '').toLowerCase();
    const results = [];
    if (query) {
      for (const symbol of Object.keys(sampleData)) {
        const { name } = sampleData[symbol];
        if (symbol.toLowerCase().includes(query) || name.toLowerCase().includes(query)) {
          results.push({ symbol, name });
        }
        if (results.length >= 5) break;
      }
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(results));
    return;
  }

  // Stock details: /api/stock/:symbol
  if (parts[1] === 'stock' && method === 'GET' && parts.length === 3) {
    const symbol = parts[2].toUpperCase();
    const stock = sampleData[symbol];
    if (!stock) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Stock not found' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ symbol, name: stock.name, priceData: stock.priceData }));
    return;
  }

  // News: /api/news/:symbol
  if (parts[1] === 'news' && method === 'GET' && parts.length === 3) {
    const symbol = parts[2].toUpperCase();
    const stock = sampleData[symbol];
    if (!stock) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Stock not found' }));
      return;
    }
    const news = stock.news || [];
    const summary = summariseNews(news);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ symbol, news, summary }));
    return;
  }

  // Recommendation: /api/recommendation/:symbol
  if (parts[1] === 'recommendation' && method === 'GET' && parts.length === 3) {
    const symbol = parts[2].toUpperCase();
    const stock = sampleData[symbol];
    if (!stock) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Stock not found' }));
      return;
    }
    const prices = stock.priceData;
    if (!prices || prices.length < 2) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not enough price data' }));
      return;
    }
    const last = prices[prices.length - 1].close;
    const prev = prices[prices.length - 2].close;
    const diffPercent = ((last - prev) / prev) * 100;
    let recommendation = 'Hold';
    let rationale = 'Price has barely changed in the most recent session.';
    if (diffPercent > 0.5) {
      recommendation = 'Buy';
      rationale = 'The closing price has risen steadily in the latest session.';
    } else if (diffPercent < -0.5) {
      recommendation = 'Sell';
      rationale = 'The closing price declined sharply in the latest session.';
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ symbol, recommendation, rationale, lastPrice: last, previousPrice: prev }));
    return;
  }

  // Portfolio: GET /api/portfolio
  if (parts[1] === 'portfolio' && method === 'GET' && parts.length === 2) {
    const portfolio = loadPortfolio();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(portfolio));
    return;
  }

  // Portfolio: POST /api/portfolio
  if (parts[1] === 'portfolio' && method === 'POST' && parts.length === 2) {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const { symbol: rawSymbol, quantity, price } = JSON.parse(body || '{}');
        if (!rawSymbol || typeof quantity !== 'number' || quantity <= 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Symbol and a positive quantity are required.' }));
          return;
        }
        const symbol = rawSymbol.toUpperCase();
        const stock = sampleData[symbol];
        if (!stock) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Stock not found' }));
          return;
        }
        const portfolio = loadPortfolio();
        const existing = portfolio.find(item => item.symbol === symbol);
        const lastPrice = stock.priceData[stock.priceData.length - 1].close;
        const purchasePrice = typeof price === 'number' && price > 0 ? price : lastPrice;
        if (existing) {
          const totalQty = existing.quantity + quantity;
          const totalCost = existing.quantity * existing.price + quantity * purchasePrice;
          existing.quantity = totalQty;
          existing.price = parseFloat((totalCost / totalQty).toFixed(2));
        } else {
          portfolio.push({ symbol, quantity, price: parseFloat(purchasePrice.toFixed(2)) });
        }
        savePortfolio(portfolio);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Portfolio updated', portfolio }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request body' }));
      }
    });
    return;
  }

  // Portfolio: DELETE /api/portfolio/:symbol
  if (parts[1] === 'portfolio' && method === 'DELETE' && parts.length === 3) {
    const symbol = parts[2].toUpperCase();
    const portfolio = loadPortfolio();
    const newPortfolio = portfolio.filter(item => item.symbol !== symbol);
    savePortfolio(newPortfolio);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Holding removed', portfolio: newPortfolio }));
    return;
  }

  // Not found
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
}

// Serve static assets from the public directory. If the file exists it will be
// returned with the appropriate content type; otherwise the index.html is
// served to allow client‑side routing for the SPA.
function handleStatic(req, res) {
  let filePath = path.join(__dirname, 'public', req.url.replace(/^\//, ''));
  // If the request is for the root or doesn't contain a dot we serve index.html
  if (req.url === '/' || !path.extname(req.url)) {
    filePath = path.join(__dirname, 'public', 'index.html');
  }
  fs.readFile(filePath, (err, content) => {
    if (err) {
      // Fallback to index.html for unknown routes within SPA
      if (err.code === 'ENOENT') {
        fs.readFile(path.join(__dirname, 'public', 'index.html'), (err2, indexContent) => {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(indexContent);
        });
      } else {
        res.writeHead(500);
        res.end('Server error');
      }
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.json': 'application/json'
    };
    const type = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  setCors(res);
  const parsedUrl = url.parse(req.url);
  if (parsedUrl.pathname.startsWith('/api/')) {
    handleApi(req, res);
  } else if (req.method === 'OPTIONS') {
    // Preflight CORS request
    res.writeHead(204);
    res.end();
  } else {
    handleStatic(req, res);
  }
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});