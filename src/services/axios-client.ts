import axios from "axios";
import { API_COOKIE, AUTH_TOKEN, BASE_URL } from "../static";
import Cookies from "js-cookie";

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    Accept: "application/json",
  },
  timeout: 60000,
  timeoutErrorMessage: "Request timed out. Please try again.",
  // withCredentials: true,
  withXSRFToken: true,
});

// Intercept all requests
client.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercept all responses
client.interceptors.response.use(
  async (response) => {
    return response;
  },
  async (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      if (
        typeof window !== "undefined" &&
        window.location.href.startsWith("/admin")
      ) {
        Cookies.remove(AUTH_TOKEN);
        Cookies.remove(API_COOKIE);
        window.history.pushState({}, "", "/admin/login");
      }
      return null;
    } else if (
      status >= 400 &&
      status <= 500
      // (status >= 500 && status < 600)
    ) {
      return Promise.reject({
        message: error.response?.data?.message,
      });
    }

    if (error?.message === "Network Error") {
      return Promise.reject({
        message: "Please check your internet connection and try again.",
      });
    }

    return Promise.reject(error);
  }
);

export default async () => {
  return client;
};