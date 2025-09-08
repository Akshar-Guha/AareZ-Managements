import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/Field';
import { API } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface ActivityLog {
  id: number;
  user_id: number;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: number | null;
  details: any;
  created_at: string;
}

type PunchType = 'punch_in' | 'punch_out';

export default function MRDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingPunch, setPendingPunch] = useState<PunchType | null>(null);
  const [message, setMessage] = useState<string>('');

  const attendanceLogs = useMemo(() =>
    logs.filter(l => l.action === 'ATTENDANCE' && l.entity_type === 'mr' && l.user_id === (user?.id || -1))
        .sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  , [logs, user?.id]);

  const lastStatus = useMemo(() => {
    const last = attendanceLogs[0];
    if (!last) return 'No punches yet';
    const t = last.details?.type;
    return t === 'punch_in' ? 'Punched In' : t === 'punch_out' ? 'Punched Out' : 'Unknown';
  }, [attendanceLogs]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await API.get<ActivityLog[]>('/logs');
        setLogs(data);
      } catch (e) {
        console.error('Failed to fetch logs', e);
      }
    };
    fetchLogs();
  }, []);

  const handlePunch = (type: PunchType) => {
    setPendingPunch(type);
    cameraRef.current?.click();
  };

  const onCameraChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingPunch || !user) return;
    setLoading(true);
    setMessage('Capturing location and uploading...');
    try {
      const dataUrl = await resizeImageToDataUrl(file, 960, 960, 0.6);
      const coords = await getLocationSafe();
      await API.post('/logs', {
        action: 'ATTENDANCE',
        entity_type: 'mr',
        entity_id: user.id,
        details: {
          type: pendingPunch,
          lat: coords?.lat ?? null,
          lon: coords?.lon ?? null,
          accuracy: coords?.accuracy ?? null,
          photo: dataUrl,
          device_time: new Date().toISOString(),
        },
      });
      setMessage(`${pendingPunch === 'punch_in' ? 'Punched in' : 'Punched out'} successfully.`);
      // refresh logs
      const data = await API.get<ActivityLog[]>('/logs');
      setLogs(data);
    } catch (err) {
      console.error(err);
      setMessage('Failed to punch. Please try again.');
    } finally {
      setLoading(false);
      setPendingPunch(null);
      if (cameraRef.current) cameraRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">MR Dashboard</h1>
          <p className="text-slate-600">Attendance, GPS, and quick OCR</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" onClick={() => navigate('/ocr')}>Scan Bill (OCR)</Button>
        </div>
      </div>

      {message && <div className="text-sm text-slate-600">{message}</div>}

      {/* Hidden camera input for selfie capture */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={onCameraChange}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-slate-500 mb-1">Today's Status</div>
          <div className="text-2xl font-semibold">{lastStatus}</div>
          <div className="mt-3 flex gap-2">
            <Button disabled={loading} type="button" onClick={() => handlePunch('punch_in')}>Punch In</Button>
            <Button disabled={loading} type="button" onClick={() => handlePunch('punch_out')} className="bg-slate-100 text-slate-700 hover:bg-slate-200">Punch Out</Button>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold">Recent Attendance</div>
            <div className="text-xs text-slate-500">Last 10 entries</div>
          </div>
          <div className="divide-y">
            {attendanceLogs.slice(0, 10).map(l => (
              <div key={l.id} className="py-2 flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${l.details?.type === 'punch_in' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                    {l.details?.type === 'punch_in' ? 'IN' : 'OUT'}
                  </span>
                  <span>{new Date(l.created_at).toLocaleString()}</span>
                </div>
                <div className="text-xs text-slate-500">
                  {formatLatLon(l.details?.lat, l.details?.lon)}
                </div>
              </div>
            ))}
            {attendanceLogs.length === 0 && (
              <div className="text-sm text-slate-500 py-6 text-center">No attendance records yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatLatLon(lat?: number | null, lon?: number | null) {
  if (lat == null || lon == null) return 'Location unavailable';
  const r = (n: number) => n.toFixed(5);
  return `${r(lat)}, ${r(lon)}`;
}

async function resizeImageToDataUrl(file: File, maxW: number, maxH: number, quality = 0.7): Promise<string> {
  const dataUrl = await fileToDataUrl(file);
  const img = await loadImage(dataUrl);
  const { width, height } = fitWithin(img.width, img.height, maxW, maxH);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', quality);
}

function fitWithin(w: number, h: number, maxW: number, maxH: number) {
  const ratio = Math.min(maxW / w, maxH / h, 1);
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function getLocationSafe(): Promise<{ lat: number; lon: number; accuracy?: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy });
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}
