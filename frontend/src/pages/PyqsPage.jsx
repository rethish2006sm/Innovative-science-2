import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  FileText,
  Loader2,
  ShieldCheck,
  Trash2,
  UploadCloud,
  CalendarDays,
  Link2,
  Sparkles,
  FolderOpen,
  GraduationCap,
  ChevronRight,
  Layers3,
} from "lucide-react";

import { apiRequest, assetUrl } from "../api";
import { authEvents, getStoredAuth } from "../authStorage";
import { getActiveScience, SCIENCE_CHANGED_EVENT } from "../science";

const MONTH_OPTIONS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const initialUploadForm = {
  month: "",
  year: "",
  link: "",
};

const PyqsPage = () => {
  const navigate = useNavigate();

  const [auth, setAuth] = useState(() => getStoredAuth());
  const [science, setScience] = useState(() => getActiveScience());

  const [pyqs, setPyqs] = useState([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedPyqId, setSelectedPyqId] = useState("");
  const selectedYearRef = useRef("");

  const [uploadForm, setUploadForm] = useState(initialUploadForm);

  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const scienceLabel = science === "science1" ? "Science 1" : "Science 2";

  const selectedPyq = pyqs.find((item) => item.id === selectedPyqId) || null;

  useEffect(() => {
    selectedYearRef.current = selectedYear;
  }, [selectedYear]);

  useEffect(() => {
    window.history.pushState(
      { ...(window.history.state || {}), pyqPage: true },
      "",
      window.location.href,
    );

    const handleBrowserBack = () => {
      if (selectedYearRef.current) {
        setSelectedYear("");
        setSelectedPyqId("");
        setError("");
        return;
      }

      navigate("/", { replace: true });
    };

    window.addEventListener("popstate", handleBrowserBack);

    return () => {
      window.removeEventListener("popstate", handleBrowserBack);
    };
  }, [navigate]);

  // --------------------------------------------------
  // YEAR DATA
  // --------------------------------------------------

  const yearGroups = useMemo(() => {
    const groups = new Map();

    pyqs.forEach((pyq) => {
      const year = String(pyq.year || "").trim();

      if (!year) return;

      if (!groups.has(year)) {
        groups.set(year, []);
      }

      groups.get(year).push(pyq);
    });

    return [...groups.entries()]
      .map(([year, papers]) => ({
        year,
        papers,
        count: papers.length,
      }))
      .sort((a, b) => Number(b.year) - Number(a.year));
  }, [pyqs]);

  // --------------------------------------------------
  // MONTH GROUPS
  // --------------------------------------------------

  const monthGroups = useMemo(() => {
    if (!selectedYear) return [];

    const yearPapers = pyqs.filter(
      (pyq) => String(pyq.year || "").trim() === selectedYear,
    );

    const groups = MONTH_OPTIONS.map((month) => ({
      month,
      papers: yearPapers.filter(
        (pyq) => String(pyq.month || "").trim() === month,
      ),
    })).filter((group) => group.papers.length > 0);

    const withoutMonth = yearPapers.filter(
      (pyq) => !MONTH_OPTIONS.includes(String(pyq.month || "").trim()),
    );

    if (withoutMonth.length) {
      groups.push({
        month: "Other Papers",
        papers: withoutMonth,
      });
    }

    return groups;
  }, [pyqs, selectedYear]);

  const totalYearPapers = monthGroups.reduce(
    (total, group) => total + group.papers.length,
    0,
  );

  // --------------------------------------------------
  // AUTH SYNC
  // --------------------------------------------------

  useEffect(() => {
    const syncAuth = () => setAuth(getStoredAuth());

    syncAuth();

    window.addEventListener(authEvents.changed, syncAuth);
    window.addEventListener("storage", syncAuth);

    return () => {
      window.removeEventListener(authEvents.changed, syncAuth);
      window.removeEventListener("storage", syncAuth);
    };
  }, []);

  // --------------------------------------------------
  // SCIENCE SYNC
  // --------------------------------------------------

  useEffect(() => {
    const syncScience = () => {
      setScience(getActiveScience());
      setSelectedYear("");
      setSelectedPyqId("");
      window.history.replaceState(
        { ...(window.history.state || {}), pyqPage: true },
        "",
        window.location.href,
      );
    };

    window.addEventListener(SCIENCE_CHANGED_EVENT, syncScience);

    return () => {
      window.removeEventListener(SCIENCE_CHANGED_EVENT, syncScience);
    };
  }, []);

  // --------------------------------------------------
  // LOAD PYQS
  // --------------------------------------------------

  useEffect(() => {
    const loadPyqs = async () => {
      setIsLoading(true);
      setError("");

      try {
        const data = await apiRequest("/api/pyqs");
        const nextPyqs = data.pyqs || [];

        setPyqs(nextPyqs);
        setSelectedPyqId((current) => {
          if (nextPyqs.some((item) => item.id === current)) {
            return current;
          }

          return "";
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadPyqs();
  }, [auth?.token, science]);

  // --------------------------------------------------
  // UPLOAD FORM
  // --------------------------------------------------

  const handleUploadChange = (field, value) => {
    setUploadForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  // --------------------------------------------------
  // UPLOAD
  // EXISTING LOGIC PRESERVED
  // --------------------------------------------------

  const handleUpload = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");
    setIsUploading(true);

    try {
      const data = await apiRequest("/api/admin/pyqs", {
        method: "POST",
        body: JSON.stringify({
          month: uploadForm.month,
          year: uploadForm.year,
          link: uploadForm.link,
        }),
      });

      setMessage(data.message || "PYQ link saved successfully.");
      setUploadForm(initialUploadForm);

      const refreshed = await apiRequest("/api/pyqs");
      const nextPyqs = refreshed.pyqs || [];

      setPyqs(nextPyqs);

      const uploadedId = data.pyq?.id || "";

      if (uploadedId) {
        const uploadedPaper = nextPyqs.find((item) => item.id === uploadedId);

        if (uploadedPaper) {
          setSelectedYear(String(uploadedPaper.year || ""));
          setSelectedPyqId(uploadedId);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // --------------------------------------------------
  // URL
  // --------------------------------------------------

  const buildPyqUrl = (pyq) => {
    if (!auth?.token || !auth?.user) {
      return null;
    }

    const rawUrl = pyq.linkUrl || pyq.pdfUrl || "";

    if (!rawUrl) return "";

    const resolvedUrl = assetUrl(rawUrl);
    const url = new URL(resolvedUrl);

    url.searchParams.set("token", auth.token);

    return url.toString();
  };

  // --------------------------------------------------
  // OPEN PAPER
  // --------------------------------------------------

  const openPyqLink = (pyq) => {
    const url = buildPyqUrl(pyq);

    if (url === null) {
      navigate("/signin");
      return;
    }

    if (!url) {
      setError("This PYQ does not have a link yet.");
      return;
    }

    setError("");
    setSelectedPyqId(pyq.id);

    window.open(url, "_blank", "noopener,noreferrer");
  };

  // --------------------------------------------------
  // DELETE
  // EXISTING LOGIC PRESERVED
  // --------------------------------------------------

  const deletePyq = async (pyq) => {
    if (!window.confirm(`Delete "${pyq.title}"?`)) {
      return;
    }

    try {
      await apiRequest(`/api/admin/pyqs/${pyq.id}`, {
        method: "DELETE",
      });

      const refreshed = await apiRequest("/api/pyqs");
      const nextPyqs = refreshed.pyqs || [];

      setPyqs(nextPyqs);

      setSelectedPyqId((current) => (current === pyq.id ? "" : current));

      if (
        !nextPyqs.some(
          (item) => String(item.year || "").trim() === selectedYear,
        )
      ) {
        setSelectedYear("");
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // --------------------------------------------------
  // SELECT YEAR
  // --------------------------------------------------

  const selectYear = (year) => {
    setSelectedYear(year);
    setSelectedPyqId("");
    setError("");
    setMessage("");

    window.history.pushState(
      { ...(window.history.state || {}), pyqPage: true, pyqYear: year },
      "",
      window.location.href,
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const goBackToYears = () => {
    if (selectedYearRef.current && window.history.state?.pyqYear) {
      window.history.back();
      return;
    }

    setSelectedYear("");
    setSelectedPyqId("");
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // --------------------------------------------------
  // FIELD COMPONENT
  // --------------------------------------------------

  const Field = ({
    label,
    value,
    onChange,
    placeholder,
    asSelect = false,
    children,
  }) => (
    <label className="grid gap-2 text-xs font-bold text-slate-600">
      {label}

      {asSelect ? (
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/10"
        >
          {children}
        </select>
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder || `Enter ${label.toLowerCase()}`}
          className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/10"
        />
      )}
    </label>
  );

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <section className="min-h-screen bg-[#f7f9fc] px-3 py-4 sm:px-6 sm:py-7 lg:px-10">
      <div className="mx-auto max-w-7xl">
        {/* MAIN CONTAINER */}

        <div className="overflow-hidden rounded-[1.75rem] border border-slate-300/80 bg-white shadow-[0_20px_70px_rgba(15,23,42,0.06)]">
          {/* ADMIN UPLOAD */}
          {/* EXISTING UPLOAD FUNCTIONALITY PRESERVED */}

          {auth?.user?.isAdmin && (
            <div className="border-y border-slate-100 bg-slate-50/70 px-4 py-6 sm:px-8 sm:py-8 lg:px-12">
              <form
                onSubmit={handleUpload}
                className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm sm:p-7"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-cyan-50 text-cyan-700">
                    <UploadCloud className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="text-lg font-black text-slate-950">
                      Add a new PYQ
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Save a question paper link for students in {scienceLabel}.
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_2fr]">
                  <Field
                    label="Month"
                    asSelect
                    value={uploadForm.month}
                    onChange={(value) => handleUploadChange("month", value)}
                  >
                    <option value="">Select month</option>
                    {MONTH_OPTIONS.map((month) => (
                      <option key={month} value={month}>
                        {month}
                      </option>
                    ))}
                  </Field>

                  <Field
                    label="Year"
                    value={uploadForm.year}
                    onChange={(value) => handleUploadChange("year", value)}
                    placeholder="2026"
                  />

                  <Field
                    label="PDF / Drive link"
                    value={uploadForm.link}
                    onChange={(value) => handleUploadChange("link", value)}
                    placeholder="Paste PDF or Google Drive link"
                  />
                </div>

                <div className="mt-4 flex items-start gap-3 rounded-xl border border-cyan-100 bg-cyan-50/70 p-4">
                  <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600" />
                  <p className="text-xs leading-5 text-cyan-900">
                    Links can be hosted PDFs, Google Drive files, or other pages
                    students should open.
                  </p>
                </div>

                {message && (
                  <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
                    <ShieldCheck className="h-4 w-4" />
                    {message}
                  </div>
                )}

                {error && (
                  <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-bold text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isUploading}
                  className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UploadCloud className="h-4 w-4" />
                  )}
                  {isUploading ? "Saving..." : "Save PYQ link"}
                </button>
              </form>
            </div>
          )}

          {/* CONTENT */}

          <div className="px-4 py-6 sm:px-8 sm:py-9 lg:px-12">
            {/* ERROR */}

            {error && !auth?.user?.isAdmin && (
              <div className="mb-5 rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}

            {/* LOADING */}

            {isLoading ? (
              <div className="flex min-h-64 flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-cyan-600" />
                <p className="mt-4 text-sm font-bold text-slate-500">
                  Loading question papers...
                </p>
              </div>
            ) : pyqs.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                <FolderOpen className="h-10 w-10 text-slate-300" />
                <h3 className="mt-4 font-black text-slate-700">
                  No PYQs available yet
                </h3>
                <p className="mt-2 text-sm text-slate-400">
                  Previous year question papers will appear here once added.
                </p>
              </div>
            ) : !selectedYear ? (
              /* ==========================================
                 PAGE 1: YEAR SELECTION
              ========================================== */

              <div>
                <div className="mb-7">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-700">
                    <CalendarDays className="h-4 w-4" />
                    Browse archive
                  </div>

                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                    Select examination year
                  </h2>

                  <p className="mt-2 text-sm text-slate-500">
                    Choose a year to explore its available question papers.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                  {yearGroups.map((group) => (
                    <button
                      key={group.year}
                      type="button"
                      onClick={() => selectYear(group.year)}
                      className="group relative overflow-hidden rounded-2xl border border-slate-300 bg-white p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:border-cyan-300 hover:shadow-[0_14px_35px_rgba(6,182,212,0.12)] active:scale-[0.98] sm:p-5"
                    >
                      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-cyan-50 transition-transform duration-300 group-hover:scale-150" />

                      <div className="relative">
                        <div className="flex items-center justify-between">
                          <div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-50 text-cyan-700 transition group-hover:bg-cyan-100">
                            <GraduationCap className="h-5 w-5" />
                          </div>

                          <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-cyan-600" />
                        </div>

                        <h3 className="mt-5 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                          {group.year}
                        </h3>

                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {group.count} {group.count === 1 ? "paper" : "papers"}
                        </p>

                        <div className="mt-4 h-1 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full w-full origin-left rounded-full bg-cyan-500 transition-transform duration-500 group-hover:scale-x-105" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* ==========================================
                 PAGE 2: MONTH-WISE PAPERS
              ========================================== */

              <div>
                {/* TOP NAVIGATION */}

                <div className="mb-7">
                  <button
                    type="button"
                    onClick={goBackToYears}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-600 shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-800"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    All years
                  </button>

                  <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-700">
                        <CalendarDays className="h-4 w-4" />
                        Examination archive
                      </div>

                      <h2 className="mt-2 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                        {selectedYear}
                      </h2>

                      <p className="mt-2 text-sm text-slate-500">
                        Previous year question papers
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-start rounded-xl border border-cyan-100 bg-cyan-50 px-4 py-3 sm:self-auto">
                      <Layers3 className="h-5 w-5 text-cyan-700" />
                      <div>
                        <p className="text-lg font-black leading-none text-cyan-950">
                          {totalYearPapers}
                        </p>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-cyan-700">
                          Papers
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* MONTH SECTIONS */}

                {monthGroups.length ? (
                  <div className="space-y-7">
                    {monthGroups.map((group, index) => (
                      <section
                        key={group.month}
                        className="overflow-hidden rounded-2xl border border-slate-300 bg-white"
                      >
                        {/* MONTH HEADER */}

                        <div className="flex items-center justify-between gap-3 border-b border-cyan-100 bg-gradient-to-r from-cyan-50 to-white px-4 py-4 sm:px-6">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-cyan-700 shadow-sm ring-1 ring-cyan-100">
                              <CalendarDays className="h-5 w-5" />
                            </div>

                            <div className="min-w-0">
                              <h3 className="truncate text-base font-black text-slate-950 sm:text-lg">
                                {group.month}
                              </h3>

                              <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                                {selectedYear} · Month {index + 1}
                              </p>
                            </div>
                          </div>

                          <span className="shrink-0 rounded-full border border-cyan-200 bg-white px-3 py-1.5 text-[10px] font-black text-cyan-800 sm:text-xs">
                            {group.papers.length}{" "}
                            {group.papers.length === 1 ? "Paper" : "Papers"}
                          </span>
                        </div>

                        {/* PAPERS */}

                        <div className="divide-y divide-slate-100">
                          {group.papers.map((pyq) => {
                            const isActive = pyq.id === selectedPyqId;

                            return (
                              <article
                                key={pyq.id}
                                className={`group flex items-center gap-3 px-4 py-4 transition sm:gap-4 sm:px-6 ${
                                  isActive
                                    ? "bg-cyan-50/50"
                                    : "hover:bg-slate-50"
                                }`}
                              >
                                {/* PDF ICON */}

                                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-rose-100 bg-rose-50 text-rose-600 sm:h-12 sm:w-12">
                                  <FileText className="h-5 w-5" />
                                </div>

                                {/* TITLE */}

                                <button
                                  type="button"
                                  onClick={() => openPyqLink(pyq)}
                                  className="min-w-0 flex-1 text-left"
                                >
                                  <h4 className="truncate text-sm font-black text-slate-900 transition group-hover:text-cyan-800 sm:text-base">
                                    {pyq.title}
                                  </h4>

                                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium text-slate-500">
                                    {pyq.subject && <span>{pyq.subject}</span>}

                                    <span>{group.month}</span>
                                    <span>•</span>
                                    <span>{selectedYear}</span>
                                  </div>
                                </button>

                                {/* OPEN */}

                                <button
                                  type="button"
                                  onClick={() => openPyqLink(pyq)}
                                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-950 text-white transition hover:bg-cyan-700 sm:flex sm:w-auto sm:gap-2 sm:px-4"
                                  aria-label={`Open ${pyq.title}`}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                  <span className="hidden text-xs font-bold sm:inline">
                                    Open
                                  </span>
                                </button>

                                {/* DELETE */}

                                {auth?.user?.isAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => deletePyq(pyq)}
                                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-red-100 bg-white text-red-500 transition hover:bg-red-50 hover:text-red-700"
                                    aria-label={`Delete ${pyq.title}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </article>
                            );
                          })}
                        </div>
                      </section>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                    <FileText className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-3 text-sm font-bold text-slate-600">
                      No papers found for this year.
                    </p>
                  </div>
                )}

                {/* BOTTOM NAVIGATION */}

                <button
                  type="button"
                  onClick={goBackToYears}
                  className="mt-7 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-800 sm:w-auto sm:px-5"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to all years
                </button>
              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}

        <div className="flex items-center justify-center gap-2 py-6 text-[10px] font-black uppercase tracking-[0.22em] text-slate-300">
          <Sparkles className="h-3 w-3" />
          {scienceLabel} • PYQs
        </div>
      </div>
    </section>
  );
};

export default PyqsPage;
