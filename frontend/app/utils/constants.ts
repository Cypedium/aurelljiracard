// Backendens bas-URL; inlinas vid build (.env.local lokalt, [build.args] i fly.app.toml)
export const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Alla nycklar i localStorage; se session.ts och logout.ts
export const STORAGE_KEYS = {
  accessToken: "accessToken",
  refreshToken: "refreshToken",
  username: "username",
  userLayout: "user_layout",
  collapsedColumns: "collapsed_columns",
} as const;
