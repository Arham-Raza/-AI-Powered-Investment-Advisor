/*
 * Client‑side logic for the AI‑Powered Investment Advisor.
 *
 * This script implements a very simple single‑page application that communicates
 * with the back‑end API defined in server.js. It lets the user search for
 * stocks, display a candlestick chart and basic statistics for a selected
 * symbol, read a brief news summary, and manage a local portfolio.
 */

// API base URL. In development the app runs from the same origin as the server
// so a relative path suffices. When deployed to Firebase Functions you may
// need to adjust this to point at your function endpoint.
const API_BASE = '/api';

// DOM references
const stocksView = document.getElementById('stocks-view');
const portfolioView = document.getElementById('portfolio-view');
const navStocks = document.getElementById('nav-stocks');
const navPortfolio = document.getElementById('nav-portfolio');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const searchResults = document.getElementById('search-results');
const stockDetails = document.getElementById('stock-details');
const stockTitle = document.getElementById('stock-title');
const lastPriceEl = document.getElementById('last-price');
const recommendationEl = document.getElementById('recommendation');
const recommendationRationaleEl = document.getElementById('recommendation-rationale');
const newsSummaryEl = document.getElementById('news-summary');
const newsListEl = document.getElementById('news-list');
const quantityInput = document.getElementById('quantity-input');
const addPortfolioButton = document.getElementById('add-portfolio-button');
const portfolioBody = document.getElementById('portfolio-body');

let currentSymbol = null;
let chartInstance = null;

// Initialise event listeners
function init() {
  // Navigation buttons
  navStocks.addEventListener('click', () => {
    setActiveView('stocks');
  });
  navPortfolio.addEventListener('click', () => {
    setActiveView('portfolio');
    loadPortfolio();
  });

  // Search functionality
  searchButton.addEventListener('click', performSearch);
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      performSearch();
    }
  });

  // Add to portfolio button
  addPortfolioButton.addEventListener('click', addToPortfolio);
}

/**
 * Switches between the Stocks and Portfolio views.
 * @param {('stocks'|'portfolio')} view
 */
function setActiveView(view) {
  if (view === 'stocks') {
    stocksView.classList.add('active');
    portfolioView.classList.remove('active');
    navStocks.classList.add('active');
    navPortfolio.classList.remove('active');
  } else {
    stocksView.classList.remove('active');
    portfolioView.classList.add('active');
    navStocks.classList.remove('active');
    navPortfolio.classList.add('active');
  }
}

/**
 * Performs a stock search based on the query entered by the user.
 */
async function performSearch() {
  const query = searchInput.value.trim();
  searchResults.innerHTML = '';
  stockDetails.classList.add('hidden');
  currentSymbol = null;
  if (!query) return;
  try {
    const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      data.forEach(item => {
        const div = document.createElement('div');
        div.className = 'search-result-item';
        div.textContent = `${item.symbol} – ${item.name}`;
        div.addEventListener('click', () => {
          displayStock(item.symbol);
        });
        searchResults.appendChild(div);
      });
    } else {
      searchResults.textContent = 'No results found.';
    }
  } catch (err) {
    console.error(err);
    searchResults.textContent = 'Error performing search.';
  }
}

/**
 * Fetches and displays details for a selected stock symbol, including the price chart,
 * recommendation and recent news summary.
 * @param {string} symbol
 */
