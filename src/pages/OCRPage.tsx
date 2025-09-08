import { useRef, useState } from 'react';
import Tesseract from 'tesseract.js';
import { Button } from '@/components/Field';
import { API } from '@/lib/api';

export default function OCRPage() {
  const [image, setImage] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [processing, setProcessing] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const openCamera = () => {
    cameraInputRef.current?.click();
  };

  const runOCR = async () => {
    if (!image) return;
    setProcessing(true);
    const result = await Tesseract.recognize(image, 'eng');
    setText(result.data.text);
    setProcessing(false);
  };

  const save = async () => {
    await API.post('/bills', { merchant: 'Unknown', bill_date: new Date().toISOString().slice(0,10), total: 0, items: [], raw_text: text, extracted: { text } });
    alert('Bill saved');
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="bg-white border rounded-lg p-4">
        <div className="flex flex-col gap-2">
          <input type="file" accept="image/*,.pdf" onChange={onFile} />
          {/* Mobile camera capture */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onFile}
          />
          <Button type="button" onClick={openCamera} className="w-max">Use Camera</Button>
        </div>
        {image && <img src={image} alt="preview" className="mt-4 max-h-96 object-contain" />}
        <div className="mt-3 flex gap-2">
          <Button onClick={runOCR} disabled={!image || processing}>{processing ? 'Processing...' : 'Run OCR'}</Button>
          <Button onClick={save} disabled={!text}>Save as Bill</Button>
        </div>
      </div>
      <div className="bg-white border rounded-lg p-4 whitespace-pre-wrap min-h-[300px]">
        {text || 'Extracted text will appear here...'}
      </div>
    </div>
  );
}
