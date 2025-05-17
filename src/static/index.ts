export const APP_NAME = "PsychGenAfrica"
export const BASE_URL = "https://algorithmxcomp.pythonanywhere.com/api"
export const AUTH_TOKEN = "psychgen-auth-token"
export const REFRESH_TOKEN = "psychgen-refresh-token"
export const API_COOKIE = "csrftoken"

export const navItems: { name: string; path: string }[] = [
  {
    name: "Home",
    path: "/",
  },
  {
    name: "About",
    path: "/about",
  },
  {
    name: "Analysis",
    path: "/analysis",
  },
  {
    name: "Search",
    path: "/search",
  },
  {
    name: "ỌpọlọAI",
    path: "/OpoloAI",
  },
]

export const protectedRoutes = ["/admin"]
