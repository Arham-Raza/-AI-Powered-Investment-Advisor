
#  AI-Powered Investment Advisor

A personal investment dashboard that provides stock recommendations, sentiment analysis, and portfolio tracking. This app simulates real-time finance behavior using local data and AI-like logic.

---

##  Features

- **Stock Search** with simulated real-time prices and candlestick charts (Chart.js)
- **AI Sentiment Summary** of the latest news headlines for selected stocks
- **Portfolio Tracking** with profit/loss calculations
- **Buy/Sell/Hold Recommendations** based on recent price movements
- **Modern UI** with a sidebar for navigation (Stocks / Portfolio / News)
- Built with **Vanilla JS**, **Node.js**, **Chart.js**, and custom CSS

---

##  Tech Stack

| Layer         | Tech                      |
|---------------|----------------------------|
| Frontend      | HTML, CSS, JS, Chart.js    |
| Backend       | Node.js (native `http` module) |
| Data          | Simulated stock JSON       |
| Charting      | Chart.js                   |

---

##  Getting Started

### 1. Clone the Repo
```bash
git clone https://github.com/yourusername/investment-advisor.git
cd investment-advisor
```

### 2. Run the Server
```bash
node server.js
```

### 3. Visit in Browser
Go to: [http://localhost:3000](http://localhost:3000)

---

##  Project Structure

```
investment-advisor/
├── public/
│   ├── index.html        # Main UI
│   ├── style.css         # UI styles
│   └── app.js            # Frontend logic
├── server.js             # Node.js backend server
├── sample_data.json      # Offline stock & news data
└── portfolio.json        # Portfolio (created at runtime)
```

---

##  AI Component (Mocked)

This project simulates:
- Sentiment analysis by summarizing news headlines
- Recommendations based on basic price logic
- Real data integration can be added via Alpha Vantage or Yahoo Finance APIs

---

##  Future Enhancements

-  Connect to live market data (Alpha Vantage, Finnhub, etc.)
-  Use OpenAI or HuggingFace for real sentiment analysis
-  Deploy to Firebase Hosting + Functions
- ⚛ Convert to React + Tailwind CSS for modern componentized design

---

##  License

MIT — Free to use and modify.
