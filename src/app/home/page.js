'use client';
import React, { useEffect, useState } from 'react';

export default function HomePage() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/home')
      .then(res => res.json())
      .then(data => setMessage(data.message))
      .catch(err => console.error('API error:', err));
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial' }}>
      <h1>🏠 測試頁面 (src/app/home/page.js)</h1>
      <p>API 回傳內容: {message}</p>
    </div>
  );
}
