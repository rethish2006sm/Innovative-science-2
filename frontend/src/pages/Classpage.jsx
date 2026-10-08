import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Download,
  FileText,
  Image as ImageIcon,
  NotebookPen,
  Sparkles,
  X,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { API_BASE_URL, apiRequest } from "../api";
import { authEvents, getStoredAuth } from "../authStorage";
import {
  getActiveScience,
  SCIENCE_CHANGED_EVENT,
  setActiveScience,
} from "../science";

const ALL_POST_CATEGORY = { id: "", label: "Menu pages" };

const CLASS_POST_CATEGORIES = [
  { id: "assignment", label: "Assignment" },
  { id: "practice-paper", label: "Practice Paper" },
  { id: "important-question", label: "Important Question" },
  { id: "chapter-marking", label: "Chapter Wise Marking" },
  { id: "notes", label: "Notes" },
  { id: "test-paper", label: "Test Paper" },
];

const CATEGORY_LABELS = CLASS_POST_CATEGORIES.reduce((acc, item) => {
  acc[item.id] = item.label;
  return acc;
}, {});

const EMPTY_CATEGORY_COUNTS = CLASS_POST_CATEGORIES.reduce((acc, item) => {
  acc[item.id] = 0;
  return acc;
}, {});

const MENU_CARD_META = {
  assignment: { icon: ClipboardList, description: "Tasks and homework", tone: "from-cyan-50 via-white to-white", iconTone: "bg-cyan-100 text-cyan-700", accent: "bg-cyan-500" },
  "practice-paper": { icon: ClipboardCheck, description: "Practice sets to improve", tone: "from-violet-50 via-white to-white", iconTone: "bg-violet-100 text-violet-700", accent: "bg-violet-500" },
  "important-question": { icon: Sparkles, description: "Questions worth revising", tone: "from-amber-50 via-white to-white", iconTone: "bg-amber-100 text-amber-700", accent: "bg-amber-500" },
  "chapter-marking": { icon: NotebookPen, description: "Chapter-wise focus areas", tone: "from-emerald-50 via-white to-white", iconTone: "bg-emerald-100 text-emerald-700", accent: "bg-emerald-500" },
  notes: { icon: NotebookPen, description: "Notes and references", tone: "from-sky-50 via-white to-white", iconTone: "bg-sky-100 text-sky-700", accent: "bg-sky-500" },
  "test-paper": { icon: FileText, description: "Exam-style question papers", tone: "from-rose-50 via-white to-white", iconTone: "bg-rose-100 text-rose-700", accent: "bg-rose-500" },
  default: { icon: FileText, description: "Classroom resources", tone: "from-indigo-50 via-white to-white", iconTone: "bg-indigo-100 text-indigo-700", accent: "bg-indigo-500" },
};

function getStoredToken() {
  return getStoredAuth()?.token || "";
}

function buildAuthedUrl(rawUrl, extras = {}) {
  if (!rawUrl) return "";

  if (rawUrl.startsWith("data:") || rawUrl.startsWith("blob:")) {
    return rawUrl;
  }

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
  return String(category || "assignment");
}

