# From login to a fully loaded board

What happens, in order, from pressing **Log in** until the board shows its cards (`/cards`). Paths are in `frontend/app/`.

## 1. Overview

```mermaid
flowchart TD
    A["Login page /login<br/>LoginForm"] -->|"POST /auth/login"| B["saveSession()<br/>tokens + username → sessionStorage"]
    B -->|"window.location.href = /cards<br/>(full page load, not client navigation)"| C["Browser requests /cards"]
    C --> D["Server sends prerendered HTML + CSS<br/>Navbar (logged-out look) · Layout 'Loading...' · Footer"]
    D --> E["First paint<br/>Footer is final already"]
    E --> F["JS loaded → React hydrates<br/>RootLayout → ClientLayout → Navbar · main · Footer · Toaster"]
    F --> G["useLayoutEffect<br/>applyAppearance(): board + navbar colours"]
    G --> H["useEffect (children first, then parents)"]
    H --> H1["Navbar: login state, username, admin<br/>useBoards → GET /board"]
    H --> H2["Layout: hasSession() → isAuthenticated = true"]
    H1 --> I["Navbar re-renders: links + AccountMenu (lazy chunk)"]
    H2 --> J["Layout renders CardsPage → Cards<br/>no board yet → renders nothing"]
    I --> K{"GET /board answered"}
    J --> K
    K --> L["Navbar: BoardSwitcher + sub row (lazy chunks)"]
    K --> M["Cards: BoardView key=boardId<br/>BoardSkeleton shown"]
    M --> N["In parallel:<br/>GET /board/:id/card<br/>GET /user/layout<br/>GET /board/:id/column"]
    N --> O["All three done → skeleton removed<br/>react-grid-layout draws the cards"]
    O --> P["Cards' IssueTypeIcon → useIssueTypes<br/>GET /board/:id/issue-type (once per board)"]
    P --> Q["Board fully loaded"]
```

## 2. Timeline (who talks to whom)

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant B as Browser
    participant N as Next.js (frontend)
    participant API as API (server-java)

    U->>B: Log in (username + password)
    B->>API: POST /auth/login
    API-->>B: accessToken + refreshToken
    B->>B: saveSession() → sessionStorage
    B->>N: GET /cards (full page load)
    N-->>B: static HTML + CSS + JS chunks
    Note over B: First paint: Navbar (logged out look),<br/>"Loading...", Footer
    B->>B: Hydrate · applyAppearance() · Navbar + Layout effects
    B->>API: POST /invite/:token (only if an invite was opened before login)
    B->>API: GET /board
    API-->>B: the user's boards
    Note over B: Navbar: BoardSwitcher, Share, sub row<br/>Board: skeleton
    par board data
        B->>API: GET /board/:id/card
    and
        B->>API: GET /user/layout
    and
        B->>API: GET /board/:id/column
    end
    API-->>B: cards, layout, lists
    Note over B: Skeleton removed, cards drawn
    B->>API: GET /board/:id/issue-type
    API-->>B: issue types (icons get their colours)
    Note over B: Fully loaded
```

## 3. Component tree and render order

React renders **top to bottom** (Navbar → main → Footer). Effects run **children first**, then parents, siblings in order.

```mermaid
flowchart TD
    RL["layout.tsx · RootLayout<br/>(server) html, body, root.css"] --> CL["client-layout.tsx · ClientLayout<br/>useLayoutEffect: applyAppearance"]
    CL --> NAV["1 · Navbar<br/>useBoards() · login state"]
    CL --> MAIN["2 · main (board background)"]
    CL --> FOOT["3 · Footer<br/>static, no data"]
    CL --> TOAST["4 · Toaster (sonner)"]
    NAV --> AM["AccountMenu (lazy)"]
    NAV --> BS["BoardSwitcher (lazy, on /cards)"]
    NAV --> SH["ShareBoardDialog (lazy)"]
    MAIN --> CP["cards/page.tsx · CardsPage"]
    CP --> LAY["Layout<br/>auth gate: 'Loading...' until checked"]
    LAY --> CARDS["Cards<br/>waits for useBoards().current"]
    CARDS --> BV["BoardView key=boardId<br/>useBoardData: cards, layout, lists"]
    BV --> SK["BoardSkeleton (while loading)"]
    BV --> GRID["react-grid-layout → BoardCard → IssueTypeIcon<br/>useIssueTypes"]
```

## 4. When each part is ready

| Step | Navbar | Main (CardsPage) | Footer |
|---|---|---|---|
| HTML arrives (first paint) | Logo only, logged-out look, default colours | "Loading..." (Layout) | **Final** |
| Hydration + layout effect | Saved navbar colours applied | Saved board background applied | — |
| Effects run | Links, username, admin; AccountMenu chunk loads | Auth OK → Cards, nothing shown yet (no board) | — |
| `GET /board` done | BoardSwitcher, Share, sub row (Create card …) | BoardView + skeleton | — |
| Cards, layout, lists done | — | Cards drawn in their lists | — |
| Issue types done | — | Icons in the right colours | — |

## Notes

- **Full reload after login**: `window.location.href` (not `router.push`) makes the browser fetch `/cards` again, so the navbar, `useBoards` and the axios instance all start fresh with the new session.
- **Footer** has no state or data, so it is final in the first HTML.
- **Navbar** is prerendered as logged out (the server can't read `sessionStorage`) and switches to logged in after its first effect.
- **`useBoards`** is shared: the Navbar's effect starts `GET /board`; `Cards` calls the same hook, finds the request in flight and waits for the same answer.
- **Expired access token**: any request that gets `401` goes through the axios interceptor in `api/api.ts` (`POST /auth/refresh`, then retry), which adds one round trip at that step.
- **Board switch** (navbar): only `BoardView` remounts (`key={boardId}`) and refetches cards, lists and issue types; the layout request runs again too, Navbar and Footer stay.
