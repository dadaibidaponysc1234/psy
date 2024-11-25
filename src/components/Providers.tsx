"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppProgressBar as ProgressBar } from "next-nprogress-bar";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { PropsWithChildren } from "react";
import { Toaster } from "./misc/toaster";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    },
  },
});

const Providers = ({ children }: PropsWithChildren) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools
        initialIsOpen={false}
        buttonPosition="bottom-right"
        position="right"
      />
      <Toaster />
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
    </QueryClientProvider>
  );
};

export default Providers;
