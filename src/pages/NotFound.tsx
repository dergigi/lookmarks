import { useSeoMeta } from "@unhead/react";
import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useSeoMeta({
    title: "404 - Page Not Found",
    description: "The page you are looking for could not be found. Return to the home page to continue browsing.",
  });

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="flex flex-1 items-center justify-center bg-background px-6 py-16">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold mb-3 text-foreground">404</h1>
        <p className="text-base text-muted-foreground mb-6">Oops! Page not found.</p>
        <Link to="/" className="underline hover:text-foreground transition-colors">
          Return to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
