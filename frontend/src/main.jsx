import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './style.css'
import BookPage from './pages/BookPage.jsx'
import DonePage from './pages/DonePage.jsx'
import MyPage from './pages/MyPage.jsx'
import AdminPage from './pages/AdminPage.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<BookPage />} />
      <Route path="/done" element={<DonePage />} />
      <Route path="/my" element={<MyPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/admin/:date" element={<AdminPage />} />
      <Route path="*" element={<BookPage />} />
    </Routes>
  </BrowserRouter>,
)
