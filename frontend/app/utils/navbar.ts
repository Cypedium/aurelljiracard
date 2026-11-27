import type { ComponentType, SVGProps } from "react";
import { PencilSquareIcon, PlusIcon, ShareIcon, TrashIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { BOARD_ACTIONS, type BoardAction } from "./boardActions";
import { BOARD_ACTION_FEATURES, type FeatureKey } from "./features";
import { msg } from "./i18n";
import { ROUTES } from "./routes";

export type NavIcon = ComponentType<SVGProps<SVGSVGElement>>;
// label is the English text; the navbar translates it
export type SubAction = { label: string; action: BoardAction; Icon: NavIcon };

export type NavPage = {
  pathname: string;
  loggedIn: boolean;
  // The selected board's admin (its owner)
  boardAdmin: boolean;
  hasBoard: boolean;
  isOn: (key: FeatureKey) => boolean;
};

// The navbar's second row for the current page (desktop; in the hamburger menu on mobile).
// Only the board's admin adds and deletes columns and issue types (the backend refuses others).
// Actions whose feature is switched off are left out
export const navSubActions = ({ pathname, loggedIn, boardAdmin, hasBoard, isOn }: NavPage): SubAction[] => {
  if (!loggedIn) return [];
  const onBoard = pathname === ROUTES.board;
  const onBacklog = pathname === ROUTES.backlog;
  const onIssueTypes = boardAdmin && pathname === ROUTES.issueTypes;

  const actions: SubAction[] = [];
  if (onBoard || onBacklog) actions.push({ label: msg("Create card"), action: BOARD_ACTIONS.createCard, Icon: PencilSquareIcon });
  if (onBoard && boardAdmin) {
    actions.push({ label: msg("Create column"), action: BOARD_ACTIONS.createColumn, Icon: PlusIcon });
    actions.push({ label: msg("Delete column"), action: BOARD_ACTIONS.deleteColumn, Icon: TrashIcon });
  }
  // The owner invites; collaborators see who is on the board and can leave
  if (onBoard && hasBoard) {
    actions.push(
      boardAdmin
        ? { label: msg("Share"), action: BOARD_ACTIONS.shareBoard, Icon: ShareIcon }
        : { label: msg("Members"), action: BOARD_ACTIONS.shareBoard, Icon: UserGroupIcon },
    );
  }
  if (onIssueTypes) actions.push({ label: msg("Create Issue type"), action: BOARD_ACTIONS.createIssueType, Icon: PlusIcon });
  return actions.filter(({ action }) => isOn(BOARD_ACTION_FEATURES[action]));
};
