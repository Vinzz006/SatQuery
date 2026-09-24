import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { AnalyzeResponse } from '../types';
import { SplitImageViewer } from '../components/SplitImageViewer';
import { GroundedAnswerCard } from '../components/GroundedAnswerCard';
import { ExecutionTraceViewer } from '../components/ExecutionTraceViewer';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

export const ResultsDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api.getResult(id)
      .then((data) => {
        setResult(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.detail || "Failed to load analysis record.");
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center space-grid-bg text-cyan-400 font-mono text-sm gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        Retrieving Mission Record {id}...
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center space-grid-bg text-slate-300 font-mono space-y-4">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p>{error || "Record not found"}</p>
        <Link to="/workspace" className="text-xs text-cyan-400 underline">
          Return to Workspace
        </Link>
      </div>
    );
  }

  return (
    <div className="space-grid-bg min-h-[calc(100vh-64px)] p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <Link to="/workspace" className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-cyan-300">
        <ArrowLeft className="w-4 h-4" />
        Back to Workspace
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          <SplitImageViewer images={result.images} evidence={result.evidence} />
          <GroundedAnswerCard analysis={result} />
        </div>
        <div className="lg:col-span-5 space-y-6">
          <ExecutionTraceViewer trace={result.trace} totalTimeMs={result.execution_time_ms} />
        </div>
      </div>
    </div>
  );
};
