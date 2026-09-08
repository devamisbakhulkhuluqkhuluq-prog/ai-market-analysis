import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import './App.css';

function App() {
  const [symbol, setSymbol] = useState('EURUSD');
  const [prompt, setPrompt] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Referensi untuk kedua widget TradingView
  const chartContainerRef = useRef(null);
  const calendarContainerRef = useRef(null); 
  const gaugeContainerRef = useRef(null);

  const pairs = [
    { id: 'EURUSD', name: 'EUR/USD' },
    { id: 'GBPUSD', name: 'GBP/USD' },
    { id: 'USDJPY', name: 'USD/JPY' },
    { id: 'XAUUSD', name: 'GOLD (XAU/USD)' }
  ];

  // 1. useEffect untuk Widget Live Chart (Harga)
  useEffect(() => {
    if (chartContainerRef.current) {
      chartContainerRef.current.innerHTML = ''; 
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/tv.js';
      script.async = true;
      script.onload = () => {
        new window.TradingView.widget({
          autosize: true,
          symbol: symbol === 'XAUUSD' ? `OANDA:${symbol}` : `FX:${symbol}`,
          interval: 'H1',
          timezone: 'Asia/Jakarta',
          theme: 'dark',
          style: '1',
          locale: 'id',
          enable_publishing: false,
          backgroundColor: '#1e222d',
          gridColor: '#2a2e39',
          hide_top_toolbar: false,
          hide_volume: true,
          container_id: 'tv_chart'
        });
      };
      chartContainerRef.current.appendChild(script);
    }
    
    setPrompt('');
    setAiResult('');
  }, [symbol]);

  // 2. useEffect BARU untuk Widget Kalender Ekonomi (News)
  useEffect(() => {
    if (calendarContainerRef.current) {
      calendarContainerRef.current.innerHTML = '';
      
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-events.js';
      script.type = 'text/javascript';
      script.async = true;
      
      // Konfigurasi Kalender (Menampilkan berita penting dari negara mayoritas)
      script.innerHTML = JSON.stringify({
        "colorTheme": "dark",
        "isTransparent": false,
        "width": "100%",
        "height": "100%",
        "locale": "id",          // Bahasa Indonesia
        "importanceFilter": "-1,0,1", // Tampilkan semua tingkat kepentingan berita
        "currencyFilter": "USD,EUR,GBP,JPY,AUD,CAD" // Filter mata uang negara asal berita
      });
      
      calendarContainerRef.current.appendChild(script);
    }
  }, []); // Array kosong artinya widget ini hanya dimuat sekali saat website pertama kali dibuka

  // 3. useEffect BARU untuk Widget Gauge (Technical Analysis)
  useEffect(() => {
    if (gaugeContainerRef.current) {
      gaugeContainerRef.current.innerHTML = '';
      
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js';
      script.type = 'text/javascript';
      script.async = true;
      
      const widgetSymbol = symbol === 'XAUUSD' ? `OANDA:${symbol}` : `FX:${symbol}`;

      script.innerHTML = JSON.stringify({
        "interval": "1h",
        "width": "100%",
        "isTransparent": false,
        "height": "100%",
        "symbol": widgetSymbol,
        "showIntervalTabs": true,
        "displayMode": "single",
        "locale": "id",
        "colorTheme": "dark"
      });
      
      gaugeContainerRef.current.appendChild(script);
    }
  }, [symbol]);

  const generateAnalysis = async () => {
    if (!prompt) return alert('Prompt tidak boleh kosong!');
    setLoading(true);
    setAiResult('');

    try {
      const response = await fetch('/.netlify/functions/gemini-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt, pair: symbol })
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorReply = `API Error ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.reply) errorReply = errorJson.reply;
        } catch (e) {
          errorReply = `Response bukan JSON (Status ${response.status}): ${errorText.substring(0, 30)}...`;
        }
        throw new Error(errorReply);
      }
      
      const data = await response.json();
      setAiResult(data.reply);
    } catch (error) {
      setAiResult(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <header className="header">
        <h1>Forex AI Analyzer</h1>
      </header>

      {/* Bagian Grid: Dibagi menjadi 3 panel sekarang */}
      <div className="grid-layout">
        
        {/* Kolom Kiri: Chart & Gauge */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="panel chart-panel" style={{ height: '600px' }}>
            <div className="panel-header">
              <h2>Live Chart: {symbol}</h2>
              <div className="pair-selector">
                <label>Pilih Pair: </label>
                <select value={symbol} onChange={(e) => setSymbol(e.target.value)}>
                  {pairs.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div id="tv_chart" ref={chartContainerRef} style={{ height: 'calc(100% - 60px)', width: '100%' }}></div>
          </div>
          
          <div className="panel gauge-panel" style={{ height: '400px' }}>
            <h2>Technical Analysis: {symbol}</h2>
            <div className="tradingview-widget-container" ref={gaugeContainerRef} style={{ height: 'calc(100% - 40px)', width: '100%' }}></div>
          </div>
        </div>

        {/* Kolom Kanan: Dibagi Atas (News) dan Bawah (AI) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Panel BARU: Kalender Ekonomi */}
          <div className="panel calendar-panel" style={{ height: '350px', resize: 'vertical', overflow: 'hidden' }}>
             <h2>Jadwal Rilis Berita (Fundamental)</h2>
             {/* Tempat Widget TradingView Kalender */}
             <div 
                className="tradingview-widget-container" 
                ref={calendarContainerRef} 
                style={{ height: 'calc(100% - 40px)', width: '100%' }}>
             </div>
          </div>

          {/* Panel AI Input & Output */}
          <div className="panel ai-panel" style={{ flexGrow: 1 }}>
            <h2>Gemini AI Assistant</h2>
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows="5"
              style={{ width: '100%', marginBottom: '10px' }}
              placeholder="Contoh: Malam ini ada NFP, forecast lebih buruk dari previous. Bagaimana analisa AI?"
            />
            <button onClick={generateAnalysis} disabled={loading} style={{ width: '100%', padding: '10px' }}>
              {loading ? 'AI Sedang Menganalisa...' : 'Generate Analisa'}
            </button>
            
            <div className="result-box" style={{ marginTop: '15px', padding: '10px', background: '#2a2e39', borderRadius: '5px' }}>
              {loading && <div className="loader-text">Mengumpulkan data...</div>}
              {!loading && aiResult && (
                <div className="ai-content">
                  <ReactMarkdown>{aiResult}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default App;