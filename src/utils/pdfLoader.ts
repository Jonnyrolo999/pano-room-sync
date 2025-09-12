import * as pdfjsLib from 'pdfjs-dist';

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export interface PdfRenderResult {
  dataUrl: string;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
}

export async function renderPdfToDataUrl(
  urlOrFile: string | File, 
  scale = 2
): Promise<PdfRenderResult> {
  try {
    let loadingTask;
    
    if (typeof urlOrFile === 'string') {
      // Handle URL
      loadingTask = pdfjsLib.getDocument({ url: urlOrFile });
    } else {
      // Handle File
      const arrayBuffer = await urlOrFile.arrayBuffer();
      loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    }
    
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1); // Get first page
    
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }
    
    // Render page to canvas
    await page.render({
      canvasContext: ctx,
      viewport: viewport
    }).promise;
    
    return {
      dataUrl: canvas.toDataURL('image/png'),
      width: viewport.width,
      height: viewport.height,
      originalWidth: page.view[2],
      originalHeight: page.view[3]
    };
  } catch (error) {
    console.error('PDF rendering failed:', error);
    throw new Error(`Failed to render PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function loadImageFile(file: File): Promise<PdfRenderResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      ctx.drawImage(img, 0, 0);
      
      resolve({
        dataUrl: canvas.toDataURL('image/png'),
        width: img.naturalWidth,
        height: img.naturalHeight,
        originalWidth: img.naturalWidth,
        originalHeight: img.naturalHeight
      });
      
      // Clean up
      URL.revokeObjectURL(img.src);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };
    
    img.src = URL.createObjectURL(file);
  });
}