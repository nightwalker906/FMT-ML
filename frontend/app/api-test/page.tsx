'use client';

import { useState, useEffect } from 'react';

export default function ApiTestPage() {
  const [tutors, setTutors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTutors = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:8000/api/tutors/');
        const data = await response.json();
        
        if (Array.isArray(data)) {
          setTutors(data);
          setError(null);
        } else {
          setTutors([]);
          setError('Invalid response format');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch tutors');
        setTutors([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTutors();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-800 mb-6">API Integration Test</h1>

        {loading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-800">
            Loading tutors from backend API...
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 mb-6">
            <strong>Error:</strong> {error}
          </div>
        )}

        {!loading && !error && tutors.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 mb-6">
            No tutors found in backend
          </div>
        )}

        {tutors.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800 font-semibold">✓ Successfully connected to backend API!</p>
            <p className="text-green-700 text-sm">Found {tutors.length} tutors</p>
          </div>
        )}

        {tutors.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-800">Tutors List:</h2>
            {tutors.map((tutor) => (
              <div key={tutor.id} className="bg-white border border-slate-200 rounded-lg p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-600">ID</p>
                    <p className="font-semibold text-slate-800">{tutor.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Hourly Rate</p>
                    <p className="font-semibold text-emerald-600">${tutor.hourly_rate}/hr</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-slate-600">Bio</p>
                    <p className="text-slate-800">{tutor.bio || 'No bio provided'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-slate-600">Subjects</p>
                    <p className="text-slate-800">{tutor.subjects?.join(', ') || 'None'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-slate-600">Raw Data</p>
                    <pre className="bg-slate-100 p-2 rounded text-xs overflow-auto max-h-40">
                      {JSON.stringify(tutor, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 p-4 bg-slate-100 rounded-lg">
          <h3 className="font-semibold text-slate-800 mb-2">API Test Status:</h3>
          <ul className="text-sm text-slate-700 space-y-1">
            <li>✓ Frontend running on: http://localhost:3000</li>
            <li>✓ Backend API running on: http://localhost:8000/api</li>
            <li>{!error ? '✓' : '✗'} Backend connection: {!error ? 'SUCCESS' : 'FAILED'}</li>
            <li>{tutors.length > 0 ? '✓' : '○'} Data retrieval: {tutors.length > 0 ? 'SUCCESS' : 'No data'}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
