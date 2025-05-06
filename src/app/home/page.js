'use client';
import React, { useEffect, useState } from 'react';

export default function WaiverPage() {
  const [waivers, setWaivers] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/waiver')
      .then(res => res.json())
      .then(res => {
        if (res.error) {
          setError(res.error);
        } else {
          setWaivers(res.data);
        }
      })
      .catch(err => setError('API error: ' + err.message));
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial' }}>
      <h1>📋 Waiver 表格資料</h1>
      {error && <p style={{ color: 'red' }}>錯誤: {error}</p>}
      <ul>
        {waivers.map((item, idx) => (
          <li key={idx}>{JSON.stringify(item)}</li>
        ))}
      </ul>
    </div>
  );
}
