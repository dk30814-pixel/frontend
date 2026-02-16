import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './App.css';

// IMPORTANT: Update this with your deployed backend URL
const API_URL = process.env.REACT_APP_API_URL || 'https://food-recognition-backend-rzsl.onrender.com';

function App() {
  const [stream, setStream] = useState(null);
  const [capturing, setCapturing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setCapturing(true);
    } catch (err) {
      setError('Failed to access camera. Please ensure camera permissions are granted.');
      console.error('Camera error:', err);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCapturing(false);
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current) {
      setError('Camera not ready');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      setError('Video not ready. Please wait a moment.');
      return;
    }

    setAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      // Capture photo from webcam
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error('Invalid video dimensions');
      }
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to blob
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob && blob.size > 0) {
            console.log('Photo captured:', blob.size, 'bytes');
            resolve(blob);
          } else {
            reject(new Error('Failed to capture photo'));
          }
        }, 'image/jpeg', 0.95);
      });
      
      // Send to backend
      const formData = new FormData();
      formData.append('image', blob, 'capture.jpg');

      const response = await axios.post(`${API_URL}/analyze`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000
      });

      if (response.data.success) {
        setResult(response.data);
        stopCamera();
      } else {
        setError('Failed to analyze image');
      }
    } catch (err) {
      setError(err.message || err.response?.data?.error || 'Failed to analyze. Please try again.');
      console.error('Analysis error:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const downloadReceipt = () => {
    if (!result) return;

    const blob = new Blob([result.receipt_html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt_${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setResult(null);
    setError(null);
  };

  return (
    <div className="app">
      <div className="grain"></div>
      
      <header className="header">
        <div className="logo-container">
          <div className="logo">🍽️</div>
          <h1 className="title">Campus Canteen</h1>
        </div>
        <p className="subtitle">AI-Powered Food Recognition System</p>
      </header>

      <main className="main-content">
        {!capturing && !result && (
          <div className="welcome-section">
            <div className="feature-card">
              <div className="feature-icon">📸</div>
              <h2>Instant Recognition</h2>
              <p>Show your plate to the camera and let AI identify your food</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💰</div>
              <h2>Automatic Pricing</h2>
              <p>Get instant price calculation based on detected items</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h2>Nutrition Tracking</h2>
              <p>View calories and macronutrients for your entire meal</p>
            </div>
          </div>
        )}

        {!capturing && !result && (
          <button className="start-btn" onClick={startCamera}>
            <span className="btn-icon">📷</span>
            Start Camera
          </button>
        )}

        {capturing && !result && (
          <div className="camera-section">
            <div className="video-container">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="video-feed"
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              
              <div className="camera-overlay">
                <div className="scan-frame"></div>
                <p className="camera-hint">Position food in frame</p>
              </div>
            </div>

            <div className="camera-controls">
              <button 
                className="capture-btn" 
                onClick={captureAndAnalyze}
                disabled={analyzing}
              >
                {analyzing ? (
                  <>
                    <span className="spinner"></span>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <span className="btn-icon">📸</span>
                    Take Photo & Analyze
                  </>
                )}
              </button>
              <button className="stop-btn" onClick={stopCamera} disabled={analyzing}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
            <button className="retry-btn" onClick={reset}>Try Again</button>
          </div>
        )}

        {result && (
          <div className="results-section">
            <div className="results-header">
              <h2>Analysis Complete</h2>
              <p className="timestamp">{result.timestamp}</p>
            </div>

            <div className="items-grid">
              {result.items.map((item, index) => (
                <div key={index} className="item-card">
                  <div className="item-header">
                    <h3>{item.name}</h3>
                    <span className="confidence-badge">{item.confidence}%</span>
                  </div>
                  <div className="item-details">
                    <div className="detail-row">
                      <span className="label">Price:</span>
                      <span className="value">{item.price} MKD</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Calories:</span>
                      <span className="value">{item.calories} kcal</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Protein:</span>
                      <span className="value">{item.protein}g</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Carbs:</span>
                      <span className="value">{item.carbs}g</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Fat:</span>
                      <span className="value">{item.fat}g</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="totals-card">
              <h2>Total</h2>
              <div className="totals-grid">
                <div className="total-item">
                  <span className="total-label">Price</span>
                  <span className="total-value">{result.totals.total_price} MKD</span>
                </div>
                <div className="total-item">
                  <span className="total-label">Calories</span>
                  <span className="total-value">{result.totals.total_calories} kcal</span>
                </div>
                <div className="total-item">
                  <span className="total-label">Protein</span>
                  <span className="total-value">{result.totals.total_protein}g</span>
                </div>
                <div className="total-item">
                  <span className="total-label">Carbs</span>
                  <span className="total-value">{result.totals.total_carbs}g</span>
                </div>
                <div className="total-item">
                  <span className="total-label">Fat</span>
                  <span className="total-value">{result.totals.total_fat}g</span>
                </div>
              </div>
            </div>

            <div className="action-buttons">
              <button className="download-btn" onClick={downloadReceipt}>
                <span className="btn-icon">📄</span>
                Download Receipt
              </button>
              <button className="new-scan-btn" onClick={() => { reset(); startCamera(); }}>
                <span className="btn-icon">🔄</span>
                New Scan
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="footer">
        <p>Mobile Wireless Networks Project</p>
        <p>Powered by Hugging Face AI • Cloud Computing</p>
      </footer>
    </div>
  );
}

export default App;