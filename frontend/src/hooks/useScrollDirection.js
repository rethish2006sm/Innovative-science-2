
import { useEffect, useRef, useState } from "react";

const DEFAULT_THRESHOLD = 48;

const useScrollDirection = (threshold = DEFAULT_THRESHOLD) => {
  const [isVisible, setIsVisible] = useState(true);

  const lastScrollY = useRef(0);
  const accumulatedDistance = useRef(0);
  const lastDirection = useRef(null);

  useEffect(() => {
    lastScrollY.current = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY.current;

      lastScrollY.current = currentScrollY;

      // Always show navbar at the top
      if (currentScrollY <= 8) {
        accumulatedDistance.current = 0;
        lastDirection.current = null;
        setIsVisible(true);
        return;
      }

      // Ignore tiny movements
      if (Math.abs(delta) < 2) return;

      const direction = delta > 0 ? "down" : "up";

      // Reset accumulated distance when direction changes
      if (direction !== lastDirection.current) {
        accumulatedDistance.current = 0;
        lastDirection.current = direction;
      }

      accumulatedDistance.current += Math.abs(delta);

      if (accumulatedDistance.current >= threshold) {
        // Match the page gesture: downward scrolling reveals the nav, while
        // the opposite direction hides it.
        setIsVisible(direction === "up");

        accumulatedDistance.current = 0;
      }
    };

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [threshold]);

  return isVisible;
};

export default useScrollDirection;
