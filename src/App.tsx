import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { jsPDF } from 'jspdf';
import { FileImage, Trash2, Download, Plus, FileText, Loader2, Frame, Crop, StretchHorizontal } from 'lucide-react';

interface ImageFile {
  id: string;
  file: File;
  preview: string;
}

export default function App() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [fitMode, setFitMode] = useState<'fit' | 'fill' | 'stretch'>('fill');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newImages = acceptedFiles.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      preview: URL.createObjectURL(file),
    }));
    setImages((prev) => [...prev, ...newImages]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
    },
  });

  const removeImage = (idToRemove: string) => {
    setImages((prev) => {
      const filtered = prev.filter((img) => img.id !== idToRemove);
      // Revoke object URL to avoid memory leaks
      const removed = prev.find((img) => img.id === idToRemove);
      if (removed) URL.revokeObjectURL(removed.preview);
      return filtered;
    });
  };

  const generatePDF = async () => {
    if (images.length === 0) return;
    setIsGenerating(true);

    try {
      // A4 size in mm: 210 x 297
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const a4Width = 210;
      const a4Height = 297;

      for (let i = 0; i < images.length; i++) {
        if (i > 0) {
          pdf.addPage();
        }

        const img = images[i];
        
        // Load image to get dimensions
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
          // Stretch exactly to A4
          finalWidth = a4Width;
          finalHeight = a4Height;
          x = 0;
          y = 0;
        } else if (fitMode === 'fill') {
          // Fill A4 and crop edges (maintain aspect ratio)
          const widthRatio = a4Width / imgWidth;
          const heightRatio = a4Height / imgHeight;
          const ratio = Math.max(widthRatio, heightRatio);
          finalWidth = imgWidth * ratio;
          finalHeight = imgHeight * ratio;
          x = (a4Width - finalWidth) / 2;
          y = (a4Height - finalHeight) / 2;
        } else {
          // Fit within A4 with margins (maintain aspect ratio)
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

      pdf.save('images-to-a4.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('حدث خطأ أثناء إنشاء ملف الـ PDF. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-gray-900 font-sans p-6 md:p-12" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-sm mb-2">
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-4xl md:text-5xl font-light tracking-tight text-gray-900">
            محول الصور إلى PDF (قياس A4)
          </h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto font-light">
            قم برفع صورك وتحويلها إلى ملف PDF واحد بقياس A4 وبأبعاد متناسقة للطباعة.
          </p>
        </header>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-8 md:p-12">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 ease-in-out
                ${
                  isDragActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className={`p-4 rounded-full ${isDragActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                  <Plus className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-lg font-medium text-gray-700">
                    {isDragActive ? 'أفلت الصور هنا' : 'اسحب وأفلت الصور هنا'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    أو انقر لاختيار الملفات (JPEG, PNG, WebP)
                  </p>
                </div>
              </div>
            </div>

            {images.length > 0 && (
              <div className="mt-12 space-y-6">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <h2 className="text-xl font-medium text-gray-800">
                    الصور المحددة ({images.length})
                  </h2>
                  <button
                    onClick={() => setImages([])}
                    className="text-sm text-red-500 hover:text-red-600 font-medium transition-colors"
                  >
                    مسح الكل
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {images.map((img, index) => (
                    <div
                      key={img.id}
                      className="group relative aspect-[3/4] rounded-xl overflow-hidden bg-gray-100 border border-gray-200"
                    >
                      <img
                        src={img.preview}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeImage(img.id);
                          }}
                          className="p-2 bg-white text-red-500 rounded-full hover:bg-red-50 hover:scale-105 transition-all shadow-sm"
                          title="إزالة الصورة"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm">
                        {index + 1}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-8 border-t border-gray-100">
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-800 mb-4">وضع ملاءمة الصورة لصفحة (A4)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <button
                        onClick={() => setFitMode('fit')}
                        className={`flex items-center p-4 rounded-xl border-2 transition-all ${
                          fitMode === 'fit'
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <Frame className="w-8 h-8 opacity-80 me-3" />
                        <div className="text-start">
                          <div className="font-medium text-sm text-gray-900 mb-1">نسبة وتناسب (دون هوامش)</div>
                          <div className="text-xs opacity-80">يحافظ على أبعاد الصورة الأصلية مع هوامش.</div>
                        </div>
                      </button>

                      <button
                        onClick={() => setFitMode('fill')}
                        className={`flex items-center p-4 rounded-xl border-2 transition-all ${
                          fitMode === 'fill'
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <Crop className="w-8 h-8 opacity-80 me-3" />
                        <div className="text-start">
                          <div className="font-medium text-sm text-gray-900 mb-1">تعبئة الصفحة (قص الأطراف)</div>
                          <div className="text-xs opacity-80">تعبئة كامل الـ A4 مع قص الجزء الزائد بذكاء.</div>
                        </div>
                      </button>

                      <button
                        onClick={() => setFitMode('stretch')}
                        className={`flex items-center p-4 rounded-xl border-2 transition-all ${
                          fitMode === 'stretch'
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <StretchHorizontal className="w-8 h-8 opacity-80 me-3" />
                        <div className="text-start">
                          <div className="font-medium text-sm text-gray-900 mb-1">تمديد (عصر الصورة)</div>
                          <div className="text-xs opacity-80">تمديد وعصر الصورة لتطابق قياس ورقة A4 بدون قص.</div>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={generatePDF}
                      disabled={isGenerating || images.length === 0}
                      className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md active:scale-[0.98]"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin me-2" />
                          <span>جاري إنشاء الـ PDF...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-5 h-5 me-2" />
                          <span>تنزيل ملف PDF</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
