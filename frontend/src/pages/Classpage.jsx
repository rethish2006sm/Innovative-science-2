import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Download, FileText, Image as ImageIcon, Loader2, X, Eye, Layers } from "lucide-react";
import { useParams } from "react-router-dom";
import { API_BASE_URL, apiRequest } from "../api";
import { getStoredAuth } from "../authStorage";

const CLASS_POST_CATEGORIES = [
  { id: "assignment", label: "Assignment" },
  { id: "practice-paper", label: "Practice Paper" },
  { id: "important-question", label: "Important Question" },
];

const CATEGORY_LABELS = CLASS_POST_CATEGORIES.reduce((acc, item) => {
  acc[item.id] = item.label;
  return acc;
}, {});

function getStoredToken() {
  return getStoredAuth()?.token || "";
}

function toJson(payload) {
  if (!payload) return payload;
  if (typeof payload.json === "function") {
    return payload.json();
  }
  return payload;
}

function buildAuthedUrl(rawUrl, extras = {}) {
  if (!rawUrl) return "";
  if (rawUrl.startsWith("data:") || rawUrl.startsWith("blob:")) return rawUrl;
  const resolvedUrl = new URL(rawUrl, API_BASE_URL);
  const token = getStoredToken();
  if (token && !resolvedUrl.searchParams.get("token")) {
    resolvedUrl.searchParams.set("token", token);
  }
  Object.entries(extras).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      resolvedUrl.searchParams.set(key, String(value));
    }
  });
  return resolvedUrl.toString();
}

function normalizeCategory(category) {
  return CATEGORY_LABELS[category] ? category : "assignment";
}

