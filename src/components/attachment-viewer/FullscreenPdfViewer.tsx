import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Search,
  X,
  ChevronUp,
  ChevronDown,
  Maximize2,
  FileWarning,
  Download,
} from "lucide-react";
import { loadPdfJs, isPreviewEnvironment } from "@/lib/dynamicImports";
import type * as PdfJsLib from "pdfjs-dist";

interface SearchResult {
  pageNum: number;
  matchIndex: number;
  text: string;
}

interface FullscreenPdfViewerProps {
  pdfData: ArrayBuffer;
  fileName: string;
  onDownload?: () => void;
}

export function FullscreenPdfViewer({
  pdfData,
  fileName,
  onDownload,
}: FullscreenPdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [pdfjsLib, setPdfjsLib] = useState<typeof PdfJsLib | null>(null);
  const [pdfDoc, setPdfDoc] = useState<PdfJsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPreview, setIsPreview] = useState(false);

  // Search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const [searching, setSearching] = useState(false);

  // Page jump input
  const [pageInputValue, setPageInputValue] = useState("");

  // Check for preview environment and load PDF.js
  useEffect(() => {
    if (isPreviewEnvironment()) {
      setIsPreview(true);
      setLoading(false);
      return;
    }

    loadPdfJs()
      .then(setPdfjsLib)
      .catch((err) => {
        console.error("Failed to load PDF.js:", err);
        setError(err.message || "Failed to load PDF viewer");
        setLoading(false);
      });
  }, []);

  // Load PDF document
  useEffect(() => {
    if (!pdfjsLib) return;
    
    let cancelled = false;

    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);

        const pdfDataCopy = pdfData.slice(0);
        const loadingTask = pdfjsLib.getDocument({ data: pdfDataCopy });
        const doc = await loadingTask.promise;

        if (cancelled) return;

        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setCurrentPage(1);
      } catch (err) {
        console.error("Error loading PDF:", err);
        if (!cancelled) {
          setError("Failed to load PDF document");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      cancelled = true;
    };
  }, [pdfjsLib, pdfData]);

  // Render current page
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;

    try {
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale });

      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) return;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({
        canvasContext: context,
        viewport,
      }).promise;
    } catch (err) {
      console.error("Error rendering page:", err);
    }
  }, [pdfDoc, currentPage, scale]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  // Search functionality
  const performSearch = useCallback(async () => {
    if (!pdfDoc || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    const results: SearchResult[] = [];
    const query = searchQuery.toLowerCase();

    try {
      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(" ")
          .toLowerCase();

        let startIndex = 0;
        let matchIndex = 0;
        while ((startIndex = pageText.indexOf(query, startIndex)) !== -1) {
          results.push({
            pageNum,
            matchIndex,
            text: searchQuery,
          });
          startIndex += query.length;
          matchIndex++;
        }
      }

      setSearchResults(results);
      setCurrentResultIndex(0);

      if (results.length > 0) {
        setCurrentPage(results[0].pageNum);
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setSearching(false);
    }
  }, [pdfDoc, searchQuery]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      } else if (e.key === "Escape" && showSearch) {
        setShowSearch(false);
        setSearchQuery("");
        setSearchResults([]);
      } else if (e.key === "+" || e.key === "=") {
        if (!showSearch) zoomIn();
      } else if (e.key === "-") {
        if (!showSearch) zoomOut();
      } else if (e.key === "0") {
        if (!showSearch) setScale(1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showSearch]);

  const goToPrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const zoomIn = () => setScale((s) => Math.min(s + 0.25, 4));
  const zoomOut = () => setScale((s) => Math.max(s - 0.25, 0.5));
  const fitToWidth = () => setScale(1.5);

  const handlePageJump = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(pageInputValue, 10);
    if (pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
      setPageInputValue("");
    }
  };

  const goToNextResult = () => {
    if (searchResults.length === 0) return;
    const nextIndex = (currentResultIndex + 1) % searchResults.length;
    setCurrentResultIndex(nextIndex);
    setCurrentPage(searchResults[nextIndex].pageNum);
  };

  const goToPrevResult = () => {
    if (searchResults.length === 0) return;
    const prevIndex =
      (currentResultIndex - 1 + searchResults.length) % searchResults.length;
    setCurrentResultIndex(prevIndex);
    setCurrentPage(searchResults[prevIndex].pageNum);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch();
  };

  // Preview environment message
  if (isPreview) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-muted/30">
        <FileWarning className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium mb-2">PDF Preview Unavailable</p>
        <p className="text-muted-foreground text-center max-w-md mb-4">
          PDF preview is available in production builds only.
        </p>
        {onDownload && (
          <Button onClick={onDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-muted/30">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" />
        <p className="text-muted-foreground">Loading PDF...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-muted/30">
        <p className="text-lg font-medium mb-2 text-destructive">{error}</p>
        {onDownload && (
          <Button onClick={onDownload} className="mt-4">
            Download PDF
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-muted/50 border-b">
        {/* Page Navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPrevPage}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <form onSubmit={handlePageJump} className="flex items-center gap-1">
            <Input
              type="text"
              value={pageInputValue}
              onChange={(e) => setPageInputValue(e.target.value)}
              placeholder={String(currentPage)}
              className="w-12 h-8 text-center text-sm"
            />
            <span className="text-sm text-muted-foreground">/ {totalPages}</span>
          </form>

          <Button
            variant="ghost"
            size="icon"
            onClick={goToNextPage}
            disabled={currentPage >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={zoomOut} disabled={scale <= 0.5}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm min-w-[50px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button variant="ghost" size="icon" onClick={zoomIn} disabled={scale >= 4}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={fitToWidth} title="Fit to width">
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Search Toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant={showSearch ? "secondary" : "ghost"}
            size="icon"
            onClick={() => {
              setShowSearch(!showSearch);
              if (!showSearch) {
                setTimeout(() => searchInputRef.current?.focus(), 100);
              }
            }}
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="flex items-center gap-2 px-4 py-2 bg-background border-b">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search in document..."
                className="pl-9 h-9"
              />
            </div>
            <Button type="submit" size="sm" disabled={searching}>
              {searching ? "Searching..." : "Find"}
            </Button>
          </form>

          {searchResults.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">
                {currentResultIndex + 1} of {searchResults.length}
              </span>
              <Button variant="ghost" size="icon" onClick={goToPrevResult}>
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={goToNextResult}>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          )}

          {searchQuery && searchResults.length === 0 && !searching && (
            <span className="text-sm text-muted-foreground">No results</span>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setShowSearch(false);
              setSearchQuery("");
              setSearchResults([]);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* PDF Canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-muted/30 flex items-start justify-center p-4"
      >
        <canvas ref={canvasRef} className="shadow-lg" />
      </div>
    </div>
  );
}
