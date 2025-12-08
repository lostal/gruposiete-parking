"use client";

import { useEffect, useRef, Suspense, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type NProgressType from "nprogress";

// Custom NProgress styles for brutalista theme
const nprogressStyles = `
#nprogress {
  pointer-events: none;
}

#nprogress .bar {
  background: #fdc373;
  position: fixed;
  z-index: 9999;
  top: 0;
  left: 0;
  width: 100%;
  height: 4px;
  border-bottom: 2px solid #343f48;
  box-shadow: 2px 2px 0 #343f48;
}

#nprogress .peg {
  display: block;
  position: absolute;
  right: 0px;
  width: 100px;
  height: 100%;
  box-shadow: 0 0 10px #fdc373, 0 0 5px #fdc373;
  opacity: 1;
  transform: rotate(3deg) translate(0px, -4px);
}

#nprogress .spinner {
  display: none;
}
`;

function NavigationProgressInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const previousPathRef = useRef<string | null>(null);
  const [nprogressLib, setNprogressLib] = useState<typeof NProgressType | null>(
    null,
  );

  // Dynamically import nprogress to avoid SSR issues
  useEffect(() => {
    import("nprogress").then((mod) => {
      mod.default.configure({
        showSpinner: false,
        minimum: 0.1,
        speed: 300,
        trickleSpeed: 200,
      });
      setNprogressLib(mod.default);
    });
  }, []);

  useEffect(() => {
    if (!nprogressLib) return;

    const currentPath = pathname + (searchParams?.toString() || "");

    // Only run after initial mount
    if (
      previousPathRef.current !== null &&
      currentPath !== previousPathRef.current
    ) {
      nprogressLib.done();
    }

    previousPathRef.current = currentPath;

    return () => {
      nprogressLib.done();
    };
  }, [pathname, searchParams, nprogressLib]);

  return null;
}

export function NavigationProgress() {
  useEffect(() => {
    // Inject styles
    const style = document.createElement("style");
    style.id = "nprogress-styles";
    style.textContent = nprogressStyles;

    // Avoid duplicate injection
    if (!document.getElementById("nprogress-styles")) {
      document.head.appendChild(style);
    }

    let nprogressInstance: typeof NProgressType | null = null;

    // Dynamically import and setup click handler
    import("nprogress").then((mod) => {
      nprogressInstance = mod.default;
      nprogressInstance.configure({
        showSpinner: false,
        minimum: 0.1,
        speed: 300,
        trickleSpeed: 200,
      });
    });

    // Intercept link clicks to start progress
    const handleClick = (e: MouseEvent) => {
      if (!nprogressInstance) return;

      const target = e.target as HTMLElement;
      const anchor = target.closest("a");

      if (
        anchor &&
        anchor.href &&
        anchor.href.startsWith(window.location.origin) &&
        !anchor.hasAttribute("download") &&
        anchor.target !== "_blank" &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.defaultPrevented
      ) {
        nprogressInstance.start();
      }
    };

    document.addEventListener("click", handleClick);

    return () => {
      document.removeEventListener("click", handleClick);
      const existingStyle = document.getElementById("nprogress-styles");
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  return (
    <Suspense fallback={null}>
      <NavigationProgressInner />
    </Suspense>
  );
}
