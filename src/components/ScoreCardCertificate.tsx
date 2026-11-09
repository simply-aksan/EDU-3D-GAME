import React, { useEffect, useRef, useState } from 'react';
import { formatWhatsAppScoreReport } from '../game/rules';

interface ScoreCardCertificateProps {
  studentName: string;
  level: number;
  xp: number;
  coins: number;
  packTitle: string;
  subject: string;
  grade: string;
  author?: string;
  teacherWhatsapp?: string;
  gameTitle: string;
  score: number;
  bestScore: number;
  status: 'victory' | 'defeat';
}

export const ScoreCardCertificate: React.FC<ScoreCardCertificateProps> = ({
  studentName,
  level,
  xp,
  coins,
  packTitle,
  subject,
  grade,
  author,
  teacherWhatsapp,
  gameTitle,
  score,
  bestScore,
  status
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [waPhoneInput, setWaPhoneInput] = useState(teacherWhatsapp || '');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const report = formatWhatsAppScoreReport({
    studentName,
    level,
    packTitle,
    subject,
    grade,
    gameTitle,
    score,
    bestScore,
    status,
    teacherWhatsapp: waPhoneInput
  });

  useEffect(() => {
    setWaPhoneInput(teacherWhatsapp || '');
  }, [teacherWhatsapp]);

  // Draw stylized 3D Certificate / Kartu Hasil Belajar onto HTML5 Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    // 1. Deep night sky & 3D horizon gradient
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, '#090d16');
    bgGrad.addColorStop(0.55, '#0f172a');
    bgGrad.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // 2. Stylized 3D perspective grid lines at the bottom
    ctx.save();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.14)';
    ctx.lineWidth = 1.5;
    const horizonY = 440;
    for (let y = horizonY; y <= H; y += 34) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    for (let x = -200; x <= W + 200; x += 90) {
      ctx.beginPath();
      ctx.moveTo(W / 2 + (x - W / 2) * 0.35, horizonY);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    ctx.restore();

    // 3. Decorative Low-Poly 3D Hexagonal Emblem on Top-Right
    ctx.save();
    ctx.translate(W - 140, 130);
    ctx.fillStyle = 'rgba(245, 158, 11, 0.12)';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const ang = (i * Math.PI) / 3 - Math.PI / 6;
      const rx = Math.cos(ang) * 68;
      const ry = Math.sin(ang) * 68;
      if (i === 0) ctx.moveTo(rx, ry);
      else ctx.lineTo(rx, ry);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`LVL ${level}`, 0, 4);
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#fde68a';
    ctx.fillText(`${xp} XP`, 0, 26);
    ctx.restore();

    // 4. Outer & Inner Gold Certificate Frame
    ctx.strokeStyle = status === 'victory' ? '#f59e0b' : '#38bdf8';
    ctx.lineWidth = 4;
    ctx.strokeRect(24, 24, W - 48, H - 48);

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(36, 36, W - 72, H - 72);

    // 5. Header Title & Badge
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(
      'EDUVERSE 3D · SERTIFIKAT & KARTU HASIL BELAJAR INTERAKTIF',
      64,
      78
    );

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px sans-serif';
    ctx.fillText(studentName || 'Pelajar Nusantara', 64, 132);

    // Status Pill
    const statusText =
      status === 'victory'
        ? 'LULUS MISI 3D DENGAN GEMILANG'
        : 'MENYELESAIKAN LATIHAN MISI 3D';
    ctx.fillStyle = status === 'victory' ? '#065f46' : '#1e3a8a';
    ctx.fillRect(64, 152, 340, 32);
    ctx.strokeStyle = status === 'victory' ? '#34d399' : '#60a5fa';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(64, 152, 340, 32);
    ctx.fillStyle = '#ecfdf5';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(statusText, 78, 173);

    // 6. Info Cards (Paket Soal, Mapel/Kelas, Mini-Game)
    const drawBox = (
      x: number,
      y: number,
      w: number,
      h: number,
      label: string,
      value: string,
      accent: string
    ) => {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(label, x + 18, y + 28);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 20px sans-serif';
      const maxChars = Math.floor((w - 36) / 11);
      const clipped =
        value.length > maxChars ? `${value.slice(0, maxChars - 1)}…` : value;
      ctx.fillText(clipped, x + 18, y + 60);
    };

    drawBox(64, 212, 520, 82, 'PAKET SOAL AKTIF', packTitle, '#f59e0b');
    drawBox(
      604,
      212,
      532,
      82,
      'MATA PELAJARAN & JENJANG KELAS',
      `${subject} · ${grade}`,
      '#38bdf8'
    );

    drawBox(64, 312, 520, 82, 'MODE MINI-GAME 3D', gameTitle, '#a855f7');
    drawBox(
      604,
      312,
      532,
      82,
      'GURU PENGAMPU / SUMBER MATERI',
      author || 'Guru Eduverse 3D',
      '#10b981'
    );

    // 7. Big Score Highlight Panel
    ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
    ctx.fillRect(64, 418, 1072, 118);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(64, 418, 1072, 118);

    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 15px monospace';
    ctx.fillText('SKOR AKHIR MISI', 96, 454);
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 48px monospace';
    ctx.fillText(`${score} POIN`, 96, 510);

    ctx.fillStyle = '#bae6fd';
    ctx.font = 'bold 15px monospace';
    ctx.fillText('REKOR TERBAIK', 450, 454);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 42px monospace';
    ctx.fillText(`${bestScore} POIN`, 450, 508);

    ctx.fillStyle = '#a7f3d0';
    ctx.font = 'bold 15px monospace';
    ctx.fillText('SALDO KOIN & LEVEL', 800, 454);
    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 34px monospace';
    ctx.fillText(`${coins} Koin · L${level}`, 800, 505);

    // 8. Footer Verification Code & Timestamp
    const dateStr = new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px monospace';
    ctx.fillText(
      `Kode Verifikasi: ${report.verificationCode} · Tanggal: ${dateStr}`,
      64,
      582
    );

    ctx.textAlign = 'right';
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('TERVERIFIKASI OLEH UNIVERSAL QUESTION ENGINE', W - 64, 582);
  }, [
    studentName,
    level,
    xp,
    coins,
    packTitle,
    subject,
    grade,
    author,
    gameTitle,
    score,
    bestScore,
    status,
    report.verificationCode
  ]);

  const handleDownloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    const safeName = (studentName || 'Pelajar')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 24);
    link.download = `Kartu-Hasil-Belajar-${safeName}-${score}pts.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setActionNotice(
      'Kartu Hasil Belajar (PNG) berhasil diunduh ke perangkatmu!'
    );
  };

  const handleCopyWaReport = () => {
    navigator.clipboard?.writeText(report.message);
    setActionNotice(
      'Rekap Skor WhatsApp berhasil disalin! Siap ditempel atau dikirim ke WA Guru.'
    );
  };

  return (
    <div className="space-y-3 text-left">
      <div className="rounded-xl overflow-hidden border border-amber-500/60 bg-slate-950 shadow-lg">
        <canvas
          ref={canvasRef}
          width={1200}
          height={620}
          data-testid="score-card-canvas"
          className="w-full h-auto block"
        />
      </div>

      {actionNotice && (
        <div className="px-3 py-2 rounded-lg bg-emerald-950/90 border border-emerald-500/60 text-xs text-emerald-200 font-semibold">
          {actionNotice}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="No. WA Guru (opsional, misal 0812...)"
          value={waPhoneInput}
          onChange={(e) => setWaPhoneInput(e.target.value)}
          className="flex-1 min-w-[180px] px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white font-mono-num"
        />
        <button
          type="button"
          onClick={handleDownloadPng}
          className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer whitespace-nowrap"
        >
          Unduh Kartu Nilai (PNG)
        </button>
        <a
          href={report.waUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleCopyWaReport}
          className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5"
        >
          <span>Kirim Rekap ke WA Guru</span>
        </a>
      </div>
    </div>
  );
};