function formatDate(value) {
  if (!value) return "Recently";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getMaterialTitle(post) {
  if (post?.chapterName) return post.chapterName
  const messageTitle = String(post?.message || '').split('\n').map((line) => line.trim()).find(Boolean)
  return messageTitle || post?.documentName || post?.pdf?.fileName || 'Class material'
}

function getChapterNumber(post) {
  const title = getMaterialTitle(post)
  const match = String(title).match(/\b(?:chp|chapter)\s*[-.:#]?\s*(\d+)/i)
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY
}

export default function Classpage() {
  const { classId } = useParams();
  const navigate = useNavigate();

  const [activeCategory, setActiveCategory] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [categoryCounts, setCategoryCounts] = useState(
    EMPTY_CATEGORY_COUNTS
  );

  const [error, setError] = useState("");
  const [auth, setAuth] = useState(() => getStoredAuth());
  const [science, setScience] = useState(() => getActiveScience());

  const [menus, setMenus] = useState([]);
  const [reloadTick, setReloadTick] = useState(0);

  const [viewerPost, setViewerPost] = useState(null);
  const [viewerPhoto, setViewerPhoto] = useState(null);
  const [viewerPdf, setViewerPdf] = useState(null);
  const [isZoomed, setIsZoomed] = useState(false);

  /*
   * FILTER + SEARCH + SORT
   */
  const visiblePosts = useMemo(() => {
    if (!activeCategory) return [];

    const query = searchTerm.trim().toLowerCase();

    const filtered = posts.filter((post) => {
      const categoryMatches =
        normalizeCategory(post?.category) === activeCategory;

      if (!categoryMatches) {
        return false;
      }

      if (!query) {
        return true;
      }

      const categoryLabel =
        menus.find(
          (menu) =>
            menu.id === normalizeCategory(post?.category)
        )?.label ||
        CATEGORY_LABELS[normalizeCategory(post?.category)] ||
        "";

      const searchableText = [
        post?.message,
        post?.chapterName,
        post?.authorName,
        post?.pdf?.fileName,
        post?.pdf?.name,
        post?.documentName,
        categoryLabel,

        ...(Array.isArray(post?.photos)
          ? post.photos.map((photo) => photo?.fileName)
          : []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });

    return [...filtered].sort((a, b) => {
      const aChapter = getChapterNumber(a)
      const bChapter = getChapterNumber(b)

      if (aChapter !== bChapter) {
        return aChapter - bChapter
      }

      const aDate = new Date(
        a?.createdAt || a?.updatedAt || 0
      ).getTime();

      const bDate = new Date(
        b?.createdAt || b?.updatedAt || 0
      ).getTime();

      if (sortOrder === "oldest") {
        return aDate - bDate;
      }

      return bDate - aDate;
    });
  }, [
    posts,
    activeCategory,
    searchTerm,
    sortOrder,
    menus,
  ]);

  const categoryCountsWithAll = useMemo(
    () => ({
      ...categoryCounts,
      [ALL_POST_CATEGORY.id]: posts.length,
    }),
    [categoryCounts, posts.length]
  );

  /*
   * LOAD CLASS FEED
   */
  useEffect(() => {
    let cancelled = false;

    async function loadFeed() {
      if (!classId) {
        setPosts([]);
        setError("Class not found.");
        setLoading(false);
        return;
      }

      setError("");
      setLoading(true);

      try {
        const data = await apiRequest(
          `/api/classes/${classId}/feed?limit=all&category=all`
        );

        const nextPosts = Array.isArray(data?.posts)
          ? data.posts
          : [];

        if (!cancelled) {
          setPosts(nextPosts);

          setCategoryCounts(
            data?.categoryCounts || EMPTY_CATEGORY_COUNTS
          );

          setMenus(
            Array.isArray(data?.categories)
              ? data.categories
              : []
          );
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(
            fetchError?.message ||
              "Failed to load class posts."
          );

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
  }, [classId, reloadTick, science]);

  /*
   * AUTH SYNC
   */
  useEffect(() => {
    const syncAuth = () => {
      setAuth(getStoredAuth());
    };

    syncAuth();

    window.addEventListener(
      authEvents.changed,
      syncAuth
    );

    window.addEventListener(
      "storage",
      syncAuth
    );

    return () => {
      window.removeEventListener(
        authEvents.changed,
        syncAuth
      );

      window.removeEventListener(
        "storage",
        syncAuth
      );
    };
  }, []);

  /*
   * SCIENCE SUBJECT SYNC
   */
  useEffect(() => {
    const syncScience = () => {
      setScience(getActiveScience());
    };

    window.addEventListener(
      SCIENCE_CHANGED_EVENT,
      syncScience
    );

    return () => {
      window.removeEventListener(
        SCIENCE_CHANGED_EVENT,
        syncScience
      );
    };
  }, []);

  /*
   * CLASS ACCESS CONTROL
   */
  useEffect(() => {
    if (
      !auth?.user?.isAdmin &&
      auth?.user?.classId
    ) {
      if (
        String(auth.user.classId) !==
        String(classId)
      ) {
        navigate(
          `/class/${auth.user.classId}`,
          { replace: true }
        );
      }

      return;
    }

    if (
      !auth?.user?.isAdmin &&
      !auth?.user?.classId &&
      classId
    ) {
      navigate("/", { replace: true });
    }
  }, [
    auth?.user?.classId,
    auth?.user?.isAdmin,
    classId,
    navigate,
  ]);

  /*
   * LIVE FEED REFRESH
   */
  useEffect(() => {
    const refreshFeed = (event) => {
      const detailClassId = String(
        event?.detail?.classId || ""
      );

      if (
        !detailClassId ||
        detailClassId === String(classId)
      ) {
        setReloadTick(
          (current) => current + 1
        );
      }
    };

    window.addEventListener(
      "innovative-science-class-feed-updated",
      refreshFeed
    );

    return () => {
      window.removeEventListener(
        "innovative-science-class-feed-updated",
        refreshFeed
      );
    };
  }, [classId]);

  /*
   * VIEWER HELPERS
   */
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

  const openDocument = (post) => {
    const targetUrl = post?.documentLink
      ? post.documentLink
      : post?.pdf?.pdfUrl
        ? buildAuthedUrl(post.pdf.pdfUrl)
        : "";

    if (!targetUrl) {
      setError("Could not open this document.");
      return;
    }

    const anchor = document.createElement("a");

    anchor.href = targetUrl;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const handleDownload = () => {
    const downloadPath =
      viewerPhoto?.photoUrl ||
      viewerPdf?.pdfUrl;

    if (!downloadPath) {
      return;
    }

    const url = buildAuthedUrl(
      downloadPath,
      { download: 1 }
    );

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  };

  /*
   * CATEGORY LABEL
   */
  const currentCategoryLabel = !activeCategory
    ? "Class Materials"
    : menus.find(
        (menu) => menu.id === activeCategory
      )?.label ||
      CATEGORY_LABELS[activeCategory] ||
      activeCategory.replaceAll("-", " ");

  const emptyCategoryLabel =
    activeCategory === ALL_POST_CATEGORY.id
      ? "class material"
      : currentCategoryLabel.toLowerCase();

  /*
   * CHANGE CATEGORY
   */
  const changeCategory = (nextCategory) => {
    if (nextCategory === activeCategory) {
      return;
    }

    setActiveCategory(nextCategory);
    setSearchTerm("");
  };

  const openMaterial = (post) => {
    if (post?.documentLink || post?.pdf?.pdfUrl) {
      openDocument(post);
      return;
    }

    if (Array.isArray(post?.photos) && post.photos.length) {
      openPhotoViewer(post, post.photos[0]);
    }
  };

  /*
   * MENU ITEMS
   */
  const menuItems = menus.length
    ? menus
    : CLASS_POST_CATEGORIES.map(
        (category) => ({
          id: category.id,
          label: category.label,
          count:
            categoryCounts[category.id] || 0,
        })
      );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">

      {/* =====================================================
          BACKGROUND
      ====================================================== */}
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-0 h-72 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-72 w-[700px] max-w-[120vw] -translate-x-1/2 rounded-full bg-indigo-100/50 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-3 py-5 sm:px-5 sm:py-7 lg:px-8 lg:py-10">

        {/* =====================================================
            HEADER
        ====================================================== */}
        <header className="hidden mb-5 sm:mb-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

            <div className="min-w-0">

              <div className="hidden mb-2 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-3 py-1.5 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-indigo-600" />

                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-700">
                  Classroom
                </span>
              </div>

              <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl lg:text-4xl">
                {currentCategoryLabel}
              </h1>

              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
                Find your notes, assignments,
                practice papers and other class
                materials easily.
              </p>

              {activeCategory ? (
                <button
                  type="button"
                  onClick={() => changeCategory("")}
                  className="mt-3 inline-flex items-center rounded-xl border border-indigo-100 bg-white px-3 py-2 text-xs font-bold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
                >
                  ← Back to class materials
                </button>
              ) : null}

            </div>

            {/* Subject selection is handled by the global science switcher. */}
            <label className="hidden w-full gap-1.5 sm:w-auto">

              <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                Subject
              </span>

              <select
                value={science}
                onChange={(event) =>
                  setActiveScience(
                    event.target.value
                  )
                }
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 sm:min-w-[170px]"
              >
                <option value="science1">
                  Science 1
                </option>

                <option value="science2">
                  Science 2
                </option>
              </select>

            </label>
          </div>
        </header>

        {/* =====================================================
            CATEGORY FILTER
        ====================================================== */}
        <section className="hidden sticky top-2 z-30 mb-4 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur-xl sm:top-3 sm:mb-5">

          {/* MOBILE */}
          <div className="sm:hidden">

            <label className="grid gap-1">

              <span className="px-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                Material type
              </span>

              <select
                value={activeCategory}
                onChange={(event) =>
                  changeCategory(
                    event.target.value
                  )
                }
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-800 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              >
                <option value="">
                  Choose material type
                </option>

                {menuItems.map(
                  (category) => (
                    <option
                      key={category.id}
                      value={category.id}
                    >
                      {category.label} (
                      {category.count ??
                        categoryCountsWithAll[
                          category.id
                        ] ??
                        0}
                      )
                    </option>
                  )
                )}
              </select>

            </label>

          </div>

          {/* DESKTOP / TABLET */}
          <div className="hidden gap-1.5 overflow-x-auto no-scrollbar sm:flex sm:flex-wrap">

            {[
              ALL_POST_CATEGORY,
              ...menuItems,
            ].map((category) => {

              const active =
                activeCategory ===
                category.id;

              const count =
                category.id ===
                ALL_POST_CATEGORY.id
                  ? categoryCountsWithAll[
                      category.id
                    ] || 0
                  : category.count ??
                    categoryCountsWithAll[
                      category.id
                    ] ??
                    0;

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() =>
                    changeCategory(
                      category.id
                    )
                  }
                  className={[
                    "inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 sm:text-sm",

                    active
                      ? "bg-slate-950 text-white shadow-sm"
                      : "bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700",
                  ].join(" ")}
                >

                  <span>
                    {category.label}
                  </span>

                  <span
                    className={[
                      "min-w-5 rounded-full px-1.5 py-0.5 text-center text-[10px] font-black",

                      active
                        ? "bg-white/15 text-white"
                        : "bg-white text-slate-500 ring-1 ring-slate-200",
                    ].join(" ")}
                  >
                    {count}
                  </span>

                </button>
              );
            })}

          </div>
        </section>

        {activeCategory ? (
          <button
            type="button"
            onClick={() => changeCategory("")}
            aria-label="Back to class materials"
            className="mb-4 grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-lg font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            ←
          </button>
        ) : null}

        {/* =====================================================
            SEARCH + SORT
        ====================================================== */}
        {activeCategory ? (
          <section className="hidden mb-5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">

            <div className="flex flex-col gap-3 md:flex-row md:items-center">

              {/* SEARCH */}
              <div className="relative min-w-0 flex-1">

                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(
                      event.target.value
                    )
                  }
                  placeholder={`Search in ${currentCategoryLabel.toLowerCase()}...`}
                  aria-label="Search class materials"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-4 pr-10 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                />

                {searchTerm ? (
                  <button
                    type="button"
                    onClick={() =>
                      setSearchTerm("")
                    }
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}

              </div>

              {/* SORT */}
              <label className="flex items-center gap-2">

                <span className="hidden text-xs font-bold text-slate-500 sm:block">
                  Sort
                </span>

                <select
                  value={sortOrder}
                  onChange={(event) =>
                    setSortOrder(
                      event.target.value
                    )
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 sm:w-auto"
                >
                  <option value="newest">
                    Newest first
                  </option>

                  <option value="oldest">
                    Oldest first
                  </option>
                </select>

              </label>

            </div>

            {/* RESULT COUNT */}
            <div className="mt-2 flex items-center justify-between gap-3 px-1 text-xs text-slate-400">

              <span>
                {visiblePosts.length}{" "}
                {visiblePosts.length === 1
                  ? "item"
                  : "items"}

                {searchTerm
                  ? ` matching "${searchTerm}"`
                  : ""}
              </span>

              {searchTerm ? (
                <button
                  type="button"
                  onClick={() =>
                    setSearchTerm("")
                  }
                  className="font-bold text-indigo-600 hover:text-indigo-800"
                >
                  Clear search
                </button>
              ) : null}

            </div>

          </section>
        ) : null}

        {/* =====================================================
            ERROR
        ====================================================== */}
        {error ? (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">

            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-rose-500" />

            <p className="font-medium">
              {error}
            </p>

          </div>
        ) : null}

        {/* =====================================================
            LOADING
        ====================================================== */}
        {loading ? (

          <div className="grid gap-4 sm:grid-cols-2">

            {Array.from({
              length: 4,
            }).map((_, index) => (

              <div
                key={`class-skeleton-${index}`}
                className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
              >

                <div className="flex items-center gap-3">

                  <div className="h-10 w-10 rounded-full bg-slate-100" />

                  <div className="flex-1">

                    <div className="h-3 w-24 rounded-full bg-slate-100" />

                    <div className="mt-2 h-2.5 w-32 rounded-full bg-slate-100" />

                  </div>

                </div>

                <div className="mt-5 h-3 w-full rounded-full bg-slate-100" />

                <div className="mt-2 h-3 w-4/5 rounded-full bg-slate-100" />

                <div className="mt-5 grid grid-cols-2 gap-2">

                  <div className="aspect-square rounded-xl bg-slate-100" />

                  <div className="aspect-square rounded-xl bg-slate-100" />

                </div>

              </div>

            ))}

          </div>

        ) : !activeCategory ? (

          /* =====================================================
             MATERIAL CATEGORY CARDS
          ====================================================== */

          <section>

            <div className="hidden mb-3 flex items-center justify-between">

              <div>

                <h2 className="text-lg font-black text-slate-900 sm:text-xl">
                  Class materials
                </h2>

                <p className="text-xs text-slate-500 sm:text-sm">
                  Select what you want to study.
                </p>

              </div>

              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                {posts.length} total
              </span>

            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

              {menuItems.map((menu, index) => {
                const meta = MENU_CARD_META[menu.id] || MENU_CARD_META.default;
                const count = Number(menu.count || 0);

                return (

                <button
                  key={menu.id}
                  type="button"
                  onClick={() =>
                    changeCategory(menu.id)
                  }
                  className={`group relative min-h-[164px] overflow-hidden rounded-[1.35rem] border border-slate-200 bg-gradient-to-br ${meta.tone} p-5 text-left shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-[0_16px_32px_rgba(15,23,42,0.12)] active:translate-y-0 sm:p-6`}
                >

                  <span className={`absolute inset-x-0 top-0 h-1 ${meta.accent}`} />
                  <span className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/70 transition duration-300 group-hover:scale-125" />

                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${meta.iconTone} text-lg font-black shadow-sm`}>
                      {index + 1}
                    </span>
                    <h2 className="min-w-0 break-words text-base font-black text-slate-950 sm:text-lg">
                      {menu.label}
                    </h2>
                  </div>

                  <div className="mt-6 flex items-center justify-between gap-3">
                    <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-black text-slate-600 ring-1 ring-slate-200/70">
                      {count} {count === 1 ? "item" : "items"}
                    </span>
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-slate-500 shadow-sm transition group-hover:bg-slate-950 group-hover:text-white group-hover:translate-x-0.5">
                      →
                    </span>

                  </div>

                </button>

                );
              })}

            </div>

          </section>

        ) : visiblePosts.length === 0 ? (

          /* =====================================================
             EMPTY STATE
          ====================================================== */

          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center">

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">

              <CalendarDays className="h-6 w-6 text-slate-400" />

            </div>

            <h3 className="mt-4 text-base font-black text-slate-900">

              {searchTerm
                ? "No matching material"
                : "Nothing here yet"}

            </h3>

            <p className="mx-auto mt-1.5 max-w-sm text-sm leading-6 text-slate-500">

              {searchTerm
                ? "Try a different keyword or clear the search filter."
                : `No ${emptyCategoryLabel} entries are available right now.`}

            </p>

            {searchTerm ? (
              <button
                type="button"
                onClick={() =>
                  setSearchTerm("")
                }
                className="mt-5 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                Clear search
              </button>
            ) : null}

          </div>

        ) : (

          /* =====================================================
             MATERIAL FEED
          ====================================================== */

          <>
          <section className="mb-4 flex items-center justify-between rounded-2xl border border-indigo-100 bg-gradient-to-r from-white to-indigo-50/60 px-4 py-3.5 shadow-sm shadow-indigo-100/40 sm:px-5">
            <h1 className="text-lg font-black tracking-tight text-slate-950 sm:text-xl">{currentCategoryLabel}</h1>
            <span className="rounded-full bg-indigo-100/80 px-3 py-1 text-xs font-black text-indigo-700">
              {visiblePosts.length}
            </span>
          </section>

          <section className="space-y-3 sm:space-y-4">
            {visiblePosts.map((post) => (
              <button
                key={post._id || post.id}
                type="button"
                onClick={() => openMaterial(post)}
                className="group flex w-full items-center justify-between gap-3 overflow-hidden rounded-2xl border border-slate-200/80 bg-white px-4 py-4 text-left shadow-[0_3px_12px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50/40 hover:shadow-lg hover:shadow-indigo-100/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 sm:gap-4 sm:px-5 sm:py-5"
              >
                <span className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-100">
                    <FileText className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block whitespace-normal break-words text-sm font-bold leading-6 text-slate-800 sm:text-base sm:leading-7">
                      {getMaterialTitle(post)}
                    </span>
                    {post?.message ? (
                      <span className="mt-1.5 block whitespace-pre-wrap break-words text-xs font-medium leading-5 text-slate-500 sm:text-sm sm:leading-6">
                        {post.message}
                      </span>
                    ) : null}
                  </span>
                </span>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 transition duration-200 group-hover:border-indigo-600 group-hover:bg-indigo-600 group-hover:text-white">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </button>
            ))}
          </section>

          <section
            id="class-notes"
            className="hidden space-y-4"
          >

            {visiblePosts.map((post) => {

              const category =
                normalizeCategory(
                  post?.category
                );

              const photos =
                Array.isArray(
                  post?.photos
                )
                  ? post.photos
                  : [];

              const hasDocument =
                Boolean(
                  post?.documentLink ||
                    post?.pdf?.pdfUrl
                );

              const categoryLabel =
                menus.find(
                  (menu) =>
                    menu.id === category
                )?.label ||
                CATEGORY_LABELS[
                  category
                ] ||
                category.replaceAll(
                  "-",
                  " "
                );

              return (
                <article
                  key={
                    post._id ||
                    post.id
                  }
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md"
                  style={{
                    contentVisibility:
                      "auto",
                    containIntrinsicSize:
                      "1px 360px",
                  }}
                >

                  <div className="p-4 sm:p-5">

                    {/* POST HEADER */}
                    <div className="flex items-start gap-3">

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-black text-indigo-700 ring-1 ring-indigo-100">

                        {(post.authorName ||
                          "RS")
                          .substring(
                            0,
                            2
                          )
                          .toUpperCase()}

                      </div>

                      <div className="min-w-0 flex-1">

                        <div className="flex flex-wrap items-center gap-2">

                          <h4 className="truncate text-sm font-black text-slate-900">

                            {post.authorName ||
                              "Rethish Sir"}

                          </h4>

                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold capitalize text-slate-600">

                            {categoryLabel}

                          </span>

                        </div>

                        <p className="mt-0.5 text-xs font-medium text-slate-400">
                          {formatDate(
                            post.createdAt ||
                              post.updatedAt
                          )}
                        </p>

                      </div>

                    </div>

                    {/* MESSAGE */}
                    {post.message ? (
                      <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600 sm:text-[15px]">
                        {post.message}
                      </p>
                    ) : null}

                    {/* IMAGE GALLERY */}
                    {photos.length > 0 ? (

                      <div className="mt-4">

                        <div
                          className={[
                            "grid gap-2 overflow-hidden rounded-xl bg-slate-100 p-1.5",

                            photos.length === 1
                              ? "grid-cols-1"
                              : photos.length === 2
                                ? "grid-cols-2"
                                : "grid-cols-2 sm:grid-cols-3",
                          ].join(" ")}
                        >

                          {photos.map(
                            (
                              photo,
                              index
                            ) => {

                              const src =
                                photo?.thumbUrl
                                  ? buildAuthedUrl(
                                      photo.thumbUrl
                                    )
                                  : photo?.photoUrl
                                    ? buildAuthedUrl(
                                        photo.photoUrl
                                      )
                                    : "";

                              const alt =
                                photo?.fileName ||
                                `Attachment ${
                                  index + 1
                                }`;

                              const isLargeSpan =
                                photos.length ===
                                  3 &&
                                index === 0;

                              return (
                                <button
                                  key={
                                    photo?._id ||
                                    photo?.id ||
                                    `${
                                      post._id ||
                                      post.id
                                    }-photo-${index}`
                                  }
                                  type="button"
                                  onClick={() =>
                                    openPhotoViewer(
                                      post,
                                      photo
                                    )
                                  }
                                  className={[
                                    "group/item relative overflow-hidden rounded-lg bg-slate-200 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",

                                    isLargeSpan
                                      ? "col-span-2 aspect-[16/10] sm:col-span-1 sm:aspect-square"
                                      : "aspect-square",
                                  ].join(" ")}
                                >

                                  {src ? (

                                    <img
                                      src={src}
                                      alt={alt}
                                      className="h-full w-full object-cover transition duration-300 group-hover/item:scale-105"
                                      loading="lazy"
                                      decoding="async"
                                    />

                                  ) : (

                                    <div className="flex h-full w-full items-center justify-center text-slate-400">

                                      <ImageIcon className="h-6 w-6" />

                                    </div>

                                  )}

                                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950/25 opacity-0 transition group-hover/item:opacity-100">

                                    <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-900 shadow-sm">
                                      View
                                    </span>

                                  </div>

                                </button>
                              );
                            }
                          )}

                        </div>

                      </div>

                    ) : null}

                    {/* DOCUMENT */}
                    {hasDocument ? (

                      <div className="mt-4 border-t border-slate-100 pt-4">

                        <button
                          type="button"
                          onClick={() =>
                            openDocument(
                              post
                            )
                          }
                          className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50 active:scale-[0.99] sm:w-auto sm:min-w-[230px]"
                        >

                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-rose-500 shadow-sm ring-1 ring-slate-200">

                            <FileText className="h-4 w-4" />

                          </span>

                          <span className="min-w-0 flex-1">

                            <span className="block truncate text-sm font-bold text-slate-800">

                              {post?.pdf?.fileName ||
                                post?.documentName ||
                                "Class document"}

                            </span>

                            <span className="block text-[11px] font-medium text-slate-400">
                              Open document
                            </span>

                          </span>

                          <span className="text-sm font-black text-indigo-600">
                            →
                          </span>

                        </button>

                      </div>

                    ) : null}

                  </div>

                </article>
              );
            })}

          </section>
          </>
        )}

      </div>

      {/* =====================================================
          PHOTO VIEWER
      ====================================================== */}
      {viewerPhoto &&
      viewerPost ? (

        <div
          className="fixed inset-0 z-50 flex flex-col bg-white sm:bg-slate-950/95 sm:p-4"
          onClick={closeViewer}
          role="presentation"
        >

          <div
            className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 py-3 sm:mx-auto sm:w-full sm:max-w-7xl sm:border-0 sm:bg-transparent sm:px-0"
            onClick={(event) =>
              event.stopPropagation()
            }
            role="presentation"
          >

            <div className="min-w-0">

              <p className="truncate text-sm font-black text-slate-900 sm:text-white">
                {viewerPhoto.fileName ||
                  "Attachment"}
              </p>

              <p className="truncate text-xs text-slate-500 sm:text-slate-400">
                {viewerPost.authorName ||
                  "Class admin"}
              </p>

            </div>

            <div className="flex shrink-0 items-center gap-2">

              <button
                type="button"
                onClick={
                  handleDownload
                }
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-100 px-3 text-xs font-bold text-slate-800 hover:bg-slate-200 sm:bg-white/10 sm:text-white sm:hover:bg-white/20"
              >

                <Download className="h-4 w-4" />

                <span className="hidden sm:inline">
                  Download
                </span>

              </button>

              <button
                type="button"
                onClick={closeViewer}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-800 hover:bg-slate-200 sm:bg-white/10 sm:text-white sm:hover:bg-white/20"
                aria-label="Close viewer"
              >
                <X className="h-5 w-5" />
              </button>

            </div>

          </div>

          <div
            className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-3 sm:p-5"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <button
              type="button"
              onClick={() =>
                setIsZoomed(
                  (value) => !value
                )
              }
              className="max-w-full outline-none"
              aria-label="Toggle image zoom"
            >

              <img
                src={buildAuthedUrl(
                  viewerPhoto.photoUrl ||
                    ""
                )}
                alt={
                  viewerPhoto.fileName ||
                  "Class photo"
                }
                className={[
                  "max-h-[82vh] max-w-full rounded-xl object-contain shadow-2xl transition-transform duration-300 sm:max-h-[86vh]",

                  isZoomed
                    ? "scale-125 cursor-zoom-out sm:scale-150"
                    : "cursor-zoom-in",
                ].join(" ")}
                loading="eager"
                decoding="async"
              />

            </button>

          </div>

        </div>

      ) : null}

      {/* =====================================================
          PDF VIEWER
      ====================================================== */}
      {viewerPdf &&
      viewerPost ? (

        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-2 backdrop-blur-sm sm:p-5"
          onClick={closeViewer}
          role="presentation"
        >

          <div
            className="relative flex h-[calc(100vh-1rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-slate-950 shadow-2xl sm:h-[calc(100vh-2.5rem)] sm:rounded-3xl"
            onClick={(event) =>
              event.stopPropagation()
            }
            role="presentation"
          >

            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-3 sm:px-5">

              <div className="min-w-0">

                <p className="truncate text-sm font-bold text-white">
                  {viewerPdf.fileName ||
                    "Class PDF"}
                </p>

                <p className="text-xs text-slate-400">
                  PDF preview
                </p>

              </div>

              <div className="flex shrink-0 items-center gap-2">

                <button
                  type="button"
                  onClick={
                    handleDownload
                  }
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-white/10 px-3 text-xs font-bold text-white hover:bg-white/20"
                >

                  <Download className="h-4 w-4" />

                  <span className="hidden sm:inline">
                    Download
                  </span>

                </button>

                <button
                  type="button"
                  onClick={closeViewer}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20"
                  aria-label="Close PDF viewer"
                >
                  <X className="h-5 w-5" />
                </button>

              </div>

            </div>

            <div className="min-h-0 flex-1 bg-slate-100 p-2 sm:p-4">

              <iframe
                src={buildAuthedUrl(
                  viewerPdf.pdfUrl ||
                    ""
                )}
                title={
                  viewerPdf.fileName ||
                  "Class PDF"
                }
                className="h-full w-full rounded-xl border-0 bg-white shadow-xl sm:rounded-2xl"
              />

            </div>

          </div>

        </div>

      ) : null}

      {/* =====================================================
          SMALL CSS HELPERS
      ====================================================== */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }

        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        input[type="search"]::-webkit-search-cancel-button {
          -webkit-appearance: none;
          appearance: none;
        }
      `}</style>

    </main>
  );
}
