import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { LandingPage } from './pages/LandingPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { ComparePage } from './pages/ComparePage';
import { BenchmarksPage } from './pages/BenchmarksPage';
import { AboutPage } from './pages/AboutPage';
import { ResultsDetailPage } from './pages/ResultsDetailPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-space-950 text-slate-100 flex flex-col font-sans">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/workspace" element={<WorkspacePage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/benchmarks" element={<BenchmarksPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/results/:id" element={<ResultsDetailPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default App;
