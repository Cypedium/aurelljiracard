// The pages' paths (the folders under app/). "/" redirects to the board or the login
export const ROUTES = {
  home: "/",
  board: "/cards",
  backlog: "/backlog",
  issueTypes: "/issue-types",
  users: "/users",
  features: "/features",
  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
} as const;
