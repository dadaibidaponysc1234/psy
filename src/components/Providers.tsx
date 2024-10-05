"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppProgressBar as ProgressBar } from "next-nprogress-bar";

import { PropsWithChildren } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const Providers = ({ children }: PropsWithChildren) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ProgressBar
        style="style"
        options={{
          showSpinner: false,
          easing: "ease",
          // speed: 200,
          // trickle: true,
          // trickleSpeed: 200,
        }}
        shallowRouting
      />
      {children}
    </QueryClientProvider>
  );
};

export default Providers;
