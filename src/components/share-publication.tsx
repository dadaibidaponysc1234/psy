"use client";

import { Details } from "@/types/study_detail";

const SharePublication = ({ title }: Details) => {
  return (
    <p
      className="text-blue-700 text-sm cursor-pointer"
      onClick={() => {
        if (typeof window !== "undefined") {
          navigator
            .share({
              text: title,
              url: window.location.href,
            })
            .catch((error) => {
              console.error("Error sharing:", error);
              navigator.clipboard.writeText(window.location.href);
            });
        } else {
          console.error("Web share API is not supported in this browser");
        }
      }}
    >
      Share publication
    </p>
  );
};

export default SharePublication;