function formatDate(value) {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function Classpage() {
  const { classId } = useParams();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState("assignment");
  const [viewerPost, setViewerPost] = useState(null);
  const [viewerPhoto, setViewerPhoto] = useState(null);
  const [viewerPdf, setViewerPdf] = useState(null);
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadFeed() {
      if (!classId) {
        setPosts([]);
        setError("Class not found.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await apiRequest(`/api/classes/${classId}/feed`);
        const data = await toJson(response);
        const nextPosts = Array.isArray(data?.posts) ? data.posts : [];

        if (!cancelled) {
          setPosts(nextPosts);
          setActiveCategory((current) => {
            const hasCurrent = nextPosts.some((post) => normalizeCategory(post?.category) === current);
            if (hasCurrent) return current;
            return "assignment";
          });
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError?.message || "Failed to load class posts.");
          setPosts([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadFeed();

    return () => {
      cancelled = true;
    };
  }, [classId]);

  const categoryCounts = useMemo(() => {
    return posts.reduce(
      (acc, post) => {
        const category = normalizeCategory(post?.category);
        acc[category] += 1;
        return acc;
      },
      {
        assignment: 0,
        "practice-paper": 0,
        "important-question": 0,
      },
    );
  }, [posts]);

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => normalizeCategory(post?.category) === activeCategory);
  }, [posts, activeCategory]);

  const closeViewer = () => {
    setViewerPost(null);
    setViewerPhoto(null);
    setViewerPdf(null);
    setIsZoomed(false);
  };

  const openPhotoViewer = (post, photo) => {
    setViewerPost(post);
    setViewerPhoto(photo);
    setViewerPdf(null);
    setIsZoomed(false);
  };

  const openPdfViewer = (post, pdf) => {
    const pdfUrl = pdf?.pdfUrl ? buildAuthedUrl(pdf.pdfUrl) : "";

    if (!pdfUrl) {
      setError("Could not open this PDF.");
      return;
    }

    const newWindow = window.open(pdfUrl, "_blank", "noopener,noreferrer");

    if (!newWindow) {
      window.location.assign(pdfUrl);
    }
  };

  const handleDownload = () => {
    const downloadPath = viewerPhoto?.photoUrl || viewerPdf?.pdfUrl;

    if (!downloadPath) return;

    const url = buildAuthedUrl(downloadPath, { download: 1 });
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const currentCategoryLabel = CATEGORY_LABELS[activeCategory] || "Assignment";

  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-900 selection:bg-indigo-100 selection:text-indigo-900 antialiased">
      {/* Dynamic Background Accents */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[400px] bg-gradient-to-b from-indigo-50/40 via-transparent to-transparent pointer-events-none -z-10" />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
        
        {/* Header Section */}
        <header className="mb-8 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100/80 mb-3">
            <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">Classroom Feed</p>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {currentCategoryLabel}s
          </h1>
          <p className="mt-2 text-sm text-slate-500 max-w-xl">
            Stay up to date with assignments, papers, and curriculum support materials updated directly.
          </p>
        </header>

        {/* Categories Horizontal Menu Bar */}
        <div className="sticky top-4 z-40 mb-8 rounded-2xl border border-slate-200/80 bg-white/80 p-1.5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-md">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth snap-x">
            {CLASS_POST_CATEGORIES.map((category) => {
              const active = activeCategory === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategory(category.id)}
                  className={[
                    "relative flex-1 min-w-[140px] sm:min-w-0 snap-center rounded-xl py-3 px-4 text-xs sm:text-sm font-semibold tracking-wide transition-all duration-300 ease-out outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                    active
                      ? "bg-slate-900 text-white shadow-md shadow-slate-950/10 scale-[1.02]"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 active:scale-98",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                    <span>{category.label}</span>
                    <span 
                      className={[
                        "inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-bold rounded-full transition-colors",
                        active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                      ].join(" ")}
                    >
                      {categoryCounts[category.id]}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Global Error Notice */}
        {error ? (
          <div className="mb-6 rounded-2xl border border-rose-100 bg-rose-50/60 p-4 text-sm text-rose-800 backdrop-blur-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            <p className="font-medium">{error}</p>
          </div>
        ) : null}

        {/* Feed / State Processing Layout */}
        {loading ? (
          <div className="flex min-h-[35vh] flex-col items-center justify-center gap-4 py-12">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-slate-200 shadow-sm">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
            </div>
            <p className="text-sm font-medium text-slate-500">Syncing classroom archive...</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white/60 py-16 px-4 text-center backdrop-blur-sm animate-in fade-in duration-300">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 text-slate-400 shadow-sm">
              <CalendarDays className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">Desk looks clean!</h3>
            <p className="mt-1.5 text-sm text-slate-400 max-w-xs mx-auto">
              No new {currentCategoryLabel.toLowerCase()} entries have been documented in this folder.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredPosts.map((post) => {
              const category = normalizeCategory(post?.category);
              const photos = Array.isArray(post?.photos) ? post.photos : [];
              const pdfUrl = post?.pdf?.pdfUrl ? buildAuthedUrl(post.pdf.pdfUrl) : "";

              return (
                <article
                  key={post._id || post.id}
                  className="group relative bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.04)] transition-all duration-300 transform-gpu"
                >
                  {/* Meta Strip */}
                  <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-tr from-indigo-50 to-indigo-100/40 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                        {(post.authorName || "RS").substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-slate-800 truncate">
                          {post.authorName || "By Rethish Sir"}
                        </h4>
                        <p className="text-xs text-slate-400 font-medium">
                          {formatDate(post.createdAt || post.updatedAt)}
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 whitespace-nowrap">
                      {CATEGORY_LABELS[category]}
                    </span>
                  </div>

                  {/* Message Content */}
                  {post.message ? (
                    <p className="text-[14px] sm:text-[15px] leading-relaxed text-slate-600 whitespace-pre-wrap mb-5">
                      {post.message}
                    </p>
                  ) : null}

                  {/* Re-imagined Gallery Interface */}
                  {photos.length > 0 ? (
                    <div className="mb-4">
                      <div 
                        className={[
                          "grid gap-2 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/50 p-2",
                          photos.length === 1 ? "grid-cols-1" : 
                          photos.length === 2 ? "grid-cols-2" : 
                          "grid-cols-2 sm:grid-cols-3"
                        ].join(" ")}
                      >
                        {photos.map((photo, index) => {
                          const src = photo?.photoUrl ? buildAuthedUrl(photo.photoUrl) : photo?.dataUrl || "";
                          const alt = photo?.fileName || `Attachment ${index + 1}`;
                          
                          // Handle a modern photo layout based on counts
                          const isLargeSpan = photos.length === 3 && index === 0;

                          return (
                            <button
                              key={photo?._id || photo?.id || `${post._id || post.id}-photo-${index}`}
                              type="button"
                              onClick={() => openPhotoViewer(post, photo)}
                              className={[
                                "group/item relative overflow-hidden rounded-xl bg-slate-200 text-left transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                                isLargeSpan ? "col-span-2 sm:col-span-1 aspect-[16/10] sm:aspect-square" : "aspect-square"
                              ].join(" ")}
                            >
                              {src ? (
                                <img
                                  src={src}
                                  alt={alt}
                                  className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover/item:scale-105"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400">
                                  <ImageIcon className="h-6 w-6" />
                                </div>
                              )}
                              
                              {/* Modern Glass Overlays */}
                              <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                                <div className="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-sm scale-90 group-hover/item:scale-100 transition-transform duration-300">
                                  <Eye className="h-3.5 w-3.5" />
                                  <span>Inspect</span>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {/* Action/Attachment File Bar (PDF Section preserved natively) */}
                  {pdfUrl ? (
                    <div className="flex items-center pt-1">
                      <button
                        type="button"
                        onClick={() => openPdfViewer(post, post.pdf)}
                        className="inline-flex w-full sm:w-auto items-center justify-center gap-2.5 rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300 hover:text-slate-950 active:scale-98"
                      >
                        <FileText className="h-4 w-4 text-rose-500" />
                        <span className="truncate max-w-[200px] text-left">
                          {post.pdf?.fileName || "Review Documentation"}
                        </span>
                      </button>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Re-imagined Gallery Overlay / Photo Viewer Modal */}
      {viewerPhoto && viewerPost ? (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-between bg-white/95 sm:bg-slate-950/95 px-0 py-0 sm:p-6 backdrop-blur-md animate-in fade-in duration-200"
          onClick={closeViewer}
          role="presentation"
        >
          {/* Top Panel Bar */}
          <div 
            className="flex items-center justify-between gap-4 bg-white border-b border-slate-100 sm:border-0 sm:bg-transparent p-4 sm:p-2 w-full max-w-7xl mx-auto"
            onClick={(event) => event.stopPropagation()}
            role="presentation"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 sm:text-white">
                {viewerPhoto.fileName || "Attachment Photo"}
              </p>
              <p className="text-xs text-slate-500 sm:text-slate-400 truncate">
                Provided by {viewerPost.authorName || "Admin"} · Tap to toggle sizing
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex h-10 px-4 items-center gap-2 rounded-xl bg-slate-100 sm:bg-white/10 text-slate-800 sm:text-white text-xs font-semibold tracking-wide transition hover:bg-slate-200 sm:hover:bg-white/20 active:scale-95"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Download</span>
              </button>
              <button
                type="button"
                onClick={closeViewer}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 sm:bg-white/10 text-slate-800 sm:text-white transition hover:bg-slate-200 sm:hover:bg-white/20 active:scale-95"
                aria-label="Close viewer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Photo Render Hub */}
          <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
            <button
              type="button"
              onClick={() => setIsZoomed((value) => !value)}
              onDoubleClick={() => setIsZoomed((value) => !value)}
              className="relative max-h-full max-w-full outline-none"
              aria-label="Toggle image zoom"
            >
              <img
                src={buildAuthedUrl(viewerPhoto.photoUrl || viewerPhoto.dataUrl || "")}
                alt={viewerPhoto.fileName || "Class photo"}
                className={[
                  "mx-auto max-h-[80vh] max-w-full rounded-xl sm:rounded-2xl object-contain shadow-2xl transition-transform duration-300 ease-out-back",
                  isZoomed ? "scale-125 sm:scale-150 cursor-zoom-out" : "cursor-zoom-in",
                ].join(" ")}
              />
            </button>
          </div>

          {/* Bottom Spacer/Buffer for layout alignment */}
          <div className="hidden sm:block h-6 w-full" />
        </div>
      ) : null}

      {/* Protected Unchanged PDF Modal Layout Component Structure */}
      {viewerPdf && viewerPost ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur-sm"
          onClick={closeViewer}
          role="presentation"
        >
          <div
            className="relative flex h-[calc(100vh-3rem)] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] bg-slate-950 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="presentation"
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {viewerPdf.fileName || "Class PDF"}
                </p>
                <p className="text-xs text-slate-300">{viewerPost.authorName || "Class admin"} · PDF preview</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>
                <button
                  type="button"
                  onClick={closeViewer}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/15"
                  aria-label="Close viewer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-slate-100 p-3 sm:p-4">
              <iframe
                src={buildAuthedUrl(viewerPdf.pdfUrl || viewerPdf.dataUrl || "")}
                title={viewerPdf.fileName || "Class PDF"}
                className="h-full w-full rounded-[20px] border-0 bg-white shadow-2xl"
              />
            </div>
          </div>
        </div>
      ) : null}
      
      {/* Hidden layout specific CSS overrides */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </main>
  );
}