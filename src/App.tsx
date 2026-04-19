import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { jsPDF } from 'jspdf';
import { PDFDocument } from 'pdf-lib';
import { FileImage, Trash2, Download, Plus, FileText, Loader2, Frame, Crop, StretchHorizontal, Files, ArrowRight, Merge } from 'lucide-react';

interface ImageFile {
  id: string;
  file: File;
  preview: string;
}

interface PDFFile {
  id: string;
  file: File;
  name: string;
  size: string;
}

type AppMode = 'image-to-pdf' | 'pdf-merger';

export default function App() {
  const [mode, setMode] = useState<AppMode>('image-to-pdf');
  const [images, setImages] = useState<ImageFile[]>([]);
  const [pdfFiles, setPdfFiles] = useState<PDFFile[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [fitMode, setFitMode] = useState<'fit' | 'fill' | 'stretch'>('fill');

  const onDropImages = useCallback((acceptedFiles: File[]) => {
    const newImages = acceptedFiles.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      preview: URL.createObjectURL(file),
    }));
    setImages((prev) => [...prev, ...newImages]);
  }, []);

  const onDropPDFs = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
    }));
    setPdfFiles((prev) => [...prev, ...newFiles]);
  }, []);

  // @ts-ignore
  const { getRootProps: getImgRootProps, getInputProps: getImgInputProps, isDragActive: isImgDragActive } = useDropzone({
    onDrop: onDropImages,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    multiple: true
  });

  // @ts-ignore
  const { getRootProps: getPdfRootProps, getInputProps: getPdfInputProps, isDragActive: isPdfDragActive } = useDropzone({
    onDrop: onDropPDFs,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true
  });

  const removeImage = (idToRemove: string) => {
    setImages((prev) => {
      const filtered = prev.filter((img) => img.id !== idToRemove);
      const removed = prev.find((img) => img.id === idToRemove);
      if (removed) URL.revokeObjectURL(removed.preview);
      return filtered;
    });
  };

  const removePdf = (idToRemove: string) => {
    setPdfFiles((prev) => prev.filter((f) => f.id !== idToRemove));
  };

  const generateImagePDF = async () => {
    if (images.length === 0) return;
    setIsGenerating(true);
    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const a4Width = 210;
      const a4Height = 297;

      for (let i = 0; i < images.length; i++) {
        if (i > 0) pdf.addPage();
        const img = images[i];
        const imgElement = new Image();
        imgElement.src = img.preview;
        await new Promise((resolve, reject) => {
          imgElement.onload = resolve;
          imgElement.onerror = reject;
        });

        const imgWidth = imgElement.width;
        const imgHeight = imgElement.height;
        let finalWidth, finalHeight, x, y;

        if (fitMode === 'stretch') {
          finalWidth = a4Width;
          finalHeight = a4Height;
          x = 0;
          y = 0;
        } else if (fitMode === 'fill') {
          const widthRatio = a4Width / imgWidth;
          const heightRatio = a4Height / imgHeight;
          const ratio = Math.max(widthRatio, heightRatio);
          finalWidth = imgWidth * ratio;
          finalHeight = imgHeight * ratio;
          x = (a4Width - finalWidth) / 2;
          y = (a4Height - finalHeight) / 2;
        } else {
          const margin = 10;
          const maxWidth = a4Width - margin * 2;
          const maxHeight = a4Height - margin * 2;
          const widthRatio = maxWidth / imgWidth;
          const heightRatio = maxHeight / imgHeight;
          const ratio = Math.min(widthRatio, heightRatio);
          finalWidth = imgWidth * ratio;
          finalHeight = imgHeight * ratio;
          x = margin + (maxWidth - finalWidth) / 2;
          y = margin + (maxHeight - finalHeight) / 2;
        }
        pdf.addImage(imgElement, 'JPEG', x, y, finalWidth, finalHeight);
      }
      pdf.save('تصوير_إلى_pdf.pdf');
    } catch (error) {
      console.error(error);
      alert('حدث خطأ أثناء إنشاء ملف الـ PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  const mergePDFs = async () => {
    if (pdfFiles.length < 2) {
      alert('الرجاء اختيار ملفين على الأقل للدمج.');
      return;
    }
    setIsGenerating(true);
    try {
      const mergedPdf = await PDFDocument.create();
      for (const pdfFile of pdfFiles) {
        const fileArrayBuffer = await pdfFile.file.arrayBuffer();
        const pdf = await PDFDocument.load(fileArrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }
      const pdfBytes = await mergedPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'ملفات_مدمجة.pdf';
      link.click();
    } catch (error) {
      console.error(error);
      alert('حدث خطأ أثناء دمج ملفات الـ PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans p-6 md:p-12" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-xl shadow-blue-100 mb-2">
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-800">
            أدوات الـ PDF الذكية
          </h1>
          <p className="text-lg text-slate-500 max-w-xl mx-auto font-light">
            حول صورك لملفات PDF احترافية أو ادمج ملفات الـ PDF الخاصة بك في ثوانٍ.
          </p>
        </header>

        {/* Mode Selector */}
        <div className="flex p-1 bg-slate-200 rounded-2xl max-w-md mx-auto">
          <button
            onClick={() => setMode('image-to-pdf')}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
              mode === 'image-to-pdf' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <FileImage className="w-4 h-4" />
              <span>صور إلى PDF</span>
            </div>
          </button>
          <button
            onClick={() => setMode('pdf-merger')}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
              mode === 'pdf-merger' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Files className="w-4 h-4" />
              <span>دمج PDF</span>
            </div>
          </button>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div className="p-8 md:p-12">
            {mode === 'image-to-pdf' ? (
              <div className="space-y-8">
                <div {...getImgRootProps()} className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${isImgDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50'}`}>
                  <input {...getImgInputProps()} />
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-4 rounded-full bg-blue-100 text-blue-600"><Plus className="w-8 h-8" /></div>
                    <div>
                      <p className="text-lg font-semibold text-slate-700">اسحب الصور هنا لتحويلها</p>
                      <p className="text-sm text-slate-400 mt-1">يدعم JPEG, PNG, WebP (سيتم ترتيبها حسب تسلسل الرفع)</p>
                    </div>
                  </div>
                </div>

                {images.length > 0 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <h2 className="text-xl font-bold text-slate-800">الصور المختارة ({images.length})</h2>
                      <button onClick={() => setImages([])} className="text-sm text-red-500 hover:text-red-600 font-medium tracking-wide">مسح الكل</button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {images.map((img, idx) => (
                        <div key={img.id} className="group relative aspect-[3/4] rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                          <img src={img.preview} alt="" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button onClick={() => removeImage(img.id)} className="p-2 bg-white text-red-500 rounded-full hover:scale-110 transition-transform"><Trash2 className="w-5 h-5" /></button>
                          </div>
                          <div className="absolute top-2 right-2 bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">{idx + 1}</div>
                        </div>
                      ))}
                    </div>
                    <div className="pt-8 border-t border-slate-100 space-y-6">
                      <h3 className="text-lg font-bold text-slate-800">وضع الملاءمة (A4)</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                          { id: 'fit', icon: Frame, title: 'نسبة وتناسب', desc: 'يحافظ على الشكل الأصلي' },
                          { id: 'fill', icon: Crop, title: 'تعبئة كاملة', desc: 'يملأ الصفحة مع قص بسيط' },
                          { id: 'stretch', icon: StretchHorizontal, title: 'تمدد كامل', desc: 'يعصر الصورة لتناسب A4' }
                        ].map((m) => (
                          <button key={m.id} onClick={() => setFitMode(m.id as any)} className={`flex items-center p-4 rounded-xl border-2 transition-all ${fitMode === m.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'}`}>
                            <m.icon className="w-6 h-6 me-3" />
                            <div className="text-start">
                              <div className="font-bold text-sm text-slate-900 leading-none mb-1">{m.title}</div>
                              <div className="text-[10px] opacity-70">{m.desc}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                      <div className="flex justify-end">
                        <button onClick={generateImagePDF} disabled={isGenerating} className="group relative flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-2xl font-bold transition-all disabled:opacity-50 shadow-lg shadow-blue-200 hover:shadow-blue-300">
                          {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />}
                          <span>تنزيل الملف المجمع</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-8">
                <div {...getPdfRootProps()} className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${isPdfDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50'}`}>
                  <input {...getPdfInputProps()} />
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-4 rounded-full bg-blue-100 text-blue-600"><Plus className="w-8 h-8" /></div>
                    <div>
                      <p className="text-lg font-semibold text-slate-700">اسحب ملفات الـ PDF هنا لدمجها</p>
                      <p className="text-sm text-slate-400 mt-1">سيتم دمج الملفات حسب ترتيب رفعها (من 1 إلى 10 أو أكثر)</p>
                    </div>
                  </div>
                </div>

                {pdfFiles.length > 0 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <h2 className="text-xl font-bold text-slate-800">الملفات المختارة ({pdfFiles.length})</h2>
                      <button onClick={() => setPdfFiles([])} className="text-sm text-red-500 hover:text-red-600 font-medium">حذف الكل</button>
                    </div>
                    <div className="space-y-3">
                      {pdfFiles.map((pdf, idx) => (
                        <div key={pdf.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 group hover:border-blue-200 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-lg text-xs font-bold">{idx + 1}</div>
                            <div className="flex items-center gap-3">
                              <FileText className="w-5 h-5 text-slate-400" />
                              <div className="text-start">
                                <p className="text-sm font-bold text-slate-700 truncate max-w-[200px] md:max-w-md">{pdf.name}</p>
                                <p className="text-[10px] text-slate-400 uppercase">{pdf.size}</p>
                              </div>
                            </div>
                          </div>
                          <button onClick={() => removePdf(pdf.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                    <div className="pt-8 border-t border-slate-100 flex justify-end">
                      <button onClick={mergePDFs} disabled={isGenerating || pdfFiles.length < 2} className="group flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-2xl font-bold transition-all disabled:opacity-50 shadow-lg shadow-blue-200 hover:shadow-blue-300">
                        {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Merge className="w-5 h-5 group-hover:rotate-90 transition-transform" />}
                        <span>دمج وحفظ في ملف واحد</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
