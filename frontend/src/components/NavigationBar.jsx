import React, { useEffect, useMemo, useState } from "react";
import { Link, matchPath, useLocation, useNavigate } from "react-router-dom";
import { UseAuth } from "../context/AuthContext";
import "./NavigationBar.css";

const NAV_ITEMS = [
  { to: "/", label: "Home" },
  { to: "/books", label: "Library" },
  { to: "/chat", label: "Chat", requiresAuth: true },
  { to: "/profile/favorites", label: "Favorites", requiresAuth: true },
  { to: "/profile/bookmarks", label: "Bookmarks", requiresAuth: true },
  { to: "/settings", label: "Settings", requiresAuth: true },
];

const getHistorySnapshot = () => {
  if (typeof window === "undefined") {
    return { index: 0, length: 1 };
  }
  return {
    index: window.history.state?.idx ?? 0,
    length: window.history.length,
  };
};

const buildBreadcrumbs = (pathname) => {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) {
    return [{ label: "Home", to: "/" }];
  }

  const crumbs = [{ label: "Home", to: "/" }];
  segments.reduce((acc, segment) => {
    const to = `${acc}/${segment}`.replace("//", "/");
    const label = segment
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
    const normalizedTo =
      to.endsWith("/") && to !== "/" ? to.slice(0, -1) : to || "/";
    crumbs.push({ label, to: normalizedTo });
    return to;
  }, "");
  return crumbs;
};

const NavigationBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin } = UseAuth();
  const [historyState, setHistoryState] = useState(getHistorySnapshot);
  const { index: historyIndex, length: historyLength } = historyState;

  const visibleNavItems = useMemo(() => {
    return NAV_ITEMS.filter((item) => {
      if (item.requiresAdmin) return isAdmin;
      if (item.requiresAuth && !isAuthenticated) return false;
      return true;
    });
  }, [isAdmin, isAuthenticated]);

  const activePath = useMemo(() => {
    const match = visibleNavItems.find((item) =>
      matchPath({ path: item.to, end: item.to === "/" }, location.pathname)
    );
    return match?.to ?? null;
  }, [location.pathname, visibleNavItems]);

  const breadcrumbs = useMemo(
    () => buildBreadcrumbs(location.pathname),
    [location.pathname]
  );

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < historyLength - 1;

  const handleBack = () => {
    if (canGoBack) navigate(-1);
  };

  const handleForward = () => {
    if (canGoForward) navigate(1);
  };

  useEffect(() => {
    const updateHistoryState = () => {
      setHistoryState(getHistorySnapshot());
    };

    updateHistoryState();
    window.addEventListener("popstate", updateHistoryState);
    return () => window.removeEventListener("popstate", updateHistoryState);
  }, []);

  useEffect(() => {
    // React Router không phát popstate khi push, nên cập nhật khi location thay đổi
    setHistoryState(getHistorySnapshot());
  }, [location.pathname]);

  return (
    <nav className="app-navigation">
      <div className="nav-history">
        <button
          type="button"
          className="nav-history-button"
          onClick={handleBack}
          disabled={!canGoBack}
          aria-label="Go back"
        >
          ←
        </button>
        <button
          type="button"
          className="nav-history-button"
          onClick={handleForward}
          disabled={!canGoForward}
          aria-label="Go forward"
        >
          →
        </button>
      </div>

      <div className="nav-breadcrumbs" aria-label="Current location">
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          if (isLast) {
            return (
              <span key={crumb.to} className="breadcrumb-item active">
                {crumb.label}
              </span>
            );
          }
          return (
            <React.Fragment key={crumb.to}>
              <Link to={crumb.to} className="breadcrumb-item">
                {crumb.label}
              </Link>
              <span className="breadcrumb-separator">/</span>
            </React.Fragment>
          );
        })}
      </div>

      <div className="nav-links">
        {visibleNavItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`nav-link${activePath === item.to ? " active" : ""}`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default NavigationBar;

