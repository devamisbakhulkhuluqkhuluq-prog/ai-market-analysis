import { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [symbol, setSymbol] = useState('EURUSD');
  const [prompt, setPrompt] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [loading, setLoading] = useState(false);
  const chartContainerRef = useRef(null);

  // Daftar pair yang bisa dipilih
  const pairs = [
    { id: 'EURUSD', name: 'EUR/USD' },
    { id: 'GBPUSD', name: 'GBP/USD' },
    { id: 'USDJPY', name: 'USD/JPY' },
    { id: 'XAUUSD', name: 'GOLD (XAU/USD)' }
  ];

  // Efek dinamis: Otomatis render ulang chart saat 'symbol' berubah
  useEffect(() => {
    if (chartContainerRef.current) {
      chartContainerRef.current.innerHTML = ''; // Bersihkan chart lama
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
          container_id: 'tv_chart'
        });
      };
      chartContainerRef.current.appendChild(script);
    }
    
    // Otomatis ubah template prompt saat pair berubah
    setPrompt(`Analisa pair ${symbol} saat ini. Di H4 harga sedang berada di area... (lanjutkan data teknikal/fundamental Anda)`);
    setAiResult('');
  }, [symbol]);

  // Fungsi memanggil backend (Netlify Functions)
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

      if (!response.ok) throw new Error('Gagal menghubungi AI');
      
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
        <h1>Forex AI Analyzer (Dynamic)</h1>
        <div className="pair-selector">
          <label>Pilih Pair: </label>
          <select value={symbol} onChange={(e) => setSymbol(e.target.value)}>
            {pairs.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </header>

      <div className="grid-layout">
        {/* Kolom Kiri: Chart Dinamis */}
        <div className="panel chart-panel">
          <h2>Live Chart: {symbol}</h2>
          <div id="tv_chart" ref={chartContainerRef} style={{ height: '500px', width: '100%' }}></div>
        </div>

        {/* Kolom Kanan: AI Input & Output */}
        <div className="panel ai-panel">
          <h2>Gemini AI Assistant</h2>
          <textarea 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows="5"
            placeholder="Masukkan kondisi market saat ini..."
          />
          <button onClick={generateAnalysis} disabled={loading}>
            {loading ? 'AI Sedang Menganalisa...' : 'Generate Analisa'}
          </button>
          
          <div className="result-box">
            {loading && <div className="loader-text">Mengumpulkan data...</div>}
            {!loading && aiResult && <div className="ai-content">{aiResult}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;