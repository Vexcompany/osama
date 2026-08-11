"use client";

import React, { useRef, useState, useEffect } from "react";

interface AspirationData {
  caseId: string;
  message: string;
  adminReply: string;
}

export default function CanvasAspirationAdmin() {
  // State untuk simulasi data dinamis
  const [data, setData] = useState<AspirationData>({
    caseId: "OSM-56PYOW2-SBTQ8M",
    message: "Pagaska music bagus dan mantap sekali, mohon untuk terus ditingkatkan ke depannya agar OSIS semakin jaya!",
    adminReply: "Terima kasih atas aspirasinya! Kami akan segera menindaklanjuti hal ini.",
  });

  const [isAdmin, setIsAdmin] = useState<boolean>(true); // Mode Toggle Admin/User
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Fungsi untuk menggambar ulang gambar dan teks di atas HTML5 Canvas
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.src = "/images/template.jpg"; // Memuat gambar mentahan kosongan Anda
    
    img.onload = () => {
      // Atur resolusi kanvas sesuai resolusi asli template gambar agar tajam saat diunduh
      canvas.width = img.width;
      canvas.height = img.height;

      // 1. Gambar background mentahan terlebih dahulu
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // 2. Konfigurasi Gaya Tulisan (Font & Warna)
      ctx.fillStyle = "#1e293b"; // Warna teks biru gelap/slate senada tema laut
      ctx.textBaseline = "top";

      // --- A. MENGGAMBAR CASE ID ---
      ctx.font = "bold 24px 'Courier New', Courier, monospace";
      // Koordinat X=120, Y=220 (Silakan sesuaikan dengan posisi baris pertama kertas Anda)
      ctx.fillText(`Case ID: ${data.caseId}`, 120, 220);

      // --- B. MENGGAMBAR MESSAGE (Dengan Fitur Auto-Wrap / Turun Baris Otomatis) ---
      ctx.font = "20px 'Comic Sans MS', cursive, sans-serif"; // Efek tulisan tangan santai
      const startX = 120;
      let startY = 270; // Memulai tulisan pesan di bawah Case ID
      const maxWidth = canvas.width - 240; // Batas kanan agar tidak keluar dari kertas
      const lineHeight = 36; // Jarak antar baris kertas (Sesuaikan dengan grid kertas template.jpg)

      const words = data.message.split(" ");
      let currentLine = "Message: ";

      for (let n = 0; n < words.length; n++) {
        let testLine = currentLine + words[n] + " ";
        let metrics = ctx.measureText(testLine);
        let testWidth = metrics.width;

        if (testWidth > maxWidth && n > 0) {
          ctx.fillText(currentLine, startX, startY);
          currentLine = words[n] + " ";
          startY += lineHeight; // Turun ke baris grid kertas berikutnya
        } else {
          currentLine = testLine;
        }
      }
      ctx.fillText(currentLine, startX, startY);

      // --- C. MENGGAMBAR BALASAN ADMIN (Di dekat area kura-kura / setelah tanda ":") ---
      if (data.adminReply) {
        ctx.font = "bold 20px 'Courier New', Courier, monospace";
        ctx.fillStyle = "#b91c1c"; // Gunakan warna merah maroon khusus balasan admin agar kontras
        
        // Asumsi posisi tanda ":" dekat kura-kura berada di sekitar koordinat X=210, Y=480
        // Teks balasan admin akan digambar langsung tepat setelah tanda tersebut secara rapi
        const replyX = 210; 
        const replyStartY = 480; 
        const maxReplyWidth = canvas.width - 320;
        const replyLineHeight = 32;

        const replyWords = data.adminReply.split(" ");
        let currentReplyLine = "";

        let currentY = replyStartY;
        for (let i = 0; i < replyWords.length; i++) {
          let testLine = currentReplyLine + replyWords[i] + " ";
          let metrics = ctx.measureText(testLine);
          if (metrics.width > maxReplyWidth && i > 0) {
            ctx.fillText(currentReplyLine, replyX, currentY);
            currentReplyLine = replyWords[i] + " ";
            currentY += replyLineHeight;
          } else {
            currentReplyLine = testLine;
          }
        }
        ctx.fillText(currentReplyLine, replyX, currentY);
      }
    };
  };

  // Gambar ulang kanvas setiap kali ada perubahan pada text input
  useEffect(() => {
    drawCanvas();
  }, [data]);

  // Fungsi untuk mengunduh hasil Canvas menjadi file gambar JPG beresolusi tinggi
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Mengubah canvas menjadi data URL berbentuk JPEG
    const imageURI = canvas.toDataURL("image/jpeg", 1.0);
    
    // Trigger download menggunakan tag anchor virtual
    const link = document.createElement("a");
    link.download = `Aspirasi-${data.caseId}.jpg`;
    link.href = imageURI;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: "24px", maxWidth: "600px", margin: "0 auto", fontFamily: "sans-serif" }}>
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>Preview &amp; Cetak Kanvas Sosmed</h2>
      
      {/* Toggle Role untuk Simulasi */}
      <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginBottom: "20px" }}>
        <button 
          onClick={() => setIsAdmin(false)}
          style={{ padding: "8px 16px", backgroundColor: !isAdmin ? "#2563eb" : "#e2e8f0", color: !isAdmin ? "#fff" : "#000", border: "none", borderRadius: "6px", cursor: "pointer" }}
        >
          Mode User (Public)
        </button>
        <button 
          onClick={() => setIsAdmin(true)}
          style={{ padding: "8px 16px", backgroundColor: isAdmin ? "#2563eb" : "#e2e8f0", color: isAdmin ? "#fff" : "#000", border: "none", borderRadius: "6px", cursor: "pointer" }}
        >
          Mode Admin (Balasan)
        </button>
      </div>

      {/* RENDER UTAMA HTML5 CANVAS */}
      <div style={{ width: "100%", overflowX: "auto", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", borderRadius: "8px", marginBottom: "20px" }}>
        <canvas 
          ref={canvasRef} 
          style={{ width: "100%", height: "auto", display: "block" }}
        />
      </div>

      {/* TOMBOL UNDUH */}
      <button
        onClick={handleDownload}
        style={{ width: "100%", padding: "12px", backgroundColor: "#16a34a", color: "white", fontSize: "16px", fontWeight: "bold", border: "none", borderRadius: "6px", cursor: "pointer", marginBottom: "24px" }}
      >
        📥 Unduh Gambar untuk Sosmed
      </button>

      {/* FORM INPUT SIMULASI (Untuk dihubungkan ke backend database Supabase Anda nantinya) */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
        <h3>Simulasi Manipulasi Data Canvas:</h3>
        
        <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "14px", fontWeight: "600" }}>
          Case ID:
          <input 
            type="text" 
            value={data.caseId} 
            onChange={(e) => setData({ ...data, caseId: e.target.value })}
            style={{ padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e1" }}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "14px", fontWeight: "600" }}>
          Message (Aspirasi User):
          <textarea 
            rows={3}
            value={data.message} 
            onChange={(e) => setData({ ...data, message: e.target.value })}
            style={{ padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e1", fontFamily: "sans-serif" }}
          />
        </label>

        {isAdmin && (
          <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "14px", fontWeight: "600", color: "#b91c1c" }}>
            Balasan Admin (Akan muncul di sebelah tanda ":" dekat Kura-Kura):
            <input 
              type="text" 
              value={data.adminReply} 
              onChange={(e) => setData({ ...data, adminReply: e.target.value })}
              placeholder="Tulis balasan resmi OSIS/PAGASKA..."
              style={{ padding: "8px", borderRadius: "4px", border: "1px solid #fca5a5" }}
            />
          </label>
        )}
      </div>
    </div>
  );
}
