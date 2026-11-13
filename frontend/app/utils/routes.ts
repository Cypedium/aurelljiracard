// Sidornas sökvägar (mapparna under app/). "/" skickar vidare till boarden eller inloggningen
export const ROUTES = {
  home: "/",
  board: "/cards",
  backlog: "/backlog",
  issueTypes: "/issue-types",
  users: "/users",
  login: "/login",
  register: "/register",
} as const;