async function displayStock(symbol) {
  currentSymbol = symbol;
  stockDetails.classList.remove('hidden');
  stockTitle.textContent = `${symbol}`;
  // Reset previous state
  lastPriceEl.textContent = '';
  recommendationEl.textContent = '';
  recommendationRationaleEl.textContent = '';
  newsSummaryEl.textContent = '';
  newsListEl.innerHTML = '';
  quantityInput.value = 1;
  // Fetch stock price data
  try {
    const [stockRes, recRes, newsRes] = await Promise.all([
      fetch(`${API_BASE}/stock/${symbol}`),
      fetch(`${API_BASE}/recommendation/${symbol}`),
      fetch(`${API_BASE}/news/${symbol}`)
    ]);
    const stockData = await stockRes.json();
    const recData = await recRes.json();
    const newsData = await newsRes.json();
    // Update last price and recommendation
    lastPriceEl.textContent = `$${stockData.priceData[stockData.priceData.length - 1].close.toFixed(2)}`;
    recommendationEl.textContent = recData.recommendation;
    recommendationRationaleEl.textContent = recData.rationale;
    // Draw chart
    drawChart(stockData.priceData, symbol);
    // Show news summary and list
    newsSummaryEl.textContent = newsData.summary || 'No news available.';
    if (Array.isArray(newsData.news)) {
      newsData.news.forEach(article => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${article.date}</strong> – ${article.title}`;
        newsListEl.appendChild(li);
      });
    }
  } catch (err) {
    console.error(err);
    alert('Error loading stock data.');
  }
}

/**
 * Renders a candlestick chart for the given price data. If a previous chart exists it
 * will be destroyed before drawing the new one.
 * @param {Array<Object>} priceData
 * @param {string} symbol
 */
function drawChart(priceData, symbol) {
  const ctx = document.getElementById('chart').getContext('2d');
  // Convert the sample data into the format Chart.js expects: each point contains
  // x (timestamp in milliseconds) and o/h/l/c properties for open, high, low and close.
  const candles = priceData.map(item => ({
    x: new Date(item.date),
    o: item.open,
    h: item.high,
    l: item.low,
    c: item.close
  }));
  if (chartInstance) {
    chartInstance.destroy();
  }
  chartInstance = new Chart(ctx, {
    type: 'candlestick',
    data: {
      datasets: [
        {
          label: `${symbol} Price`,
          data: candles,
          color: {
            up: '#10b981',
            down: '#ef4444',
            unchanged: '#6b7280'
          }
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'day',
            tooltipFormat: 'MMM d'
          },
          ticks: {
            autoSkip: true,
            maxTicksLimit: 6
          }
        },
        y: {
          position: 'right',
          ticks: {
            callback: (value) => `$${value}`
          }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => {
              const { o, h, l, c } = context.raw;
              return `O:${o.toFixed(2)} H:${h.toFixed(2)} L:${l.toFixed(2)} C:${c.toFixed(2)}`;
            }
          }
        }
      }
    }
  });
}

/**
 * Adds the currently selected stock to the portfolio using the quantity specified by
 * the user. After updating the portfolio this will switch to the portfolio view.
 */
async function addToPortfolio() {
  const symbol = currentSymbol;
  const quantity = parseInt(quantityInput.value, 10);
  if (!symbol || isNaN(quantity) || quantity <= 0) {
    alert('Please enter a valid quantity.');
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/portfolio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, quantity })
    });
    const data = await res.json();
    if (res.ok) {
      // Switch to portfolio view after successful addition
      setActiveView('portfolio');
      loadPortfolio();
    } else {
      alert(data.error || 'Failed to add to portfolio.');
    }
  } catch (err) {
    console.error(err);
    alert('Error adding to portfolio.');
  }
}

/**
 * Loads the portfolio from the server and renders it in a table. For each holding we
 * fetch the latest price to compute the current value and profit/loss. Because these
 * requests can be asynchronous we use Promise.all to wait for all price lookups.
 */
async function loadPortfolio() {
  portfolioBody.innerHTML = '';
  try {
    const res = await fetch(`${API_BASE}/portfolio`);
    const portfolio = await res.json();
    // If portfolio is empty show a placeholder row
    if (!Array.isArray(portfolio) || portfolio.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 7;
      td.textContent = 'Your portfolio is empty.';
      tr.appendChild(td);
      portfolioBody.appendChild(tr);
      return;
    }
    // For each holding fetch current price
    const rows = await Promise.all(portfolio.map(async (holding) => {
      const stockRes = await fetch(`${API_BASE}/stock/${holding.symbol}`);
      const stockData = await stockRes.json();
      const currentPrice = stockData.priceData[stockData.priceData.length - 1].close;
      const value = currentPrice * holding.quantity;
      const cost = holding.price * holding.quantity;
      const pl = value - cost;
      return {
        ...holding,
        currentPrice: currentPrice,
        value: value,
        pl: pl
      };
    }));
    rows.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${item.symbol}</td>
        <td>${item.quantity}</td>
        <td>$${item.price.toFixed(2)}</td>
        <td>$${item.currentPrice.toFixed(2)}</td>
        <td>$${item.value.toFixed(2)}</td>
        <td style="color:${item.pl >= 0 ? '#10b981' : '#ef4444'}">$${item.pl.toFixed(2)}</td>
        <td><button data-symbol="${item.symbol}">Remove</button></td>
      `;
      portfolioBody.appendChild(tr);
    });
    // Attach remove handlers
    portfolioBody.querySelectorAll('button[data-symbol]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const sym = e.target.getAttribute('data-symbol');
        await removeHolding(sym);
        await loadPortfolio();
      });
    });
  } catch (err) {
    console.error(err);
    alert('Error loading portfolio.');
  }
}

/**
 * Removes a holding from the portfolio.
 * @param {string} symbol
 */
async function removeHolding(symbol) {
  try {
    await fetch(`${API_BASE}/portfolio/${symbol}`, { method: 'DELETE' });
  } catch (err) {
    console.error(err);
    alert('Error removing holding.');
  }
}

// Initialise the app when the DOM is ready
document.addEventListener('DOMContentLoaded', init);