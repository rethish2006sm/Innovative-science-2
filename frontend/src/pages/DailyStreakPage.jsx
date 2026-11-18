import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  Download,
  Flame,
  Gift,
  History,
  Home,
  KeyRound,
  LockKeyhole,
  RefreshCw,
  Sparkles,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { apiRequest, assetUrl } from "../api";
import logo from "../assets/logo.svg";
import signature from "../assets/rethish_sign-removebg-preview.png";
import { getStoredAuth } from "../authStorage";
import LoadingState from "../components/LoadingState";

const dailyHistoryDateLabel = (localDate) => {
  const date = new Date(`${localDate}T00:00:00`);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (left, right) =>
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate();

  if (sameDay(date, today)) return "Today";
  if (sameDay(date, yesterday)) return "Yesterday";
  return localDate;
};

const DailyStreakPage = ({ dailyPracticePage = false }) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const showDailyStreakBottomNav =
    pathname === "/daily-streak" && !dailyPracticePage;
  const [data, setData] = useState(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [revealedDailyAnswers, setRevealedDailyAnswers] = useState({});
  const [showPracticeQuestions, setShowPracticeQuestions] = useState(false);
  const [expandedPracticeQuestion, setExpandedPracticeQuestion] =
    useState(null);
  const [previewPracticeImage, setPreviewPracticeImage] = useState(null);
  const [downloadingPracticeImage, setDownloadingPracticeImage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [claimingFiftyDayKey, setClaimingFiftyDayKey] = useState(false);
  const [showFiftyReward, setShowFiftyReward] = useState(false);
  const [fiftyRewardCount, setFiftyRewardCount] = useState(0);
  const [fiftyKeyVisible, setFiftyKeyVisible] = useState(false);
  const [showHundredReward, setShowHundredReward] = useState(false);
  const [hundredRewardCount, setHundredRewardCount] = useState(0);
  const [hundredRewardVisible, setHundredRewardVisible] = useState(false);
  const [selectedHundredGiftId, setSelectedHundredGiftId] = useState(null);
  const [hundredTermsVisible, setHundredTermsVisible] = useState(false);
  const [hundredTermsAtBottom, setHundredTermsAtBottom] = useState(false);
  const [hundredTermsAccepted, setHundredTermsAccepted] = useState(false);
  const hundredTermsScrollRef = useRef(null);
  const [claimingHundredReward, setClaimingHundredReward] = useState(false);
  const [claimedHundredGift, setClaimedHundredGift] = useState(null);
  const [downloadingGiftLetter, setDownloadingGiftLetter] = useState(false);
  const [hundredClaimNotice, setHundredClaimNotice] = useState(null);
  const [hundredSkyShotKey, setHundredSkyShotKey] = useState(null);
  const hundredVisitCelebrationShown = useRef(false);
  const [hundredClaimMessage, setHundredClaimMessage] = useState("");
  const [celebrating, setCelebrating] = useState(false);
  const [streakCelebration, setStreakCelebration] = useState(null);
  const [previewStreakImage, setPreviewStreakImage] = useState(false);
  const [showStreakCertificate, setShowStreakCertificate] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyDetail, setHistoryDetail] = useState(null);
  const [historyDetailLoading, setHistoryDetailLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError("");

    try {
      const challengeData = await apiRequest("/api/daily-challenge", {
        cache: "no-store",
      });

      setData(challengeData);

      const questions = challengeData.challenge?.questions || [];
      if (
        dailyPracticePage &&
        challengeData.challenge?.status === "completed"
      ) {
        setShowPracticeQuestions(true);
      }
      const next = questions.findIndex((question) => !question.submitted);

      setIndex(next >= 0 ? next : Math.max(questions.length - 1, 0));
      setSelected(null);
      setFeedback(null);
    } catch (loadError) {
      setError(loadError.message || "Unable to load your daily challenge.");
    } finally {
      setLoading(false);
    }
  }, []);

  const openHistory = async () => {
    setShowHistory(true);
    setHistoryError("");
    setHistoryLoading(true);
    try {
      const result = await apiRequest("/api/daily-challenge/history", { cache: "no-store" });
      setHistory(result.challenges || []);
    } catch (historyLoadError) {
      setHistoryError(historyLoadError.message || "Could not load your history.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const openHistoryDetail = async (historyItem) => {
    setHistoryDetailLoading(true);
    setHistoryError("");
    try {
      const detail = await apiRequest(`/api/daily-challenge/history/${historyItem._id}`, { cache: "no-store" });
      setHistoryDetail(detail);
    } catch (detailError) {
      setHistoryError(detailError.message || "Could not load the selected challenge.");
    } finally {
      setHistoryDetailLoading(false);
    }
  };

  useEffect(() => {
    // Initial data loading intentionally hydrates local UI state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const challenge = data?.challenge;
  const streak = data?.streak || {
    currentStreak: 0,
    longestStreak: 0,
  };

  const questions = challenge?.questions || [];
  const question = questions[index];
  const selectedHundredGift = (challenge?.streakGifts || []).find((gift) => gift.id === selectedHundredGiftId);
  const streakCountedToday = Boolean(
    challenge?.status === "completed" &&
      challenge?.streakQualified &&
      String(streak?.lastCreditedDate || "") === String(challenge?.localDate || ""),
  );
  const fiftyDayKeyClaimed = Boolean(
    (streak?.rewardClaims || []).some(
      (claim) => String(claim.localDate) === "milestone-50" && claim.type === "restore-key",
    ),
  );

  const preventQuestionCapture = (event) => {
    event.preventDefault();
  };

  const progress = challenge?.questionCount
    ? Math.round((challenge.attemptedCount / challenge.questionCount) * 100)
    : 0;

  const activeFeedback =
    feedback ||
    (question?.submitted
      ? {
          isCorrect: question.isCorrect,
          solution: question.solution || "",
        }
      : null);

  const activeSelection = selected ?? question?.selectedAnswer ?? null;

  const goToQuestion = (nextIndex) => {
    if (
      nextIndex < 0 ||
      nextIndex >= questions.length ||
      submitting ||
      finishing
    ) {
      return;
    }

    setIndex(nextIndex);
    setSelected(null);
    setFeedback(null);
    setError("");
    window.setTimeout(() => {
      document.getElementById("daily-question-panel")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
  };

  const submit = async (selectionOverride = null) => {
    const selectedAnswer = selectionOverride ?? activeSelection;

    if (selectedAnswer === null || !question || activeFeedback || submitting) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const result = await apiRequest(
        `/api/daily-challenge/${challenge.id}/answer`,
        {
          method: "POST",
          body: JSON.stringify({
            questionId: question._id,
            selectedAnswer,
          }),
        },
      );

      const nextQuestions = challenge.questions.map((item) =>
        item._id === question._id
          ? {
              ...item,
              submitted: true,
              selectedAnswer,
              isCorrect: result.isCorrect,
              solution: result.solution || item.solution,
            }
          : item,
      );

      setData((previous) => ({
        ...previous,
        challenge: {
          ...previous.challenge,
          questions: nextQuestions,
          attemptedCount: result.attemptedCount,
          correctCount: result.correctCount,
          score: result.score,
        },
      }));

      setFeedback(result);
    } catch (submitError) {
      setError(
        submitError.message || "Could not submit your answer. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const finish = async () => {
    if (finishing) return;

    setFinishing(true);
    setError("");

    try {
      const completedData = await apiRequest(
        `/api/daily-challenge/${challenge.id}/complete`,
        {
          method: "POST",
          body: "{}",
        },
      );

      const streakQualified = Boolean(completedData.challenge?.streakQualified);
      setCelebrating(streakQualified);
      setStreakCelebration({
        from: streak.manualBreakDate === challenge.localDate
          ? Number(streak.streakBeforeBreak || 0)
          : Number(streak.currentStreak || 0),
        to: Number(
          completedData.streak?.currentStreak ??
            (streakQualified ? Number(streak.currentStreak || 0) + 1 : 0),
        ),
        qualified: streakQualified,
      });
      await load(false);
    } catch (finishError) {
      setError(finishError.message || "Unable to complete your challenge.");
    } finally {
      setFinishing(false);
    }
  };

  const restoreBrokenStreak = async () => {
    if (restoring) return;
    setRestoring(true);
    setError("");
    try {
      await apiRequest("/api/daily-streak/restore", {
        method: "POST",
        body: "{}",
      });
      await load(false);
    } catch (restoreError) {
      setError(restoreError.message || "Could not restore your streak.");
    } finally {
      setRestoring(false);
    }
  };

  const claimFiftyDayKey = async () => {
    if (claimingFiftyDayKey || Number(streak?.currentStreak || 0) < 50 || fiftyDayKeyClaimed) return false;
    setClaimingFiftyDayKey(true);
    setError("");
    try {
      const result = await apiRequest("/api/daily-streak/milestone-50/claim", {
        method: "POST",
        body: "{}",
      });
      setData((previous) => ({ ...previous, streak: result.streak }));
      return true;
    } catch (claimError) {
      setError(claimError.message || "Could not claim the 50-day reward.");
      return false;
    } finally {
      setClaimingFiftyDayKey(false);
    }
  };

  const openFiftyReward = () => {
    setFiftyRewardCount(0);
    setShowFiftyReward(true);
  };

  const openHundredReward = () => {
    setHundredRewardCount(0);
    setHundredRewardVisible(false);
    const existingClaim = (streak?.rewardClaims || []).find((claim) => (
      String(claim.localDate) === "milestone-100" && claim.type === "100-day-gift"
    ));
    setClaimedHundredGift(existingClaim || null);
    setSelectedHundredGiftId(existingClaim?.giftId || null);
    setHundredTermsVisible(false);
    setHundredTermsAtBottom(false);
    setHundredTermsAccepted(false);
    setHundredClaimMessage("");
    setShowHundredReward(true);
  };

  const openHundredTerms = () => {
    if (!selectedHundredGiftId) return;
    setHundredTermsVisible(true);
    setHundredTermsAtBottom(false);
    setHundredTermsAccepted(false);
  };

  useEffect(() => {
    if (!data) return undefined;
    const openReward = () => openHundredReward();
    window.addEventListener('daily-streak:open-100-reward', openReward);
    if (sessionStorage.getItem('open-100-day-reward') === '1') {
      sessionStorage.removeItem('open-100-day-reward');
      window.setTimeout(openReward, 0);
    }
    return () => window.removeEventListener('daily-streak:open-100-reward', openReward);
  }, [data]);

  useEffect(() => {
    if (!hundredTermsVisible) return undefined;
    const checkScrollableContent = () => {
      const element = hundredTermsScrollRef.current;
      if (element && element.scrollHeight <= element.clientHeight + 8) {
        setHundredTermsAtBottom(true);
      }
    };
    const timer = window.setTimeout(checkScrollableContent, 0);
    return () => window.clearTimeout(timer);
  }, [hundredTermsVisible, selectedHundredGiftId]);

  const handleHundredTermsScroll = (event) => {
    const element = event.currentTarget;
    if (element.scrollTop + element.clientHeight >= element.scrollHeight - 8) {
      setHundredTermsAtBottom(true);
    }
  };

  const claimHundredReward = async () => {
    if (claimingHundredReward || !selectedHundredGiftId || !hundredTermsAccepted) return;
    if (Number(streak?.currentStreak || 0) < 100) {
      setHundredClaimMessage("Reach 100 days to claim this reward.");
      return;
    }
    setClaimingHundredReward(true);
    setError("");
    try {
      const result = await apiRequest("/api/daily-streak/milestone-100/claim", {
        method: "POST",
        body: JSON.stringify({ giftId: selectedHundredGiftId, termsAccepted: true }),
      });
      if (result.popupMessage) {
        window.dispatchEvent(new CustomEvent("student-message:new", { detail: result.popupMessage }));
      }
      setClaimedHundredGift(result.claim);
      setHundredClaimNotice({ ...result.claim, imageData: selectedHundredGift?.image?.imageData });
      playHundredSkyShots();
      window.setTimeout(() => setHundredClaimNotice(null), 4500);
      setData((previous) => ({ ...previous, streak: result.streak }));
    } catch (claimError) {
      setError(claimError.message || "Could not claim the 100-day reward.");
    } finally {
      setClaimingHundredReward(false);
    }
  };

  const downloadClaimedGiftLetter = async () => {
    if (!claimedHundredGift || downloadingGiftLetter) return;
    setDownloadingGiftLetter(true);
    try {
      const gift = (challenge?.streakGifts || []).find((item) => item.id === claimedHundredGift.giftId);
      const studentName = getStoredAuth()?.user?.name || "Student";
      const loadImage = (source) => new Promise((resolve) => {
        if (!source) return resolve(null);
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => resolve(null);
        image.src = source;
      });
      const [logoImage, giftImage, signatureImage] = await Promise.all([
        loadImage(logo),
        loadImage(gift?.image?.imageData),
        loadImage(signature),
      ]);
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 1700;
      const context = canvas.getContext("2d");
      context.fillStyle = "#fffdf7";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.strokeStyle = "#0f766e";
      context.lineWidth = 18;
      context.strokeRect(24, 24, 1152, 1652);
      if (logoImage) context.drawImage(logoImage, 540, 55, 120, 120);
      context.textAlign = "center";
      context.fillStyle = "#b45309";
      context.font = "800 28px Arial";
      context.fillText("INNOVATIVE SCIENCE 2", 600, 220);
      context.fillStyle = "#0f172a";
      context.font = "bold 44px Georgia";
      context.fillText("100-Day Streak Reward Letter", 600, 290);
      context.textAlign = "left";
      context.fillStyle = "#334155";
      context.font = "24px Arial";
      context.fillText(`Student: ${studentName}`, 90, 365);
      context.fillText(`Gift: ${claimedHundredGift.giftName || gift?.name || "Reward"}`, 90, 405);
      if (giftImage) context.drawImage(giftImage, 90, 445, 210, 170);
      context.fillStyle = "#0f172a";
      context.font = "bold 26px Arial";
      context.fillText("Letter", 90, 680);
      context.fillStyle = "#334155";
      context.font = "22px Arial";
      const richLines = [];
      let currentLine = [];
      const breakLine = () => {
        if (currentLine.length) richLines.push(currentLine);
        currentLine = [];
      };
      const addRichText = (text, style) => {
        String(text).replace(/\s+/g, " ").trim().split(" ").filter(Boolean).forEach((word) => {
          const font = `${style.bold ? "bold " : ""}22px Arial`;
          context.font = font;
          const prefix = currentLine.length ? " " : "";
          const candidate = `${prefix}${word}`;
          const width = currentLine.reduce((sum, item) => {
            context.font = `${item.bold ? "bold " : ""}22px Arial`;
            return sum + context.measureText(item.text).width;
          }, 0) + context.measureText(candidate).width;
          if (width > 980 && currentLine.length) breakLine();
          currentLine.push({ text: `${currentLine.length ? "" : ""}${word}`, ...style, leadingSpace: currentLine.length > 0 });
        });
      };
      const walkLetter = (node, style = {}) => {
        if (node.nodeType === Node.TEXT_NODE) {
          addRichText(node.textContent, style);
          return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        const tag = node.tagName.toLowerCase();
        if (tag === "br") { breakLine(); return; }
        const nextStyle = { bold: style.bold || tag === "strong" || tag === "b", link: style.link || tag === "a" };
        node.childNodes.forEach((child) => walkLetter(child, nextStyle));
        if (["p", "div", "li", "h1", "h2", "h3"].includes(tag)) breakLine();
      };
      const parsedLetter = new DOMParser().parseFromString(
        claimedHundredGift.letterHtml || `<p>${claimedHundredGift.letterText || "Your reward letter is ready."}</p>`,
        "text/html",
      );
      parsedLetter.body.childNodes.forEach((node) => walkLetter(node));
      breakLine();
      richLines.slice(0, 21).forEach((lineSegments, lineIndex) => {
        let x = 90;
        lineSegments.forEach((segment) => {
          context.font = `${segment.bold ? "bold " : ""}22px Arial`;
          context.fillStyle = segment.link ? "#c2410c" : "#334155";
          const text = `${segment.leadingSpace ? " " : ""}${segment.text}`;
          context.fillText(text, x, 730 + lineIndex * 34);
          const width = context.measureText(text).width;
          if (segment.link) {
            context.strokeStyle = "#c2410c";
            context.lineWidth = 1;
            context.beginPath(); context.moveTo(x, 734 + lineIndex * 34); context.lineTo(x + width, 734 + lineIndex * 34); context.stroke();
          }
          x += width;
        });
      });
      const signatureY = richLines.length > 21 ? 1800 : Math.min(1530, 770 + Math.max(1, richLines.length) * 34 + 100);
      context.strokeStyle = "#64748b";
      context.lineWidth = 2;
      context.beginPath(); context.moveTo(90, signatureY); context.lineTo(420, signatureY); context.stroke();
      context.beginPath(); context.moveTo(780, signatureY); context.lineTo(1110, signatureY); context.stroke();
      if (signatureImage) context.drawImage(signatureImage, 815, signatureY - 80, 180, 62);
      context.fillStyle = "#475569";
      context.font = "18px Arial";
      context.fillText("Student Signature", 165, signatureY + 32);
      context.fillText("Authorized Signature — Rethish Sir", 805, signatureY + 32);
      context.textAlign = "center";
      context.font = "18px Arial";
      context.fillText(`Issued on ${new Date().toLocaleDateString()}`, 600, 1630);

      const pageCanvases = [canvas];
      let overflowLines = richLines.slice(21);
      let finalPageLineCount = 0;
      while (overflowLines.length) {
        const page = document.createElement("canvas");
        page.width = 1200; page.height = 1700;
        const pageContext = page.getContext("2d");
        pageContext.fillStyle = "#fffdf7"; pageContext.fillRect(0, 0, 1200, 1700);
        pageContext.strokeStyle = "#0f766e"; pageContext.lineWidth = 18; pageContext.strokeRect(24, 24, 1152, 1652);
        pageContext.textAlign = "center"; pageContext.fillStyle = "#b45309"; pageContext.font = "800 26px Arial"; pageContext.fillText("INNOVATIVE SCIENCE 2 — REWARD LETTER", 600, 110);
        pageContext.textAlign = "left"; pageContext.fillStyle = "#334155"; pageContext.font = "18px Arial"; pageContext.fillText("Letter continuation", 90, 160);
        const pageLines = overflowLines.splice(0, 32);
        finalPageLineCount = pageLines.length;
        pageLines.forEach((lineSegments, lineIndex) => {
          let x = 90;
          lineSegments.forEach((segment) => {
            pageContext.font = `${segment.bold ? "bold " : ""}22px Arial`;
            pageContext.fillStyle = segment.link ? "#c2410c" : "#334155";
            const text = `${segment.leadingSpace ? " " : ""}${segment.text}`;
            pageContext.fillText(text, x, 220 + lineIndex * 34);
            const width = pageContext.measureText(text).width;
            if (segment.link) { pageContext.strokeStyle = "#c2410c"; pageContext.lineWidth = 1; pageContext.beginPath(); pageContext.moveTo(x, 224 + lineIndex * 34); pageContext.lineTo(x + width, 224 + lineIndex * 34); pageContext.stroke(); }
            x += width;
          });
        });
        pageCanvases.push(page);
      }
      if (pageCanvases.length > 1) {
        const finalPage = pageCanvases[pageCanvases.length - 1];
        const finalContext = finalPage.getContext("2d");
        const signatureYForFinalPage = Math.min(1510, 220 + finalPageLineCount * 34 + 150);
        finalContext.strokeStyle = "#64748b"; finalContext.lineWidth = 2;
        finalContext.beginPath(); finalContext.moveTo(90, signatureYForFinalPage); finalContext.lineTo(420, signatureYForFinalPage); finalContext.stroke();
        finalContext.beginPath(); finalContext.moveTo(780, signatureYForFinalPage); finalContext.lineTo(1110, signatureYForFinalPage); finalContext.stroke();
        if (signatureImage) finalContext.drawImage(signatureImage, 815, signatureYForFinalPage - 80, 180, 62);
        finalContext.fillStyle = "#475569"; finalContext.font = "18px Arial"; finalContext.textAlign = "left";
        finalContext.fillText("Student Signature", 165, signatureYForFinalPage + 32);
        finalContext.fillText("Authorized Signature — Rethish Sir", 805, signatureYForFinalPage + 32);
        finalContext.textAlign = "center"; finalContext.fillText(`Issued on ${new Date().toLocaleDateString()}`, 600, 1630);
      }
      const encoder = new TextEncoder(); const chunks = []; const offsets = []; let length = 0;
      const add = (chunk) => { const bytes = typeof chunk === "string" ? encoder.encode(chunk) : chunk; chunks.push(bytes); length += bytes.length; };
      const object = (number, content) => { offsets[number] = length; add(`${number} 0 obj\n${content}\nendobj\n`); };
      add("%PDF-1.3\n%\xFF\xFF\xFF\xFF\n");
      object(1, "<< /Type /Catalog /Pages 2 0 R >>");
      const pageObjects = pageCanvases.map((_, index) => 3 + index * 3);
      object(2, `<< /Type /Pages /Kids [${pageObjects.map((number) => `${number} 0 R`).join(" ")}] /Count ${pageCanvases.length} >>`);
      pageCanvases.forEach((page, index) => {
        const pageNumber = 3 + index * 3;
        const contentNumber = pageNumber + 1;
        const imageNumber = pageNumber + 2;
        object(pageNumber, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 ${imageNumber} 0 R >> >> /Contents ${contentNumber} 0 R >>`);
        const content = "q\n595 0 0 842 0 0 cm\n/Im0 Do\nQ";
        object(contentNumber, `<< /Length ${encoder.encode(content).length} >>\nstream\n${content}\nendstream`);
        const jpegBytes = Uint8Array.from(atob(page.toDataURL("image/jpeg", 0.94).split(",")[1]), (character) => character.charCodeAt(0));
        add(`${imageNumber} 0 obj\n<< /Type /XObject /Subtype /Image /Width 1200 /Height 1700 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`);
        add(jpegBytes); add("\nendstream\nendobj\n");
      });
      const xrefOffset = length;
      const objectCount = 3 + pageCanvases.length * 3;
      add(`xref\n0 ${objectCount}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objectCount} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
      const link = document.createElement("a");
      link.href = URL.createObjectURL(new Blob(chunks, { type: "application/pdf" }));
      link.download = `innovative-science-100-day-reward-${String(studentName).replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);
    } finally {
      setDownloadingGiftLetter(false);
    }
  };

  const playHundredSkyShots = useCallback(() => {
    setHundredSkyShotKey(Date.now());
    window.setTimeout(() => setHundredSkyShotKey(null), 4200);
  }, []);

  useEffect(() => {
    const hasClaimedHundredReward = (streak?.rewardClaims || []).some((claim) => (
      String(claim.localDate) === "milestone-100" && claim.type === "100-day-gift"
    ));
    if (hasClaimedHundredReward && !hundredVisitCelebrationShown.current) {
      hundredVisitCelebrationShown.current = true;
      playHundredSkyShots();
    }
  }, [playHundredSkyShots, streak?.rewardClaims]);


  useEffect(() => {
    if (!showFiftyReward) return undefined;
    setFiftyRewardCount(0);
    setFiftyKeyVisible(false);
    const startedAt = Date.now();
    const targetDays = 50;
    let revealTimer;
    const timer = window.setInterval(() => {
      const progress = Math.min(1, (Date.now() - startedAt) / 1200);
      setFiftyRewardCount(Math.round(progress * targetDays));
      if (progress >= 1) {
        window.clearInterval(timer);
        revealTimer = window.setTimeout(() => setFiftyKeyVisible(true), 650);
      }
    }, 24);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(revealTimer);
    };
  }, [showFiftyReward, streak?.currentStreak]);

  useEffect(() => {
    if (!showHundredReward) return undefined;
    const startedAt = Date.now();
    let revealTimer;
    const timer = window.setInterval(() => {
      const progress = Math.min(1, (Date.now() - startedAt) / 1400);
      setHundredRewardCount(Math.round(progress * 100));
      if (progress >= 1) {
        window.clearInterval(timer);
        revealTimer = window.setTimeout(() => setHundredRewardVisible(true), 650);
      }
    }, 24);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(revealTimer);
    };
  }, [showHundredReward]);


  const nextQuestion = () => {
    if (index + 1 < questions.length) {
      goToQuestion(index + 1);
    } else {
      finish();
    }
  };

  const downloadPracticeImage = async () => {
    if (!previewPracticeImage || downloadingPracticeImage) return;
    setDownloadingPracticeImage(true);
    try {
      const separator = previewPracticeImage.src.includes('?') ? '&' : '?';
      const link = document.createElement('a');
      link.href = `${previewPracticeImage.src}${separator}download=1`;
      link.download = `daily-practice-${previewPracticeImage.label.replace(/\s+/g, '-').toLowerCase()}.png`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      setError('Could not download this image. Please try again.');
    } finally {
      setDownloadingPracticeImage(false);
    }
  };

  if (loading) {
    return (
      <LoadingState
        label="Preparing your daily challenge..."
        subtitle="Getting your questions ready"
      />
    );
  }

  if (error && !challenge) {
    return (
      <div className="grid min-h-[65vh] place-items-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-sm">
          <RefreshCw size={28} className="mx-auto text-slate-400" />
          <h1 className="mt-4 text-xl font-bold text-slate-900">
            Something went wrong
          </h1>
          <p className="mt-2 break-words text-sm text-slate-500">{error}</p>
          <button
            onClick={() => load()}
            className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 font-semibold text-white transition hover:bg-teal-700"
          >
            <RefreshCw size={16} />
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!challenge?.eligibleChapterIds?.length) {
    return <EmptyState />;
  }

  if (!challenge.questionCount) {
    return (
      <div className="grid min-h-[65vh] place-items-center bg-slate-50 px-4">
        <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center">
          <LockKeyhole size={36} className="mx-auto text-amber-500" />
          <h1 className="mt-4 text-2xl font-black text-slate-900">
            More questions needed
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Your practised chapters are eligible, but there are no usable
            questions available yet. Please try again after your teacher adds
            questions.
          </p>
          <Link
            to="/chapters"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-600 px-5 font-semibold text-white"
          >
            Explore chapters
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main
      className={`min-h-screen overflow-x-hidden bg-[#fbfbfa] pb-24 text-stone-800 ${dailyPracticePage ? "daily-practice-page" : "daily-streak-overview"} ${challenge.status === "completed" ? "daily-practice-completed" : ""}`}
    >
      <div className="relative mx-auto w-full max-w-[1180px] px-2 py-1 sm:px-3 lg:px-4">
        {dailyPracticePage && (
          <button
            type="button"
            onClick={() => navigate("/daily-streak")}
            className="mb-3 inline-flex h-8 w-fit items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-black text-slate-600 shadow-sm transition hover:border-orange-300 hover:text-orange-700"
          >
            <ArrowLeft size={13} /> Back
          </button>
        )}
        {dailyPracticePage && challenge.status === "completed" && (
          <section className="daily-practice-meta mb-4 rounded-[1.6rem] border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="mb-3">
              <p className="text-xs font-black uppercase tracking-[.16em] text-orange-700">
                Today&apos;s practice
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-950">
                Daily progress
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
              <PracticeMeta label="Attempted" value={challenge.attemptedCount || 0} tone="orange" />
              <PracticeMeta label="Total questions" value={challenge.questionCount || 0} tone="slate" />
              <PracticeMeta
                label="Total correct"
                value={`${challenge.correctCount || 0}/${challenge.questionCount || 0}`}
                tone="green"
              />
              <PracticeMeta
                label="Valid questions"
                value={`${challenge.score ?? challenge.streakEligibleCorrectCount ?? 0}/${challenge.scoredQuestionCount ?? 16}`}
                suffix="marks counted"
                tone="blue"
              />
              <PracticeMeta
                label="Today streak"
                value={
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className={streakCountedToday ? "text-orange-500" : "grayscale opacity-60"}
                    >
                      🔥
                    </span>
                    {streakCountedToday ? "Counted" : "Not counted"}
                  </span>
                }
                tone={streakCountedToday ? "green" : "yellow"}
              />
            </div>
          </section>
        )}
        <section className="daily-streak-journey relative mb-4 rounded-[1.6rem] border border-orange-100 bg-gradient-to-br from-white via-orange-50/50 to-amber-50 p-4 shadow-sm sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[.16em] text-orange-700">
                100-day streak journey
              </p>
              <p className="mt-1 text-lg font-black text-slate-900">
                Day {Math.min(100, Number(streak.currentStreak || 0))} of 100
              </p>
            </div>
            {challenge.streakMilestoneImage?.imageData && (
              <button
                type="button"
                onClick={() => setPreviewStreakImage(true)}
                className="rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
                aria-label="View 100-day streak reward image"
              >
                <img
                  src={challenge.streakMilestoneImage.imageData}
                  alt="100-day streak reward"
                  className="h-14 w-14 cursor-zoom-in rounded-xl border-2 border-white object-cover shadow-sm transition hover:scale-105"
                />
              </button>
            )}
          </div>
          <div className="relative mt-5 flex items-center gap-3">
            <div className="relative flex h-4 min-w-0 flex-1 gap-10">
            <div className="relative h-4 w-1/2 overflow-hidden rounded-l-full bg-orange-100 shadow-inner">
              <div
                className="h-4 rounded-l-full bg-gradient-to-r from-orange-500 to-amber-400 transition-[width] duration-1000 ease-out"
                style={{ width: `${Math.min(100, (Number(streak.currentStreak || 0) / 50) * 100)}%` }}
              />
            </div>
            <div className="relative h-4 w-1/2 overflow-hidden rounded-r-full bg-amber-100 shadow-inner">
              <div
                className="h-4 rounded-r-full bg-gradient-to-r from-amber-400 to-yellow-300 transition-[width] duration-1000 ease-out"
                style={{ width: `${Math.max(0, Math.min(100, ((Number(streak.currentStreak || 0) - 50) / 50) * 100))}%` }}
              />
            </div>
            <button
              type="button"
              onClick={openFiftyReward}
              disabled={claimingFiftyDayKey}
              className="pointer-events-auto absolute left-1/2 top-1/2 z-10 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg border-2 border-white bg-gradient-to-br from-pink-500 via-rose-500 to-orange-400 p-0 text-white leading-none shadow-lg transition hover:scale-110 disabled:cursor-not-allowed"
              aria-label={fiftyDayKeyClaimed ? "View claimed 50-day restore key" : "Claim 50-day restore key"}
              title={fiftyDayKeyClaimed ? "View 50-day claimed reward" : Number(streak.currentStreak || 0) < 50 ? "Reach day 50 to unlock" : "Claim one restore key"}
            >
              <span className="flex h-5 w-5 items-center justify-center text-white"><Gift size={17} strokeWidth={2.5} /></span>
            </button>
            </div>
            <button type="button" onClick={openHundredReward} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-white bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 p-0 text-white shadow-lg transition hover:scale-110" aria-label="Open 100-day streak gift" title={Number(streak.currentStreak || 0) < 100 ? "Preview the 100-day reward" : "Open 100-day streak gift"}><span className="flex h-5 w-5 items-center justify-center text-white"><Gift size={17} strokeWidth={3} /></span></button>
          </div>
          <div className="mt-2 grid grid-cols-2 text-[10px] font-bold text-orange-700/70">
            <span>1–50</span>
            <span className="text-right">51–100</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] font-black text-slate-500">
            <span>{fiftyDayKeyClaimed ? "50-day key claimed" : "Gift at day 50"}</span>
            <span>{Math.min(100, Number(streak.currentStreak || 0))}% complete</span>
          </div>
          <div className="mt-4 flex justify-center">
            {Number(streak.currentStreak || 0) >= 100 && <button
              type="button"
              onClick={() => setShowStreakCertificate(true)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-2 text-xs font-black text-white shadow-md shadow-orange-200 transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <Trophy size={15} /> Claim reward
            </button>}
          </div>
        </section>
        <section className="daily-practice-hero mb-4 rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700">
                Daily learning
              </span>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Daily Streak
              </h1>
              <p className="mt-1 text-sm font-medium text-slate-500 sm:text-base">
                Learn something new. Practise & Improve yourself.
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2 text-right">
              <div>
                <div className="text-2xl font-black text-orange-500">
                  🔥 {streak.currentStreak}
                </div>
                <p className="text-xs font-semibold text-slate-500">
                  Day streak
                </p>
              </div>
              <div className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-black text-violet-800">
                <KeyRound size={12} />
                {Number(streak.restoreKeys || 0)} keys
              </div>
              {streak.streakBroken && (
                <button
                  type="button"
                  onClick={restoreBrokenStreak}
                  disabled={restoring || Number(streak.restoreKeys || 0) < 1}
                  className="rounded-full bg-violet-600 px-2.5 py-1 text-[10px] font-black text-white disabled:opacity-60"
                >
                  {restoring
                    ? "Restoring..."
                    : Number(streak.restoreKeys || 0) > 0
                      ? "Restore streak"
                      : "Need key"}
                </button>
              )}
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() =>
                dailyPracticePage
                  ? setShowPracticeQuestions((current) => !current)
                  : navigate("/daily-streak/dailypractice")
              }
              className="daily-practice-choice daily-practice-choice-practice text-left"
            >
              <Zap size={25} className="text-orange-500" fill="currentColor" />
              <h3 className="mt-3 text-lg font-black text-slate-950">
                Practice
              </h3>
              <p className="mt-1 text-sm text-orange-900/70">
                Test your knowledge with science questions.
              </p>
              <span className="mt-3 inline-flex rounded-full bg-orange-200 px-3 py-1 text-xs font-black text-orange-800">
                {challenge.attemptedCount || 0}/{challenge.questionCount || 0}{" "}
                questions attempted{" "}
                {dailyPracticePage && showPracticeQuestions ? "↑" : "→"}
              </span>
            </button>
            <div className="daily-practice-choice daily-practice-choice-explore text-left">
              <LockKeyhole size={25} className="text-slate-400" />
              <h3 className="mt-3 text-lg font-black text-slate-700">
                Explore
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Discover interesting science concepts.
              </p>
              <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-slate-200 px-3 py-1 text-xs font-black text-slate-500">
                <LockKeyhole size={12} /> Locked
              </span>
            </div>
          </div>
        </section>
        {showPracticeQuestions && (
          <section
            id="daily-practice-question-list"
            className="daily-practice-question-list mb-4 rounded-[1.6rem] border border-slate-200 bg-slate-50 p-3 shadow-sm sm:p-5"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Today’s questions ({challenge.questions?.length || 0})
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-950">
                  Practice progress
                </h2>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500">
                {challenge.attemptedCount || 0} attempted
              </span>
            </div>
            <div className="grid gap-3">
              {(challenge.questions || []).map((item, questionIndex) => {
                const answered = Boolean(item.submitted);
                const notCounted = [
                  "diagram-based-question",
                  "complete-the-tables",
                ].includes(item.type);
                const scoredQuestion = [
                  "mcqs",
                  "true-or-false",
                  "correlation",
                ].includes(item.type);
                const correct = answered && item.isCorrect;
                const expanded = expandedPracticeQuestion === item._id;
                return (
                  <button
                    key={item._id}
                    type="button"
                    onClick={() =>
                      setExpandedPracticeQuestion(expanded ? null : item._id)
                    }
                    className={`daily-practice-question-card text-left ${notCounted ? "is-not-counted" : answered ? (correct ? "is-correct" : "is-wrong") : "is-pending"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-xs font-black uppercase tracking-wide text-teal-700">
                        Question {questionIndex + 1}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-black ${notCounted ? "bg-amber-100 text-amber-800" : answered ? (correct ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700") : "bg-slate-200 text-slate-500"}`}
                      >
                        {notCounted
                          ? "Not counted"
                          : answered
                          ? correct
                            ? "Correct"
                            : "Wrong"
                          : "Not attempted"}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-bold leading-6 text-slate-800 sm:text-base">
                      {item.question || "Question"}
                    </p>
                    {item.imageUrl && (
                      <img
                        src={assetUrl(item.imageUrl)}
                        alt="Question diagram"
                        className="mt-3 max-h-64 w-full cursor-zoom-in rounded-xl object-contain"
                        onClick={(event) => {
                          event.stopPropagation();
                          setPreviewPracticeImage({
                            src: assetUrl(item.imageUrl),
                            label: "Question image",
                          });
                        }}
                      />
                    )}
                    <p className="mt-2 text-xs font-semibold text-slate-400">
                      {expanded
                        ? "Tap to hide answer"
                        : "Tap to view your answer"}
                    </p>
                    {expanded && answered && (
                      <div className="mt-3 rounded-xl bg-white/80 p-3 text-sm leading-6 text-slate-700">
                        {scoredQuestion && item.options?.length > 0 && (
                          <div className="mb-3 grid gap-1.5">
                            {item.options.map((option, optionIndex) => {
                              const isSelected =
                                String(item.selectedAnswer) ===
                                String(optionIndex);
                              const isCorrectOption =
                                !correct &&
                                String(item.correctAnswer) === String(option);
                              return (
                                <div
                                  key={`${item._id}-option-${optionIndex}`}
                                  className={`rounded-lg px-3 py-2 ${isSelected ? (correct ? "bg-emerald-100 font-black text-emerald-800" : "bg-rose-100 font-black text-rose-800") : isCorrectOption ? "bg-emerald-100 font-black text-emerald-800" : "bg-slate-50 text-slate-600"}`}
                                >
                                  {String.fromCharCode(65 + optionIndex)}. {option}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        <strong>Your answer:</strong>{" "}
                        {item.selectedAnswer !== undefined &&
                        item.options?.[item.selectedAnswer]
                          ? item.options[item.selectedAnswer]
                          : (item.selectedAnswer ?? "Submitted")}
                        {scoredQuestion && !correct && item.correctAnswer && (
                          <p className="mt-1 text-emerald-800">
                            <strong>Correct answer:</strong> {item.correctAnswer}
                          </p>
                        )}
                        {item.solution && !scoredQuestion && (
                          <p className="mt-1">
                            <strong>Solution:</strong> {item.solution}
                          </p>
                        )}
                        {item.answerImageUrl && (
                          <img
                            src={assetUrl(item.answerImageUrl)}
                            alt="Solution"
                            className="mt-3 max-h-72 w-full cursor-zoom-in rounded-xl object-contain"
                            onClick={(event) => {
                              event.stopPropagation();
                              setPreviewPracticeImage({
                                src: assetUrl(item.answerImageUrl),
                                label: "Solution image",
                              });
                            }}
                          />
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        )}
        {showPracticeQuestions && (
          <section className="daily-practice-answer-key mb-4 rounded-[1.6rem] border border-emerald-100 bg-white p-3 shadow-sm sm:p-5">
            <div className="mb-4">
              <p className="text-xs font-black uppercase tracking-wider text-emerald-600">
                Answer key
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-950">
                Options and correct answers
              </h2>
            </div>
            <div className="grid gap-3">
              {(challenge.questions || []).map((item, questionIndex) => (
                <article
                  key={`answer-key-${item._id}`}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                >
                  <p className="text-xs font-black uppercase tracking-wide text-teal-700">
                    Question {questionIndex + 1}
                  </p>
                  <p className="mt-2 text-sm font-bold leading-6 text-slate-800">
                    {item.question || "Question"}
                  </p>
                  <div className="mt-3 grid gap-1.5">
                    {(item.options || []).map((option, optionIndex) => (
                      <div
                        key={`${item._id}-answer-option-${optionIndex}`}
                        className={`rounded-lg px-3 py-2 text-sm ${String(item.correctAnswer) === String(option) ? "bg-emerald-100 font-black text-emerald-800" : "bg-white text-slate-600"}`}
                      >
                        {String.fromCharCode(65 + optionIndex)}. {option}
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    <strong>Correct answer:</strong>{" "}
                    {item.correctAnswer || "See the solution."}
                  </p>
                </article>
              ))}
            </div>
          </section>
        )}
        {showPracticeQuestions && <section className="daily-practice-rich-list mb-4 rounded-[1.6rem] border border-slate-200 bg-slate-50 p-3 shadow-sm sm:p-5"><div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wider text-slate-400">Today&apos;s questions ({challenge.questions?.length || 0})</p><h2 className="mt-1 text-xl font-black text-slate-950">Practice progress</h2></div><span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500">{challenge.attemptedCount || 0} attempted</span></div><div className="grid gap-3">{(challenge.questions || []).map((item, questionIndex) => { const answered = Boolean(item.submitted); const correct = answered && item.isCorrect; const expanded = expandedPracticeQuestion === item._id; const visualAnswer = Boolean(item.answerImageUrl); const openImage = (path, label) => setPreviewPracticeImage({ src: assetUrl(path), label }); return <article key={`rich-practice-${item._id}`} className={`daily-practice-question-card text-left ${answered ? correct ? 'is-correct' : 'is-wrong' : 'is-pending'}`}><div role="button" tabIndex={0} onClick={() => setExpandedPracticeQuestion(expanded ? null : item._id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setExpandedPracticeQuestion(expanded ? null : item._id); } }} className="w-full text-left"><div className="flex items-start justify-between gap-3"><span className="text-xs font-black uppercase tracking-wide text-teal-700">Question {questionIndex + 1}</span><span className={`rounded-full px-3 py-1 text-[10px] font-black ${answered ? correct ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-500'}`}>{answered ? correct ? 'Correct' : 'Wrong' : 'Not attempted'}</span></div>{item.imageUrl && <button type="button" onClick={(event) => { event.stopPropagation(); openImage(item.imageUrl, 'Question image') }} className="mt-3 block w-full cursor-zoom-in"><img src={assetUrl(item.imageUrl)} alt="Question diagram" className="mx-auto max-h-64 w-full rounded-xl object-contain" /></button>}<p className="mt-3 text-sm font-bold leading-6 text-slate-800 sm:text-base">{item.question || 'Question'}</p><p className="mt-2 text-xs font-semibold text-slate-400">{expanded ? 'Tap to hide answer' : 'Tap to view your answer'}</p></div>{expanded && answered && <div className="mt-3 rounded-xl bg-white/90 p-3 text-sm leading-6 text-slate-700"><p className="font-black text-slate-900">Options</p>{!visualAnswer && <div className="mt-2 grid gap-1.5">{(item.options || []).map((option, optionIndex) => <div key={`${item._id}-rich-option-${optionIndex}`} className={`rounded-lg px-3 py-2 ${String(item.correctAnswer) === String(option) ? 'bg-emerald-100 font-black text-emerald-800' : String(item.selectedAnswer) === String(optionIndex) ? 'bg-orange-100 font-bold text-orange-800' : 'bg-slate-50'}`}>{String.fromCharCode(65 + optionIndex)}. {option}</div>)}</div>}{visualAnswer && <button type="button" onClick={() => openImage(item.answerImageUrl, 'Correct answer')} className="mt-3 block w-full cursor-zoom-in"><img src={assetUrl(item.answerImageUrl)} alt="Correct answer" className="mx-auto max-h-72 w-full rounded-xl object-contain" /></button>}<p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2"><strong>Correct answer:</strong> {item.correctAnswer || item.solution || 'See the solution.'}</p><p className="mt-1"><strong>Your answer:</strong> {item.selectedAnswer !== undefined && item.options?.[item.selectedAnswer] ? item.options[item.selectedAnswer] : item.selectedAnswer ?? 'Submitted'}</p>{item.solution && !visualAnswer && <p className="mt-1"><strong>Solution:</strong> {item.solution}</p>}</div>}</article> })}</div></section>}
        {/* Existing controls remain available below the new overview. */}
        <header className="hidden">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-stone-900 text-white sm:h-12 sm:w-12">
                <Zap size={21} fill="currentColor" />
              </div>

              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-widest text-stone-400 sm:text-xs">
                  Daily challenge
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-2xl font-serif tracking-tight text-stone-950 sm:text-3xl">
                    Daily Streak
                  </h1>
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-sm font-bold text-orange-700"
                    aria-label={`${streak.currentStreak} day streak`}
                  >
                    <span aria-hidden="true">🔥</span>
                    {streak.currentStreak}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="ml-auto flex shrink-0 flex-col items-end gap-2">
            <div
              className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-black text-violet-800"
              title="Available streak restore keys"
            >
              <KeyRound size={14} />
              {Number(streak.restoreKeys || 0)} keys
            </div>
            {streak.streakBroken && (
              <button
                type="button"
                onClick={restoreBrokenStreak}
                disabled={restoring || Number(streak.restoreKeys || 0) < 1}
                className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-3 py-1.5 text-xs font-black text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <KeyRound size={13} />
                {restoring
                  ? "Restoring..."
                  : Number(streak.restoreKeys || 0) > 0
                    ? "Restore streak"
                    : "Need restore key"}
              </button>
            )}
          </div>
        </header>

        {/* Inline error */}
        {error && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
          >
            <X size={18} className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Something needs attention</p>
              <p className="mt-1 break-words">{error}</p>
            </div>
            <button
              onClick={() => setError("")}
              aria-label="Dismiss error"
              className="shrink-0 rounded-lg p-1 hover:bg-rose-100"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Completed state */}
        {challenge.status === "completed" && !dailyPracticePage ? null : (
          <section className="min-w-0">
            {/* Question panel */}
            <div
              id="daily-question-panel"
              className="min-w-0 scroll-mt-28 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
            >
              {/* Progress header */}
              <div className="border-b border-stone-100 px-3 py-2.5 sm:px-4 sm:py-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs font-bold uppercase tracking-widest text-stone-400">
                      Question {String(index + 1).padStart(2, "0")}
                      <span className="font-bold text-stone-400">
                        {" "}
                        of {challenge.questionCount}
                      </span>
                    </p>
                  </div>

                  <span className="shrink-0 rounded-lg bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-600">
                    {progress}% complete
                  </span>
                </div>

                <div
                  className="h-2 overflow-hidden rounded-full bg-stone-100"
                  role="progressbar"
                  aria-label="Challenge progress"
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {question && (
                <div
                  className="question-protected p-3 sm:p-4"
                  onContextMenu={preventQuestionCapture}
                  onCopy={preventQuestionCapture}
                  onCut={preventQuestionCapture}
                  onDragStart={preventQuestionCapture}
                >
                  {/* Chapter / topic */}
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-cyan-50 px-3 py-1.5 text-xs font-bold text-cyan-800">
                      Chapter {question.chapterNumber}
                    </span>

                    {question.topicName && (
                      <span className="max-w-full break-words rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                        {question.topicName}
                      </span>
                    )}
                  </div>

                  {/* Diagram */}
                  {question.imageUrl && (
                    <div className="mb-3 flex min-h-24 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 p-2 sm:mb-4 sm:min-h-28 sm:p-3">
                      <img
                        src={assetUrl(question.imageUrl)}
                        alt="Question diagram"
                        loading="eager"
                        className="max-h-52 max-w-full object-contain sm:max-h-60"
                      />
                    </div>
                  )}

                  {/* Question */}
                  <h2 className="whitespace-pre-wrap break-words text-base font-black leading-snug text-stone-950 sm:text-xl">
                    {question.question || "Choose the correct answer."}
                  </h2>

                  {/* Matching pairs */}
                  {question.pairs?.length > 0 && (
                    <div className="my-5 overflow-hidden rounded-2xl border border-slate-200">
                      <div className="grid grid-cols-2 gap-3 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                        <span>Column A</span>
                        <span>Column B</span>
                      </div>

                      {question.pairs.map((pair, pairIndex) => (
                        <div
                          key={`${pair.left}-${pair.right}`}
                          className={`grid grid-cols-2 gap-3 px-4 py-3 text-sm leading-6 ${
                            pairIndex % 2 === 0 ? "bg-white" : "bg-slate-50/60"
                          }`}
                        >
                          <span className="break-words font-medium text-slate-800">
                            {pair.left}
                          </span>
                          <span className="break-words text-slate-600">
                            {pair.right}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Answer options */}
                  <div className="mt-3 space-y-2 sm:mt-4">
                    {[
                      "diagram-based-question",
                      "complete-the-tables",
                      "identify-symbol",
                    ].includes(question.type) ? (
                      revealedDailyAnswers[question._id] ? (
                        <div
                          id={`daily-answer-${question._id}`}
                          className="rounded-2xl border border-emerald-300 bg-emerald-50 p-3 text-emerald-950"
                        >
                          <p className="text-xs font-black uppercase tracking-wider text-emerald-700">
                            Answer
                          </p>
                          {question.answerImageUrl && (
                            <img
                              src={assetUrl(question.answerImageUrl)}
                              alt="Correct answer"
                              className="mt-3 max-h-72 w-full rounded-xl object-contain"
                            />
                          )}
                          <p className="mt-3 whitespace-pre-wrap text-sm font-bold leading-6">
                            {question.correctAnswer ||
                              question.solution ||
                              question.options?.[0] ||
                              "Answer is not available yet."}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setRevealedDailyAnswers((current) => ({
                                ...current,
                                [question._id]: false,
                              }));
                              if (!question.submitted) submit(0);
                            }}
                            disabled={submitting}
                            className="mt-3 rounded-full bg-emerald-700 px-4 py-2 text-sm font-black text-white transition hover:bg-emerald-800 disabled:opacity-60"
                          >
                            {question.submitted ? "Done" : "Done and continue"}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setRevealedDailyAnswers((current) => ({
                              ...current,
                              [question._id]: true,
                            }));
                            window.setTimeout(
                              () =>
                                document
                                  .getElementById(
                                    `daily-answer-${question._id}`,
                                  )
                                  ?.scrollIntoView({
                                    behavior: "smooth",
                                    block: "center",
                                  }),
                              100,
                            );
                          }}
                          disabled={submitting}
                          className="flex min-h-10 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-60"
                        >
                          Show answer
                        </button>
                      )
                    ) : (
                      <>
                        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                          Select your answer
                        </p>

                        {(question.options || []).map((option, optionIndex) => {
                          const isSelected = activeSelection === optionIndex;

                          const isSubmittedAnswer =
                            question.submitted &&
                            question.selectedAnswer === optionIndex;

                          const isCorrectOption =
                            activeFeedback?.isCorrect && isSubmittedAnswer;

                          let optionStyle =
                            "border-stone-200 bg-stone-50 text-stone-800 hover:border-stone-400 hover:bg-white";

                          if (isSelected && !activeFeedback) {
                            optionStyle =
                              "border-cyan-600 bg-cyan-500 text-white shadow-sm";
                          }

                          if (activeFeedback && isSubmittedAnswer) {
                            optionStyle = activeFeedback.isCorrect
                              ? "border-emerald-400 bg-emerald-50"
                              : "border-rose-300 bg-rose-50";
                          }

                          return (
                            <button
                              key={`${option}-${optionIndex}`}
                              type="button"
                              disabled={Boolean(activeFeedback) || submitting}
                              onClick={() => {
                                setSelected(optionIndex);
                                submit(optionIndex);
                              }}
                              aria-pressed={isSelected}
                              className={`group flex min-h-10 w-full items-start gap-3 rounded-xl border px-3 py-2 text-left text-sm font-bold transition-all duration-200 sm:min-h-11 sm:px-4 sm:text-base ${
                                optionStyle
                              } disabled:cursor-default`}
                            >
                              <span
                                className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-sm font-bold transition-colors ${
                                  activeFeedback && isSubmittedAnswer
                                    ? activeFeedback.isCorrect
                                      ? "bg-emerald-500 text-white"
                                      : "bg-rose-400 text-white"
                                    : isSelected
                                      ? "bg-teal-600 text-white"
                                      : "bg-slate-100 text-slate-500 group-hover:bg-teal-100 group-hover:text-teal-700"
                                }`}
                              >
                                {activeFeedback && isSubmittedAnswer ? (
                                  activeFeedback.isCorrect ? (
                                    <Check size={17} />
                                  ) : (
                                    <X size={17} />
                                  )
                                ) : (
                                  String.fromCharCode(65 + optionIndex)
                                )}
                              </span>

                              <span className="min-w-0 flex-1 break-words pt-1 text-sm font-medium leading-6 text-slate-800 sm:text-base">
                                {option}
                              </span>

                              <span className="mt-1 shrink-0">
                                {activeFeedback && isCorrectOption && (
                                  <CheckCircle2
                                    size={19}
                                    className="text-emerald-600"
                                  />
                                )}
                              </span>
                            </button>
                          );
                        })}
                      </>
                    )}
                  </div>

                  {/* Navigation */}
                  <div className="mt-4 flex flex-col-reverse gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={() => goToQuestion(index - 1)}
                      disabled={index === 0 || submitting || finishing}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-stone-200 px-4 text-sm font-bold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft size={18} />
                      Previous
                    </button>

                    {!activeFeedback ? (
                      <button
                        type="button"
                        onClick={submit}
                        disabled={
                          activeSelection === null || submitting || finishing
                        }
                        className="hidden"
                      >
                        {submitting ? (
                          <>
                            <RefreshCw size={17} className="animate-spin" />
                            Checking…
                          </>
                        ) : (
                          <>
                            Check answer
                            <ArrowRight size={17} />
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={nextQuestion}
                        disabled={finishing || submitting}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-stone-900 px-5 text-sm font-bold text-white transition hover:bg-black disabled:opacity-50"
                      >
                        {finishing ? (
                          <>
                            <RefreshCw size={17} className="animate-spin" />
                            Finishing…
                          </>
                        ) : index + 1 === questions.length ? (
                          <>
                            Complete challenge
                            <CheckCircle2 size={17} />
                          </>
                        ) : (
                          <>
                            Next question
                            <ArrowRight size={17} />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
      {showDailyStreakBottomNav && (
        <nav className="daily-streak-bottom-nav" aria-label="Daily streak navigation">
          <button type="button" onClick={openHistory} className="daily-streak-bottom-nav-item">
            <History size={19} />
            <span>History</span>
          </button>
          <button type="button" onClick={() => navigate("/")} className="daily-streak-bottom-nav-home" aria-label="Open home page">
            <Home size={22} />
          </button>
          <button type="button" onClick={() => window.dispatchEvent(new Event("daily-rewards:open"))} className="daily-streak-bottom-nav-item">
            <Gift size={19} />
            <span>Rewards</span>
          </button>
        </nav>
      )}
      {showHistory && (
        <div className="fixed inset-0 z-[1500] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Daily streak history">
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[.16em] text-orange-600">Daily streak</p>
                <h2 className="mt-1 text-xl font-black text-slate-950">Practice history</h2>
              </div>
              <button type="button" onClick={() => { setShowHistory(false); setHistoryDetail(null); }} className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-600" aria-label="Close history"><X size={18} /></button>
            </div>
            {historyDetail ? (
              <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
                <button type="button" onClick={() => setHistoryDetail(null)} className="mb-4 inline-flex items-center gap-1 text-xs font-black text-slate-500 hover:text-orange-700"><ArrowLeft size={14} /> All history</button>
                <div className="mb-4 rounded-2xl bg-orange-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wider text-orange-700">{new Date(`${historyDetail.localDate}T00:00:00`).toLocaleDateString(undefined, { weekday: "long" })}</p>
                  <p className="mt-1 text-lg font-black text-slate-950">{dailyHistoryDateLabel(historyDetail.localDate)}</p>
                  <p className="mt-2 text-xs font-bold text-slate-600">{historyDetail.attemptedCount}/{historyDetail.questionCount} attempted · {historyDetail.correctCount} correct · {historyDetail.score} valid marks</p>
                </div>
                <div className="grid gap-3">
                  {(historyDetail.questions || []).map((item, questionIndex) => {
                    const answered = Boolean(item.submitted);
                    const notCounted = ["diagram-based-question", "complete-the-tables"].includes(item.type);
                    return <article key={item._id} className={`rounded-2xl border p-4 ${notCounted ? "border-amber-200 bg-amber-50" : answered && item.isCorrect ? "border-emerald-200 bg-emerald-50/60" : answered ? "border-rose-200 bg-rose-50/60" : "border-slate-200 bg-white"}`}>
                      <div className="flex items-start justify-between gap-3"><p className="text-xs font-black uppercase tracking-wide text-teal-700">Question {questionIndex + 1}</p><span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-black text-slate-600">{notCounted ? "Not counted" : answered ? item.isCorrect ? "Correct" : "Wrong" : "Not attempted"}</span></div>
                      <p className="mt-3 text-sm font-bold leading-6 text-slate-800">{item.question || "Question"}</p>
                      {item.imageUrl && <img src={assetUrl(item.imageUrl)} alt="Question diagram" className="mt-3 max-h-64 w-full rounded-xl object-contain" />}
                      {item.options?.length > 0 && <div className="mt-3 grid gap-1.5">{item.options.map((option, optionIndex) => <div key={`${item._id}-${optionIndex}`} className={`rounded-lg px-3 py-2 text-sm ${String(item.selectedAnswer) === String(optionIndex) ? item.isCorrect ? "bg-emerald-200 font-black text-emerald-900" : "bg-rose-200 font-black text-rose-900" : !item.isCorrect && String(item.correctAnswer) === String(option) ? "bg-emerald-200 font-black text-emerald-900" : "bg-white/70 text-slate-600"}`}>{String.fromCharCode(65 + optionIndex)}. {option}</div>)}</div>}
                      {item.answerImageUrl && <img src={assetUrl(item.answerImageUrl)} alt="Solution" className="mt-3 max-h-72 w-full rounded-xl object-contain" />}
                      <p className="mt-3 text-sm text-slate-700"><strong>Your answer:</strong> {item.selectedAnswer !== undefined && item.options?.[item.selectedAnswer] ? item.options[item.selectedAnswer] : item.selectedAnswer ?? "Not answered"}</p>
                      {(item.correctAnswer || item.solution) && <p className="mt-1 text-sm text-emerald-800"><strong>Correct answer:</strong> {item.correctAnswer || item.solution}</p>}
                      {item.solution && <p className="mt-1 text-sm text-slate-700"><strong>Solution:</strong> {item.solution}</p>}
                    </article>;
                  })}
                </div>
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
                {historyLoading && <p className="py-10 text-center text-sm font-semibold text-slate-500">Loading history...</p>}
                {historyError && <p className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{historyError}</p>}
                {!historyLoading && !historyError && !history.length && <p className="py-10 text-center text-sm font-semibold text-slate-500">No daily practice history yet.</p>}
                <div className="grid gap-3">{history.map((item) => <button key={item._id} type="button" onClick={() => openHistoryDetail(item)} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50/40"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-orange-700">{new Date(`${item.localDate}T00:00:00`).toLocaleDateString(undefined, { weekday: "long" })}</p><p className="mt-1 font-black text-slate-900">{dailyHistoryDateLabel(item.localDate)}</p></div><ArrowRight size={18} className="text-slate-400" /></div><p className="mt-2 text-xs font-bold text-slate-500">{item.attemptedCount || 0} attempted · {item.correctCount || 0} correct · {item.score || 0} valid marks</p><span className="mt-3 inline-flex rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase text-slate-500">{item.status}</span></button>)}</div>
                {historyDetailLoading && <p className="mt-3 text-center text-xs font-bold text-slate-500">Loading questions...</p>}
              </div>
            )}
          </div>
        </div>
      )}
      {streakCelebration && (
        <StreakCelebration
          from={streakCelebration.from}
          to={streakCelebration.to}
          qualified={streakCelebration.qualified}
          onClose={() => {
            setStreakCelebration(null);
            setCelebrating(false);
          }}
        />
      )}
      {previewStreakImage && challenge.streakMilestoneImage?.imageData && (
        <div
          className="fixed inset-0 z-[1400] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="100-day streak reward image"
          onClick={() => setPreviewStreakImage(false)}
        >
          <div
            className="relative flex max-h-full max-w-full items-center justify-center"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewStreakImage(false)}
              className="absolute -right-3 -top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-red-600 text-xl font-black text-white shadow-lg transition hover:bg-red-700"
              aria-label="Close streak reward image"
            >
              <X size={18} />
            </button>
            <img
              src={challenge.streakMilestoneImage.imageData}
              alt="100-day streak reward"
              className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
      {showFiftyReward && (
        <div className="fixed inset-0 z-[1450] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="50-day streak reward">
          <div className="relative w-full max-w-sm overflow-hidden rounded-[2rem] border border-orange-100 bg-white p-6 text-center shadow-2xl">
            <button type="button" onClick={() => setShowFiftyReward(false)} className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-500" aria-label="Close reward"><X size={16} /></button>
            <p className="text-xs font-black uppercase tracking-[.2em] text-orange-600">Streak 50 🔥 Reward</p>
            <div className={`mt-4 flex items-center justify-center gap-2 text-6xl font-black tabular-nums text-slate-950 transition-all duration-700 ${fiftyRewardCount >= 50 ? "-translate-y-3 scale-75" : "translate-y-0 scale-100"}`}><span>{fiftyRewardCount}</span><span className="text-4xl" aria-hidden="true">🔥</span></div>
            <p className={`mt-1 text-sm font-bold text-slate-500 transition-all duration-500 ${fiftyRewardCount >= 50 ? "-translate-y-3 opacity-0" : "opacity-100"}`}>days completed</p>
            <div className={`mx-auto mt-1 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-pink-500 via-rose-500 to-orange-400 text-white shadow-xl transition-all duration-1000 ${fiftyRewardCount >= 50 ? "translate-y-0 scale-100 opacity-100" : "-translate-y-5 scale-75 opacity-0"}`}>
              <KeyRound size={38} strokeWidth={2.2} />
            </div>
            {fiftyKeyVisible && <>
              <p className="mt-4 animate-[reward-pop_700ms_ease-out] font-black text-slate-900">One restore key unlocked</p>
              {fiftyDayKeyClaimed && <div className="mt-3 inline-flex animate-[reward-pop_700ms_ease-out] items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-black text-emerald-700"><CheckCircle2 size={17} /> Reward claimed successfully</div>}
              <button type="button" onClick={claimFiftyDayKey} disabled={claimingFiftyDayKey || fiftyDayKeyClaimed} className={`mt-5 inline-flex min-h-11 animate-[reward-pop_900ms_ease-out] items-center justify-center gap-2 rounded-full px-6 py-2 text-sm font-black text-white shadow-lg transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-100 ${fiftyDayKeyClaimed ? "bg-emerald-600" : "bg-gradient-to-r from-pink-500 via-rose-500 to-orange-400 disabled:opacity-50"}`}>
                <Gift size={17} /> {fiftyDayKeyClaimed ? "Reward claimed" : claimingFiftyDayKey ? "Claiming..." : "Claim reward"}
              </button>
            </>}
          </div>
        </div>
      )}
      {showHundredReward && (
        <div className="fixed inset-0 z-[1450] flex items-center justify-center bg-slate-950/65 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="100-day streak reward">
          <div ref={hundredTermsScrollRef} onScroll={handleHundredTermsScroll} className={`relative h-[100dvh] max-h-[100dvh] w-full max-w-none overflow-y-auto border border-orange-100 bg-white p-5 text-center shadow-2xl sm:p-8 ${hundredTermsVisible ? "hundred-review" : ""}`}>
            <button type="button" onClick={() => setShowHundredReward(false)} className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-500" aria-label="Close reward"><X size={16} /></button>
            {claimedHundredGift ? <div className="mt-5 text-left">
              <p className="text-center text-xs font-black uppercase tracking-[.2em] text-orange-600">Reward claimed successfully</p>
              <h2 className="mt-3 text-center text-2xl font-black text-slate-950 sm:text-3xl">Your {claimedHundredGift.giftName} letter</h2>
              <div className="mt-5 flex items-center gap-3 rounded-2xl border-2 border-orange-400 bg-orange-50 p-3 text-left"><img src={challenge.streakGifts?.find((gift) => gift.id === claimedHundredGift.giftId)?.image?.imageData} alt={claimedHundredGift.giftName} className="h-16 w-16 shrink-0 rounded-xl object-cover" /><span className="min-w-0 flex-1 text-sm font-black text-slate-900">{claimedHundredGift.giftName}</span><Check size={18} className="shrink-0 text-orange-600" /></div>
              <article className="streak-gift-letter mt-5 rounded-2xl border border-amber-200 bg-[#fffdf7] p-5 text-left text-sm leading-7 text-slate-700 shadow-inner sm:p-8" dangerouslySetInnerHTML={{ __html: claimedHundredGift.letterHtml || `<p>${claimedHundredGift.letterText || "Your reward letter is ready."}</p>` }} />
              <button type="button" onClick={downloadClaimedGiftLetter} disabled={downloadingGiftLetter} className="mx-auto mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-2 text-sm font-black text-white shadow-lg transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"><Download size={17} /> {downloadingGiftLetter ? "Preparing PDF..." : "Download reward letter"}</button>
            </div> : <>
              <p className="text-xs font-black uppercase tracking-[.2em] text-orange-600">Streak 100 🔥 Reward</p>
              <div className={`mt-4 flex items-center justify-center gap-2 text-6xl font-black tabular-nums text-slate-950 transition-all duration-700 ${hundredRewardVisible ? "-translate-y-3 scale-75" : "translate-y-0 scale-100"}`}><span>{hundredRewardCount}</span><span className="text-4xl" aria-hidden="true">🔥</span></div>
              <p className={`mt-1 text-sm font-bold text-slate-500 transition-all duration-500 ${hundredRewardVisible ? "-translate-y-3 opacity-0" : "opacity-100"}`}>days completed</p>
              {(!challenge.streakGifts || challenge.streakGifts.length === 0) && <div className="mt-4 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-800">The admin has not added a gift yet.</div>}
              {hundredRewardVisible && !hundredTermsVisible && challenge.streakGifts?.length > 0 && <div className="mt-4 grid gap-3 text-left sm:grid-cols-2">{challenge.streakGifts.map((gift) => { const selectedGift = selectedHundredGiftId === gift.id; return <button key={gift.id} type="button" onClick={() => setSelectedHundredGiftId(gift.id)} className={`flex min-w-0 items-center gap-3 rounded-2xl border p-3 text-left transition ${selectedGift ? "border-orange-500 bg-orange-100 ring-2 ring-orange-300" : "border-amber-200 bg-amber-50 hover:border-orange-300"}`}><img src={gift.image?.imageData} alt={gift.name} className="h-16 w-16 shrink-0 rounded-xl object-cover" /><span className="min-w-0 flex-1 text-sm font-black text-slate-900">{gift.name}</span>{selectedGift && <Check size={18} className="shrink-0 text-orange-600" />}</button> })}</div>}
              {hundredRewardVisible && !hundredTermsVisible && challenge.streakGifts?.length > 0 && <button type="button" onClick={openHundredTerms} disabled={!selectedHundredGiftId} className="mx-auto mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-2 text-sm font-black text-white shadow-lg transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"><Gift size={17} /> Claim reward</button>}
              {hundredRewardVisible && hundredTermsVisible && selectedHundredGift && <>
                <div className="mt-4 flex items-center gap-3 rounded-2xl border-2 border-orange-400 bg-orange-50 p-3 text-left"><img src={selectedHundredGift.image?.imageData} alt={selectedHundredGift.name} className="h-16 w-16 shrink-0 rounded-xl object-cover" /><span className="min-w-0 flex-1 text-sm font-black text-slate-900">{selectedHundredGift.name}</span><Check size={18} className="shrink-0 text-orange-600" /></div>
                <article className="streak-gift-letter mt-4 rounded-xl border border-orange-100 bg-[#fffdf7] p-4 text-left text-xs leading-6 text-slate-600" dangerouslySetInnerHTML={{ __html: selectedHundredGift.letterHtml || `<p>${selectedHundredGift.letterText || "Your reward letter is ready."}</p>` }} />
                {hundredTermsAtBottom && <div className="fixed inset-x-0 bottom-0 z-20 bg-white px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_30px_rgba(15,23,42,.12)] sm:px-8"><div className="mx-auto max-w-2xl">
                  {hundredClaimMessage && <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-center text-xs font-black text-amber-800">{hundredClaimMessage}</p>}
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-slate-50 p-3 text-left text-xs font-semibold leading-5 text-slate-600"><input type="checkbox" checked={hundredTermsAccepted} onChange={(event) => setHundredTermsAccepted(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-orange-500" />I agree to the reward terms and policy.</label>
                  <button type="button" onClick={claimHundredReward} disabled={!hundredTermsAccepted || claimingHundredReward} className="mx-auto mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-2 text-sm font-black text-white shadow-lg transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"><Gift size={17} /> {claimingHundredReward ? "Claiming..." : "Claim reward"}</button>
                </div></div>}
              </>}
            </>}
          </div>
        </div>
      )}
      {hundredClaimNotice && <div className="fixed inset-x-0 top-4 z-[2200] mx-auto flex w-[calc(100%-2rem)] max-w-md items-center gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 p-3 text-left shadow-2xl streak-claim-success" role="status"><div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-white"><img src={hundredClaimNotice.imageData} alt={hundredClaimNotice.giftName} className="h-full w-full object-cover" /></div><div className="min-w-0"><p className="text-xs font-black uppercase tracking-[.15em] text-emerald-700">Reward claimed</p><p className="truncate text-sm font-black text-emerald-950">{hundredClaimNotice.giftName}</p><p className="text-xs font-semibold text-emerald-700">Your gift has been claimed successfully.</p></div><CheckCircle2 className="ml-auto shrink-0 text-emerald-600" size={24} /></div>}
      {hundredSkyShotKey && <SkyShotCelebration key={hundredSkyShotKey} />}
      {showStreakCertificate && (
        <StreakCertificateModal
          challenge={challenge}
          unlocked={Number(streak.currentStreak || 0) >= 100}
          onClose={() => setShowStreakCertificate(false)}
        />
      )}
      {previewPracticeImage && <div className="fixed inset-0 z-[1300] flex flex-col bg-slate-950/90 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Image preview"><div className="flex items-center justify-end gap-2"><button type="button" onClick={downloadPracticeImage} disabled={downloadingPracticeImage} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-emerald-600 px-3 text-xs font-black text-white shadow-lg hover:bg-emerald-700 disabled:opacity-60"><Download size={15} /> {downloadingPracticeImage ? 'Downloading...' : 'Download'}</button><button type="button" onClick={() => setPreviewPracticeImage(null)} className="grid h-9 w-9 place-items-center rounded-full bg-red-600 text-xl font-black text-white shadow-lg hover:bg-red-700" aria-label="Close image preview"><X size={18} /></button></div><div className="flex min-h-0 flex-1 items-center justify-center py-3"><img src={previewPracticeImage.src} alt={previewPracticeImage.label} className="max-h-full max-w-full object-contain" /></div></div>}
    </main>
  );
};

const SkyShotCelebration = () => (
  <div className="sky-shot-celebration" aria-live="polite" aria-label="100-day streak celebration">
    {[0, 1, 2].map((shot) => <div key={shot} className={`sky-shot sky-shot-${shot}`} aria-hidden="true">
      {Array.from({ length: 12 }, (_, index) => <span key={index} style={{ "--shot-angle": `${index * 30}deg` }} />)}
    </div>)}
  </div>
);

const StreakCertificateModal = ({ challenge, unlocked, onClose }) => {
  const [downloading, setDownloading] = useState(false);
  const [displayStreak, setDisplayStreak] = useState(0);
  const [showCertificate, setShowCertificate] = useState(false);

  useEffect(() => {
    if (displayStreak >= 100) {
      const timer = window.setTimeout(() => setShowCertificate(true), 700);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(
      () => setDisplayStreak((current) => Math.min(100, current + 2)),
      28,
    );
    return () => window.clearTimeout(timer);
  }, [displayStreak, unlocked]);
  const studentName = getStoredAuth()?.user?.name || "Student";
  const escapeXml = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
  const certificateDate = challenge.completedAt ? new Date(challenge.completedAt).toLocaleDateString() : challenge.localDate || new Date().toLocaleDateString();
  const certificateSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1100" viewBox="0 0 1600 1100"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fffdf5"/><stop offset="1" stop-color="#fff7ed"/></linearGradient></defs><rect width="1600" height="1100" fill="url(#bg)"/><rect x="24" y="24" width="1552" height="1052" rx="18" fill="none" stroke="#0f766e" stroke-width="28"/><rect x="52" y="52" width="1496" height="996" rx="12" fill="none" stroke="#f59e0b" stroke-width="4"/><image href="${logo}" x="755" y="85" width="90" height="90" preserveAspectRatio="xMidYMid meet"/><text x="800" y="245" text-anchor="middle" fill="#b45309" font-family="Arial" font-size="32" font-weight="800">CERTIFICATE OF ACHIEVEMENT</text><text x="800" y="350" text-anchor="middle" fill="#0f766e" font-family="Georgia" font-size="74" font-weight="700">100-Day Streak</text><text x="800" y="430" text-anchor="middle" fill="#475569" font-family="Arial" font-size="28">This certificate is proudly presented to</text><text x="800" y="525" text-anchor="middle" fill="#111827" font-family="Georgia" font-size="54" font-weight="700">${escapeXml(studentName)}</text><line x1="470" y1="545" x2="1130" y2="545" stroke="#334155" stroke-width="2"/><text x="800" y="625" text-anchor="middle" fill="#475569" font-family="Arial" font-size="25">For completing 100 consecutive days of the</text><text x="800" y="665" text-anchor="middle" fill="#475569" font-family="Arial" font-size="25">Innovative Science 2 Daily Streak Challenge</text><text x="800" y="705" text-anchor="middle" fill="#475569" font-family="Arial" font-size="25">with dedication, consistency, and commitment to learning.</text><text x="230" y="850" fill="#475569" font-family="Arial" font-size="22">Completed on: ${escapeXml(certificateDate)}</text><image href="${signature}" x="1160" y="740" width="190" height="65" preserveAspectRatio="xMidYMid meet"/><line x1="1130" y1="825" x2="1380" y2="825" stroke="#334155" stroke-width="2"/><text x="1255" y="860" text-anchor="middle" fill="#475569" font-family="Arial" font-size="18">Authorized Signature</text><text x="800" y="985" text-anchor="middle" fill="#0f766e" font-family="Arial" font-size="22" font-weight="700">LEARN · PRACTICE · GROW</text></svg>`;
  const certificateUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(certificateSvg)}`;
  const download = async () => {
    setDownloading(true);
    try {
      const loadImage = (source) => new Promise((resolve) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => resolve(null);
        image.src = source;
      });
      const [logoImage, signatureImage] = await Promise.all([loadImage(logo), loadImage(signature)]);
      const canvas = document.createElement("canvas");
      canvas.width = 1600;
      canvas.height = 1100;
      const context = canvas.getContext("2d");
      const gradient = context.createLinearGradient(0, 0, 1600, 1100);
      gradient.addColorStop(0, "#fffdf5");
      gradient.addColorStop(1, "#fff7ed");
      context.fillStyle = gradient;
      context.fillRect(0, 0, 1600, 1100);
      context.strokeStyle = "#0f766e";
      context.lineWidth = 28;
      context.strokeRect(24, 24, 1552, 1052);
      context.strokeStyle = "#f59e0b";
      context.lineWidth = 4;
      context.strokeRect(52, 52, 1496, 996);
      if (logoImage) context.drawImage(logoImage, 755, 85, 90, 90);
      context.textAlign = "center";
      context.fillStyle = "#b45309"; context.font = "800 32px Arial"; context.fillText("CERTIFICATE OF ACHIEVEMENT", 800, 245);
      context.fillStyle = "#0f766e"; context.font = "bold 74px Georgia"; context.fillText("100-Day Streak", 800, 350);
      context.fillStyle = "#475569"; context.font = "28px Arial"; context.fillText("This certificate is proudly presented to", 800, 430);
      context.fillStyle = "#111827"; context.font = "bold 54px Georgia"; context.fillText(studentName, 800, 525);
      context.strokeStyle = "#334155"; context.lineWidth = 2; context.beginPath(); context.moveTo(470, 545); context.lineTo(1130, 545); context.stroke();
      context.fillStyle = "#475569"; context.font = "25px Arial"; context.fillText("For completing 100 consecutive days of the", 800, 625); context.fillText("Innovative Science 2 Daily Streak Challenge", 800, 665); context.fillText("with dedication, consistency, and commitment to learning.", 800, 705);
      context.textAlign = "left"; context.font = "22px Arial"; context.fillText(`Completed on: ${certificateDate}`, 230, 850);
      if (signatureImage) context.drawImage(signatureImage, 1160, 740, 190, 65);
      context.strokeStyle = "#334155"; context.beginPath(); context.moveTo(1130, 825); context.lineTo(1380, 825); context.stroke(); context.textAlign = "center"; context.font = "18px Arial"; context.fillText("Authorized Signature", 1255, 860); context.fillStyle = "#0f766e"; context.font = "bold 22px Arial"; context.fillText("LEARN · PRACTICE · GROW", 800, 985);
      const jpegData = canvas.toDataURL("image/jpeg", 0.94);
      const jpegBytes = Uint8Array.from(atob(jpegData.split(",")[1]), (character) => character.charCodeAt(0));
      const encoder = new TextEncoder(); const chunks = []; const offsets = []; let length = 0;
      const add = (chunk) => { const bytes = typeof chunk === "string" ? encoder.encode(chunk) : chunk; chunks.push(bytes); length += bytes.length; };
      const object = (number, content) => { offsets[number] = length; add(`${number} 0 obj\n${content}\nendobj\n`); };
      add("%PDF-1.3\n%\xFF\xFF\xFF\xFF\n");
      object(1, "<< /Type /Catalog /Pages 2 0 R >>"); object(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"); object(3, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>");
      const content = "q\n842 0 0 595 0 0 cm\n/Im0 Do\nQ"; object(4, `<< /Length ${encoder.encode(content).length} >>\nstream\n${content}\nendstream`); offsets[5] = length; add(`5 0 obj\n<< /Type /XObject /Subtype /Image /Width 1600 /Height 1100 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`); add(jpegBytes); add("\nendstream\nendobj\n");
      const xrefOffset = length; add(`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
      const pdf = new Blob(chunks, { type: "application/pdf" }); const link = document.createElement("a"); link.href = URL.createObjectURL(pdf); link.download = `innovative-science-100-day-streak-${challenge.localDate || "certificate"}.pdf`; link.click(); URL.revokeObjectURL(link.href);
    } finally { setDownloading(false); }
  };
  return (
    <div className="fixed inset-0 z-[1450] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="100-day streak certificate">
      <div className="relative flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white p-3 shadow-2xl sm:p-5">
        <button type="button" onClick={onClose} className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full bg-red-600 text-white shadow-lg transition hover:bg-red-700" aria-label="Close certificate preview"><X size={18} /></button>
        {!showCertificate ? (
          <div className={`streak-reward-countdown ${displayStreak >= 100 ? "is-boom" : ""}`}>
            <div className="streak-reward-burst" aria-hidden="true">
              {Array.from({ length: 14 }, (_, index) => <span key={index} style={{ "--burst-angle": `${index * (360 / 14)}deg` }} />)}
            </div>
            <div className="streak-reward-big-flame" aria-hidden="true">🔥</div>
            <p className="mt-4 text-xs font-black uppercase tracking-[.2em] text-orange-600">Claiming reward</p>
            <div className="streak-reward-number">{displayStreak}</div>
            <p className="text-center text-sm font-semibold text-slate-500">{displayStreak >= 100 ? "100-day streak unlocked!" : "Building your 100-day streak..."}</p>
          </div>
        ) : (
          <>
            <p className="px-2 pb-3 text-center text-xs font-black uppercase tracking-[.18em] text-orange-600">100-day streak reward</p>
            <div className="relative min-h-0 overflow-auto rounded-2xl border border-amber-200 bg-amber-50 p-2">
              <img src={certificateUrl} alt="100-day streak certificate" className={`${unlocked ? "" : "opacity-45 grayscale"} mx-auto h-auto w-full rounded-xl`} />
              {!unlocked && (
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-slate-950/45 text-white backdrop-blur-[2px]">
                  <LockKeyhole size={34} />
                  <p className="mt-2 text-sm font-black">Certificate locked</p>
                  <p className="mt-1 text-xs font-semibold">Reach 100 days to unlock it.</p>
                </div>
              )}
            </div>
            <button type="button" onClick={download} disabled={!unlocked || downloading} className="mx-auto mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-teal-700 px-5 py-2 text-sm font-black text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"><Download size={17} /> {unlocked ? (downloading ? "Preparing PDF..." : "Download PDF certificate") : "Download locked"}</button>
          </>
        )}
      </div>
    </div>
  );
};

const StreakCelebration = ({ from, to, qualified, onClose }) => {
  const [displayStreak, setDisplayStreak] = useState(from);

  useEffect(() => {
    if (qualified ? displayStreak >= to : displayStreak <= to) return undefined;
    const timer = window.setTimeout(
      () =>
        setDisplayStreak((current) =>
          qualified ? Math.min(to, current + 1) : Math.max(to, current - 1),
        ),
      // Resetting from a high streak should finish quickly instead of
      // blocking the user for several seconds per displayed number.
      qualified ? 850 : 45,
    );
    return () => window.clearTimeout(timer);
  }, [displayStreak, qualified, to]);

  return (
    <div className="streak-celebration-backdrop" role="presentation">
      <div className="streak-celebration-modal" role="dialog" aria-modal="true" aria-labelledby="streak-celebration-title">
        <button type="button" onClick={onClose} className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600" aria-label="Close streak celebration">
          <X size={18} />
        </button>
        <div className={`streak-celebration-flame ${qualified ? "" : "is-reset"}`} aria-hidden="true">🔥</div>
        <p className={`mt-4 text-xs font-black uppercase tracking-[.2em] ${qualified ? "text-orange-600" : "text-slate-500"}`}>
          {qualified ? "Streak increased" : "Streak reset"}
        </p>
        <h2 id="streak-celebration-title" className="mt-2 text-center text-2xl font-black text-slate-950">
          {qualified ? "Daily challenge complete!" : "Keep practising tomorrow"}
        </h2>
        <div className={`streak-count-animation ${qualified ? "" : "is-reset"}`} key={displayStreak}>
          <span className={qualified ? "text-orange-500" : "text-slate-400"}>🔥</span> {displayStreak}
        </div>
        <p className="mt-2 text-center text-sm font-semibold text-slate-500">
          {qualified
            ? displayStreak < to
              ? `${from} + 1...`
              : `Your streak is now ${to} days!`
            : displayStreak > to
              ? `Resetting from ${from}...`
              : "Your streak is now 0 days."}
        </p>
      </div>
    </div>
  );
};

const PracticeMeta = ({ label, value, suffix = "", tone = "slate" }) => {
  const tones = {
    orange: "bg-orange-50 text-orange-900",
    slate: "bg-slate-50 text-slate-900",
    green: "bg-emerald-50 text-emerald-900",
    blue: "bg-sky-50 text-sky-900",
    yellow: "bg-amber-50 text-amber-900",
  };

  return (
    <div className={`rounded-2xl p-3 ${tones[tone] || tones.slate}`}>
      <p className="text-[10px] font-black uppercase tracking-wide opacity-70">
        {label}
      </p>
      <p className="mt-1 break-words text-xl font-black leading-tight sm:text-2xl">
        {value}
      </p>
      {suffix && <p className="mt-1 text-[10px] font-bold opacity-70">{suffix}</p>}
    </div>
  );
};

/* ---------- Reusable components ---------- */

const Completed = ({ challenge, streak, celebrate = false }) => {
  const [expandedQuestion, setExpandedQuestion] = useState(null);
  const [revealedAnswers, setRevealedAnswers] = useState({});
  const [previewImage, setPreviewImage] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const [downloadingCertificate, setDownloadingCertificate] = useState(false);
  const downloadInProgress = useRef(false);
  const studentName = getStoredAuth()?.user?.name || "Student";
  const marksCounted = Number(
    challenge.scoredQuestionCount ?? challenge.questionCount ?? 0,
  );
  const marksAttempted = Number(challenge.scoredAttemptedCount ?? 0);
  const currentStreak = Math.min(
    100,
    Math.max(0, Number(streak.currentStreak || 0)),
  );
  const canDownloadCertificate = currentStreak >= 100;
  const streakFillWidth =
    currentStreak === 100
      ? "100%"
      : currentStreak === 0
        ? "0%"
        : `max(0%, calc(${currentStreak}% - 20px))`;
  const streakLabelPosition =
    currentStreak === 100
      ? "100%"
      : `min(${currentStreak}%, calc(100% - 42px))`;

  const downloadCertificate = async () => {
    if (downloadInProgress.current) return;
    downloadInProgress.current = true;
    setDownloadingCertificate(true);

    const certificateDate = challenge.completedAt
      ? new Date(challenge.completedAt).toLocaleDateString()
      : new Date().toLocaleDateString();
    const certificateId = `SCI2-100-${String(challenge.localDate || "").replace(/[^0-9]/g, "") || "STREAK"}`;
    const loadImage = (source) =>
      new Promise((resolve) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => resolve(null);
        image.src = source;
      });
    const [logoImage, signatureImage] = await Promise.all([
      loadImage(logo),
      loadImage(signature),
    ]);
    const canvas = document.createElement("canvas");
    canvas.width = 1600;
    canvas.height = 1100;
    const context = canvas.getContext("2d");
    const gradient = context.createLinearGradient(0, 0, 1600, 1100);
    gradient.addColorStop(0, "#fffdf5");
    gradient.addColorStop(1, "#fff7ed");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 1600, 1100);
    context.strokeStyle = "#0f766e";
    context.lineWidth = 28;
    context.strokeRect(24, 24, 1552, 1052);
    context.strokeStyle = "#f59e0b";
    context.lineWidth = 4;
    context.strokeRect(52, 52, 1496, 996);
    if (logoImage) context.drawImage(logoImage, 755, 90, 90, 90);
    context.textAlign = "center";
    context.fillStyle = "#b45309";
    context.font = "800 24px Arial";
    context.fillText("CERTIFICATE OF ACHIEVEMENT", 800, 245);
    context.fillStyle = "#0f766e";
    context.font = "bold 68px Georgia";
    context.fillText("100-Day Streak", 800, 335);
    context.fillStyle = "#475569";
    context.font = "28px Arial";
    context.fillText("This certificate is proudly presented to", 800, 405);
    context.fillStyle = "#111827";
    context.font = "bold 46px Georgia";
    context.fillText(studentName, 800, 490);
    context.strokeStyle = "#334155";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(470, 510);
    context.lineTo(1130, 510);
    context.stroke();
    context.fillStyle = "#475569";
    context.font = "24px Arial";
    const achievementLines = [
      "For completing 100 consecutive days of the",
      "Innovative Science 2 Daily Streak Challenge",
      "with dedication, consistency, and a commitment to learning.",
    ];
    achievementLines.forEach((line, lineIndex) => {
      context.fillText(line, 800, 565 + lineIndex * 36);
    });
    context.textAlign = "left";
    context.font = "bold 20px Arial";
    context.fillText(`Completed on: ${certificateDate}`, 230, 790);
    context.fillText(`Certificate ID: ${certificateId}`, 230, 835);
    if (signatureImage) context.drawImage(signatureImage, 1160, 700, 190, 65);
    context.strokeStyle = "#334155";
    context.beginPath();
    context.moveTo(1130, 785);
    context.lineTo(1380, 785);
    context.stroke();
    context.textAlign = "center";
    context.font = "18px Arial";
    context.fillText("Authorized Signature", 1255, 820);
    context.font = "bold 18px Arial";
    context.fillText("Innovative Science 2", 1255, 850);
    context.fillStyle = "#0f766e";
    context.font = "bold 18px Arial";
    context.fillText("LEARN · PRACTICE · GROW", 800, 980);

    const jpegData = canvas.toDataURL("image/jpeg", 0.94);
    const jpegBytes = Uint8Array.from(
      atob(jpegData.split(",")[1]),
      (character) => character.charCodeAt(0),
    );
    const encoder = new TextEncoder();
    const chunks = [];
    const offsets = [];
    let length = 0;
    const add = (chunk) => {
      const bytes = typeof chunk === "string" ? encoder.encode(chunk) : chunk;
      chunks.push(bytes);
      length += bytes.length;
    };
    const object = (number, content) => {
      offsets[number] = length;
      add(`${number} 0 obj\n${content}\nendobj\n`);
    };
    add("%PDF-1.3\n%\xFF\xFF\xFF\xFF\n");
    object(1, "<< /Type /Catalog /Pages 2 0 R >>");
    object(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
    object(
      3,
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>",
    );
    const content = "q\n842 0 0 595 0 0 cm\n/Im0 Do\nQ";
    object(
      4,
      `<< /Length ${encoder.encode(content).length} >>\nstream\n${content}\nendstream`,
    );
    offsets[5] = length;
    add(
      `5 0 obj\n<< /Type /XObject /Subtype /Image /Width 1600 /Height 1100 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`,
    );
    add(jpegBytes);
    add("\nendstream\nendobj\n");
    const xrefOffset = length;
    add(
      `xref\n0 6\n0000000000 65535 f \n${offsets
        .slice(1)
        .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
        .join(
          "",
        )}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`,
    );
    const pdf = new Blob(chunks, { type: "application/pdf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(pdf);
    link.download = `innovative-science-100-day-streak-${String(challenge.localDate || "certificate")}.pdf`;
    link.click();
    URL.revokeObjectURL(link.href);
    downloadInProgress.current = false;
    setDownloadingCertificate(false);
  };

  return (
    <section className="completed-summary-shell mx-auto max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-orange-100 bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50 px-4 py-4 sm:px-6">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-orange-700">
              100-day streak journey
            </p>
            <p className="mt-1 text-sm font-bold text-slate-700">
              Day {currentStreak} of 100
            </p>
          </div>
          <span className="sr-only">{currentStreak}% complete</span>
        </div>
        <div className="relative mt-7 h-4 rounded-full bg-orange-100/80 p-0.5 shadow-inner">
          <div
            className={`h-3 rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-300 shadow-sm transition-[width] duration-1000 ease-out ${celebrate ? "animate-pulse" : ""}`}
            style={{ width: streakFillWidth }}
          />
          <span
            className="absolute -top-7 -translate-x-1/2 text-sm font-black text-orange-700 transition-[left] duration-1000 ease-out"
            style={{ left: streakLabelPosition }}
          >
            {currentStreak}%
          </span>
          {challenge.streakMilestoneImage?.imageData ? (
            <button
              type="button"
              onClick={() => setPreviewImage(true)}
              aria-label="View streak milestone image"
              className={`absolute -right-1 -top-3 grid h-10 w-10 place-items-center overflow-hidden rounded-xl border-2 border-white bg-white shadow-md transition hover:scale-110 ${celebrate ? "animate-bounce" : ""}`}
            >
              <img
                src={challenge.streakMilestoneImage.imageData}
                alt="Streak milestone"
                className="h-full w-full object-cover"
              />
            </button>
          ) : (
            <div className="absolute -right-1 -top-1 h-6 w-6 rounded-full border-4 border-white bg-yellow-300 shadow" />
          )}
        </div>
        <div className="mt-2 flex justify-between text-[10px] font-bold text-orange-700/70">
          <span>Start</span>
          <span>100 days</span>
        </div>
        <>
          {currentStreak >= 100 && <button
            type="button"
            onClick={() => setShowReward(true)}
            className="ml-auto mt-3 flex w-fit min-h-8 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-600 to-amber-500 px-4 py-1.5 text-xs font-black text-white shadow-md shadow-fuchsia-200 transition hover:scale-[1.03] hover:shadow-lg"
          >
            <Sparkles size={13} />
            Claim reward
            <Sparkles size={13} />
          </button>}
        </>
      </div>
      <div className="bg-gradient-to-br from-teal-700 to-cyan-700 px-4 py-7 text-center text-white sm:px-8 sm:py-9">
        <div
          className={`mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/20 ${celebrate ? "animate-bounce" : ""}`}
        >
          <Trophy size={28} className="text-amber-300" />
        </div>

        <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.2em] text-teal-100">
          Daily challenge
        </p>

        <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
          Challenge complete!
        </h2>

        <p className="mx-auto mt-2 max-w-md text-sm leading-5 text-teal-50">
          You showed up and put your science knowledge to the test.
        </p>
      </div>

      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-teal-50 p-3 text-center">
            <p className="text-xs font-semibold text-teal-700">Marks counted</p>
            <p className="mt-1 text-2xl font-black text-teal-900">
              {challenge.score ?? challenge.correctCount ?? 0}
              <span className="text-lg text-teal-500">/{marksCounted}</span>
            </p>
            <p className="mt-1 text-[11px] font-semibold text-teal-700">
              {marksAttempted} scorable attempted
            </p>
          </div>

          <div className="rounded-2xl bg-emerald-50 p-3 text-center">
            <p className="text-xs font-semibold text-emerald-700">
              Right questions
            </p>
            <p className="mt-1 text-2xl font-black text-emerald-900">
              {challenge.correctCount ?? 0}
              <span className="text-lg text-emerald-500">
                /{challenge.questionCount ?? 0}
              </span>
            </p>
            <p className="mt-1 text-[11px] font-semibold text-emerald-700">
              total correct
            </p>
          </div>

          <div className="rounded-2xl bg-sky-50 p-3 text-center">
            <p className="text-xs font-semibold text-sky-700">Accuracy</p>
            <p className="mt-1 text-2xl font-black text-sky-900">
              {challenge.accuracy ?? 0}%
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-center gap-3 rounded-2xl border border-orange-100 bg-orange-50 p-3">
          <Flame size={24} className="shrink-0 text-orange-500" />
          <div>
            <p className="text-sm font-bold text-slate-900">
              {challenge.streakQualified
                ? `${streak.currentStreak}-day streak`
                : "No streak credit today"}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {challenge.streakQualified
                ? "You got 10 or more eligible questions right. Keep practising to build your daily habit."
                : "Get at least 10 eligible questions right in a daily challenge to earn streak credit."}
            </p>
          </div>
        </div>

        <div
          id="completed-questions"
          className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5"
        >
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Today&apos;s question{challenge.questions?.length === 1 ? "" : "s"}{" "}
            ({challenge.questions?.length || 0})
          </p>
          <div className="mt-3 space-y-3">
            {(challenge.questions || []).map((question, questionIndex) => (
              <div
                key={question._id || questionIndex}
                className={`question-protected overflow-hidden rounded-xl border-2 ${
                  !question.submitted
                    ? "border-slate-200 bg-white"
                    : question.isScored === false
                      ? "border-amber-300 bg-amber-50/30"
                      : question.isCorrect
                        ? "border-emerald-300 bg-emerald-50/30"
                        : "border-rose-300 bg-rose-50/30"
                }`}
                onContextMenu={(event) => event.preventDefault()}
                onCopy={(event) => event.preventDefault()}
                onCut={(event) => event.preventDefault()}
                onDragStart={(event) => event.preventDefault()}
                onSelectStart={(event) => event.preventDefault()}
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedQuestion(
                      expandedQuestion === questionIndex ? null : questionIndex,
                    )
                  }
                  aria-expanded={expandedQuestion === questionIndex}
                  className="w-full p-4 text-left transition hover:bg-slate-50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-bold text-teal-700">
                      Question {questionIndex + 1}
                    </p>
                    {question.submitted && (
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-black ${
                          question.isScored === false
                            ? "bg-amber-100 text-amber-800"
                            : question.isCorrect
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {question.isScored === false
                          ? "Not counted"
                          : question.isCorrect
                            ? "Correct"
                            : "Wrong"}
                      </span>
                    )}
                  </div>
                  <p
                    className={`mt-1 whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-slate-800 ${
                      expandedQuestion === questionIndex ? "" : "line-clamp-2"
                    }`}
                  >
                    {question.question || "Question unavailable."}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-slate-400">
                    {expandedQuestion === questionIndex
                      ? "Hide answer"
                      : "Tap to view your answer"}
                  </p>
                </button>

                {expandedQuestion === questionIndex && (
                  <div className="border-t border-slate-100 px-4 pb-4 pt-4">
                    {question.imageUrl && (
                      <div className="mb-4 flex min-h-24 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <img
                          src={assetUrl(question.imageUrl)}
                          alt="Question diagram"
                          className="max-h-60 max-w-full object-contain"
                        />
                      </div>
                    )}

                    {question.pairs?.length > 0 && (
                      <div className="mb-4 overflow-hidden rounded-xl border border-slate-200">
                        {question.pairs.map((pair, pairIndex) => (
                          <div
                            key={`${pair.left}-${pair.right}`}
                            className={`grid grid-cols-2 gap-3 px-3 py-2 text-sm ${
                              pairIndex % 2 === 0 ? "bg-slate-50" : "bg-white"
                            }`}
                          >
                            <span className="break-words font-medium text-slate-800">
                              {pair.left}
                            </span>
                            <span className="break-words text-slate-600">
                              {pair.right}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Your selected answer
                    </p>
                    {["complete-the-tables", "diagram-based-question"].includes(
                      question.type,
                    ) ? (
                      revealedAnswers[questionIndex] ? (
                        <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-3 text-sm text-emerald-900">
                          <p className="text-xs font-black uppercase tracking-wider text-emerald-700">
                            Answer
                          </p>
                          <p className="mt-1 font-bold leading-6">
                            {question.correctAnswer ||
                              question.solution ||
                              "Answer unavailable."}
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              setRevealedAnswers((current) => ({
                                ...current,
                                [questionIndex]: false,
                              }))
                            }
                            className="mt-3 rounded-full bg-emerald-700 px-4 py-2 text-xs font-black text-white transition hover:bg-emerald-800"
                          >
                            Done
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setRevealedAnswers((current) => ({
                              ...current,
                              [questionIndex]: true,
                            }))
                          }
                          className="rounded-full bg-slate-900 px-4 py-2.5 text-sm font-black text-white transition hover:bg-slate-700"
                        >
                          Show answer
                        </button>
                      )
                    ) : (
                      <div className="space-y-2">
                        {(question.options || []).map((option, optionIndex) => {
                          const isSelected =
                            question.selectedAnswer === optionIndex;

                          return (
                            <div
                              key={`${option}-${optionIndex}`}
                              className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 text-sm ${
                                isSelected
                                  ? question.isScored === false
                                    ? "border-amber-300 bg-amber-50 text-amber-900"
                                    : question.isCorrect
                                      ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                                      : "border-rose-300 bg-rose-50 text-rose-900"
                                  : "border-slate-100 bg-slate-50 text-slate-500"
                              }`}
                            >
                              <span className="font-bold">
                                {String.fromCharCode(65 + optionIndex)}.
                              </span>
                              <span className="min-w-0 flex-1 break-words">
                                {option}
                              </span>
                              {isSelected && (
                                <span className="shrink-0 text-xs font-bold">
                                  {question.isScored === false
                                    ? "Not counted"
                                    : question.isCorrect
                                      ? "Correct"
                                      : "Wrong"}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {!question.isCorrect &&
                      question.correctAnswer &&
                      ![
                        "complete-the-tables",
                        "diagram-based-question",
                      ].includes(question.type) && (
                        <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-3 text-sm text-emerald-900">
                          <p className="text-xs font-black uppercase tracking-wider text-emerald-700">
                            Correct answer
                          </p>
                          <p className="mt-1 font-bold leading-6">
                            {question.correctAnswer}
                          </p>
                        </div>
                      )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <Link
            to="/chapters"
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft size={17} />
            Back to chapters
          </Link>
        </div>
      </div>
      {previewImage && challenge.streakMilestoneImage?.imageData && (
        <div
          className="fixed inset-0 z-[1200] grid place-items-center overflow-hidden bg-slate-950/90 p-0"
          role="dialog"
          aria-modal="true"
          aria-label="Streak milestone image"
          onClick={() => setPreviewImage(false)}
        >
          <div
            className="relative flex h-full w-full items-center justify-center"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewImage(false)}
              className="absolute -right-3 -top-3 grid h-9 w-9 place-items-center rounded-full bg-slate-900 text-xl font-black text-white"
            >
              ×
            </button>
            <img
              src={challenge.streakMilestoneImage.imageData}
              alt="Streak milestone"
              className="block max-h-full max-w-full object-contain"
            />
          </div>
        </div>
      )}
      {showReward && (
        <div
          className="fixed inset-0 z-[300] grid place-items-center overflow-hidden bg-slate-950/85 p-5"
          role="dialog"
          aria-modal="true"
          aria-label="100-day streak reward"
          onClick={() => setShowReward(false)}
        >
          <div
            className="relative w-full max-w-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowReward(false)}
              aria-label="Close certificate"
              className="absolute right-5 top-7 z-[50] grid h-9 w-9 place-items-center rounded-full border-2 border-white bg-rose-600 text-xl font-black leading-none text-white shadow-lg transition hover:bg-rose-700"
            >
              ×
            </button>
            <div className="relative p-5 text-center sm:p-7">
              <div className="relative mt-5 animate-[reward-pop_700ms_cubic-bezier(.2,.9,.2,1)] rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-white via-amber-50 to-teal-50 p-4 text-left text-slate-800 shadow-2xl sm:p-6">
                <div className="text-center">
                  <img
                    src={logo}
                    alt="Innovative Science 2"
                    className="mx-auto h-14 w-14 object-contain"
                  />
                  <p className="mt-2 text-[10px] font-black uppercase tracking-[0.22em] text-amber-700">
                    Certificate of Achievement
                  </p>
                  <h4 className="mt-1 font-serif text-2xl font-black text-teal-800">
                    100-Day Streak
                  </h4>
                  <p className="mt-3 text-xs text-slate-500">
                    This certificate is proudly presented to
                  </p>
                  <p className="mt-2 border-b border-slate-400 pb-1 text-xl font-black text-slate-900">
                    {studentName}
                  </p>
                  <p className="mt-4 text-xs leading-5 text-slate-600">
                    For completing 100 consecutive days of the Innovative
                    Science 2 Daily Streak Challenge with dedication and
                    consistency.
                  </p>
                </div>
                <div className="mt-5 flex items-end justify-between gap-4 text-[10px] text-slate-500">
                  <span>
                    Completed:{" "}
                    {challenge.completedAt
                      ? new Date(challenge.completedAt).toLocaleDateString()
                      : challenge.localDate || "Today"}
                  </span>
                  <span className="text-center">
                    <img
                      src={signature}
                      alt="Authorized signature"
                      className="mx-auto mb-1 h-8 max-w-[110px] object-contain"
                    />
                    <span className="mx-auto block w-[110px] border-t border-slate-400 pt-1">
                      Authorized Signature
                    </span>
                    <strong>Innovative Science 2</strong>
                  </span>
                </div>
                {!canDownloadCertificate && (
                  <div className="absolute inset-0 z-10 grid place-items-center rounded-2xl bg-slate-950/70 p-5 text-center text-white backdrop-blur-[2px]">
                    <div>
                      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-slate-900/90 ring-4 ring-white/30">
                        <LockKeyhole size={34} />
                      </div>
                      <p className="mt-3 text-sm font-black">
                        Certificate locked
                      </p>
                      <p className="mt-1 text-xs font-semibold text-white/80">
                        Complete 100 days to unlock your certificate and PDF
                        download.
                      </p>
                    </div>
                  </div>
                )}
              </div>
              {canDownloadCertificate && (
                <button
                  type="button"
                  onClick={downloadCertificate}
                  disabled={downloadingCertificate}
                  className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-amber-300 px-6 py-3 text-sm font-black text-violet-950 transition hover:bg-amber-200 disabled:cursor-wait disabled:opacity-60"
                >
                  {downloadingCertificate
                    ? "Preparing PDF..."
                    : "Download certificate as PDF"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

const EmptyState = () => (
  <main className="grid min-h-[70vh] place-items-center bg-slate-50 px-4 py-12">
    <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-9">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-teal-50 text-teal-600">
        <LockKeyhole size={30} />
      </div>

      <h1 className="mt-5 text-2xl font-black tracking-tight text-slate-900">
        Your streak starts here
      </h1>

      <p className="mt-3 text-sm leading-6 text-slate-500">
        Practise at least one regular question from a chapter to unlock that
        chapter for your personalised daily challenge. Skipped questions do not
        unlock a chapter.
      </p>

      <Link
        to="/chapters"
        className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 font-bold text-white transition hover:bg-teal-700"
      >
        Start practising
        <ArrowRight size={17} />
      </Link>
    </section>
  </main>
);

export default DailyStreakPage;
