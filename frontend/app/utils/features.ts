import { isAdmin } from "./session";

// Backloggen är under arbete: bara sajtens admin ser den (länk, sida, "From backlog").
// Sätt till true när den fungerar för alla. Bara UI:t; backend tillåter fortfarande status "backlog"
export const BACKLOG_FOR_EVERYONE = false;

export const backlogVisible = (siteAdmin: boolean): boolean => BACKLOG_FOR_EVERYONE || siteAdmin;

export const canUseBacklog = (): boolean => backlogVisible(isAdmin());
