'use client';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef, useState, type ComponentType, type ReactNode, type SVGProps } from 'react';
import logo from '../icon.png';
import { handleLogout } from '../utils/logout';
import { BOARD_ACTIONS, onBoardAction, requestBoardAction, type BoardAction } from '../utils/boardActions';
import { useBoards } from '../hooks/useBoards';
import { useFeatures } from '../hooks/useFeatures';
import { useSession } from '../hooks/useSession';
import { BOARD_ACTION_FEATURES } from '../utils/features';
import {
  AdjustmentsHorizontalIcon,
  ArrowRightStartOnRectangleIcon,
  Bars3Icon,
  PencilSquareIcon,
  PlusIcon,
  QueueListIcon,
  ShareIcon,
  TagIcon,
  TrashIcon,
  UserGroupIcon,
  UsersIcon,
  ViewColumnsIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { ROUTES } from '../utils/routes';
import {
  NAV_ICON_CLASS,
  NAV_ICON_SUB_CLASS,
  NAV_LINK_CLASS,
  NAV_MOBILE_SUB_LIST_CLASS,
  NAV_PAGE_LINK_CLASS,
  NAV_SUB_ROW_BUTTON_CLASS,
} from '../utils/styles';
import { useLanguage } from '../hooks/useLanguage';

// Logged-in users only: loaded when shown, so /login and /register skip their code (Radix popover/select/dialog)
const AccountMenu = dynamic(() => import('./AccountMenu'));
const BoardSwitcher = dynamic(() => import('./BoardSwitcher'));
const ShareBoardDialog = dynamic(() => import('./ShareBoardDialog'));

type NavIcon = ComponentType<SVGProps<SVGSVGElement>>;
type SubAction = { label: string; action: BoardAction; Icon: NavIcon };

type NavItemProps = {
  href: string;
  label: string;
  Icon: NavIcon;
  pathname: string;
  onNavigate: () => void;
  // Mobile: the page's buttons under the link
  children?: ReactNode;
};

// A page link in the navbar: icon and text, underlined on the current page (row two measures exactly that link)
const NavItem = ({ href, label, Icon, pathname, onNavigate, children }: NavItemProps) => (
  <li onClick={onNavigate}>
    <Link href={href} aria-current={pathname === href ? 'page' : undefined} className={NAV_PAGE_LINK_CLASS}>
      <Icon className={NAV_ICON_CLASS} aria-hidden />
      {label}
    </Link>
    {children}
  </li>
);

const MobileSubActions = ({ actions }: { actions: SubAction[] }) =>
  actions.length > 0 && (
    <ul className={NAV_MOBILE_SUB_LIST_CLASS}>
      {actions.map(({ label, action, Icon }) => (
        <li key={action}>
          {/* The click bubbles to the link's <li>, which closes the menu */}
          <button type="button" className={NAV_SUB_ROW_BUTTON_CLASS} onClick={() => requestBoardAction(action)}>
            <Icon className={NAV_ICON_SUB_CLASS} aria-hidden />
            {label}
          </button>
        </li>
      ))}
    </ul>
  );

const Navbar = () => {
  const pathname = usePathname();
  // Global (site) admin: manages users. The board's admin (its owner): lists, issue types, invitations
  const { loggedIn: isLoggedIn, username: userName, admin } = useSession();
  const { boards, current: board, boardAdmin } = useBoards();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  const [shareOpen, setShareOpen] = useState(false);
  // Switched-off features are hidden (the site admin sees everything)
  const { isOn, readOnly, siteAdmin } = useFeatures();
  const { t } = useLanguage();

  useEffect(() => onBoardAction(BOARD_ACTIONS.shareBoard, () => setShareOpen(true)), []);

  const logoHref = isLoggedIn ? ROUTES.board : ROUTES.home;
  const onBoard = isLoggedIn && pathname === ROUTES.board;
  const onBacklog = isLoggedIn && pathname === ROUTES.backlog;
  const onIssueTypes = isLoggedIn && boardAdmin && pathname === ROUTES.issueTypes;

  // Row two's buttons for the current page. Only the board's admin adds / deletes columns (the backend refuses others)
  const subActions: SubAction[] = [
    ...(onBoard || onBacklog ? [{ label: t('Create card'), action: BOARD_ACTIONS.createCard, Icon: PencilSquareIcon }] : []),
    ...(onBoard && boardAdmin
      ? [
          { label: t('Create column'), action: BOARD_ACTIONS.createColumn, Icon: PlusIcon },
          { label: t('Delete column'), action: BOARD_ACTIONS.deleteColumn, Icon: TrashIcon },
        ]
      : []),
    // The owner invites; collaborators see who is on the board and can leave
    ...(onBoard && board ? [{ label: boardAdmin ? t('Share') : t('Members'), action: BOARD_ACTIONS.shareBoard, Icon: boardAdmin ? ShareIcon : UserGroupIcon }] : []),
    ...(onIssueTypes ? [{ label: t('Create Issue type'), action: BOARD_ACTIONS.createIssueType, Icon: PlusIcon }] : []),
  ].filter(({ action }) => isOn(BOARD_ACTION_FEATURES[action]));

  // The Board link always comes first after the logo. The board switcher shows on every page when you are logged in and have more than
  // one board, left of the account button (desktop) / last in the hamburger menu (mobile); switching stays on the page
  const showSwitcher = isLoggedIn && Boolean(board) && boards.length > 1 && isOn('boardSwitcher');

  // Row two starts under the current page's link (Board / Backlog / Issue types). null = left-aligned
  // (mobile, where the link is hidden)
  const headerRef = useRef<HTMLElement>(null);
  const [subRowStart, setSubRowStart] = useState<number | null>(null);
  const hasSubRow = subActions.length > 0;

  useLayoutEffect(() => {
    const header = headerRef.current;
    const link = hasSubRow ? header?.querySelector<HTMLElement>('a[aria-current="page"]') : null;
    if (!link || !header) {
      setSubRowStart(null);
      return;
    }
    const measure = () => {
      const rect = link.getBoundingClientRect();
      setSubRowStart(rect.width ? rect.left - header.getBoundingClientRect().left : null);
    };
    measure();
    // The width changes with the window, font loading and when the menu changes mode
    const observer = new ResizeObserver(measure);
    observer.observe(link);
    observer.observe(header);
    return () => observer.disconnect();
  }, [pathname, hasSubRow, admin, boardAdmin, board, userName]);

  return (
    <header ref={headerRef} className="fixed z-1000 w-full font-brand">
      {/* Mobile: blurs the page behind the open menu; tapping outside closes it. The nav row (z-10) sits on top */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={closeMenu}
          aria-hidden
        />
      )}
      {/* z-10: the mobile menu goes over the row below */}
      <nav className="relative z-10 flex w-full items-center justify-between bg-nav-top py-[0.5%] pr-[2%] pl-[3%]">
        {/* Mobile: hamburger on the left, logo and name in the middle, account button on the right. Desktop: everything is in the list.
            invisible while the menu is open: the close button sits in the menu's corner, the row keeps its height */}
        <button
          className={`block text-nav-text md:hidden ${menuOpen ? 'invisible' : ''}`}
          onClick={() => setMenuOpen(true)}
          aria-label={t('Open menu')}
          aria-expanded={menuOpen}
        >
          <Bars3Icon className="size-8" aria-hidden />
        </button>
        {/* Logged out (Login/Register) the logo leads to the start page, which redirects */}
        <Link href={logoHref} className={`${NAV_LINK_CLASS} absolute left-1/2 -translate-x-1/2 text-xl text-nav-text md:hidden`}>
          <Image src={logo} alt="" className="size-7 shrink-0" priority />
          AurellTodo
        </Link>
        {isLoggedIn && userName && (
          <div className="ml-auto md:hidden">
            <AccountMenu username={userName} />
          </div>
        )}

        {/* Mobile: hidden until the menu opens, then fills the screen below the row with a 12px margin all round
            (100% = the nav row, absolutely positioned). Desktop: always visible on one row */}
        <ul
          className={`${menuOpen ? 'flex' : 'hidden'} absolute top-full inset-x-3 mt-3 h-[calc(100dvh-100%-1.5rem)] flex-col overflow-y-auto gap-4 rounded-lg bg-nav-top p-8 text-xl text-nav-text shadow-2xl md:static md:mt-0 md:flex md:h-auto md:overflow-visible md:flex-1 md:flex-row md:items-center md:gap-10 md:bg-transparent md:p-0 md:shadow-none`}
        >
          {/* Mobile: the close button in the menu's top right corner */}
          <li className="absolute top-3 right-3 md:hidden">
            <button type="button" className="block rounded-md text-nav-text hover:bg-white/10" onClick={closeMenu} aria-label={t('Close menu')}>
              <XMarkIcon className="size-8" aria-hidden />
            </button>
          </li>
          <li className="hidden md:block">
            <Link href={logoHref} className={NAV_LINK_CLASS}>
              {/* Same image as the favicon (app/icon.png) */}
              <Image src={logo} alt="" className="size-7 shrink-0" priority />
              AurellTodo
            </Link>
          </li>
          {isLoggedIn && (
            <>
              <NavItem href={ROUTES.board} label={t('Board')} Icon={ViewColumnsIcon} pathname={pathname} onNavigate={closeMenu} />
              {/* Mobile: the board's buttons (Create card, Share …), which are otherwise in row two */}
              {onBoard && (
                <li className="md:hidden" onClick={closeMenu}>
                  <MobileSubActions actions={subActions} />
                </li>
              )}
              {isOn('backlogPage') && (
                <NavItem href={ROUTES.backlog} label={t('Backlog')} Icon={QueueListIcon} pathname={pathname} onNavigate={closeMenu}>
                  {onBacklog && <MobileSubActions actions={subActions} />}
                </NavItem>
              )}
              {/* Site admin only; the backend refuses others (403) */}
              {admin && <NavItem href={ROUTES.users} label={t('Users')} Icon={UsersIcon} pathname={pathname} onNavigate={closeMenu} />}
              {/* Site admin: feature switches and read-only mode (docs/feature-switches.md) */}
              {admin && (
                <NavItem href={ROUTES.features} label={t('Features')} Icon={AdjustmentsHorizontalIcon} pathname={pathname} onNavigate={closeMenu} />
              )}
              {/* The selected board's issue types: its admin only */}
              {boardAdmin && isOn('issueTypesPage') && (
                <NavItem href={ROUTES.issueTypes} label={t('Issue types')} Icon={TagIcon} pathname={pathname} onNavigate={closeMenu}>
                  {onIssueTypes && <MobileSubActions actions={subActions} />}
                </NavItem>
              )}
            </>
          )}

          {isLoggedIn ? (
            <>
              {/* Desktop: user and logout on the far right */}
              {/* Which board is shown (same font and size as the links), left of the account button */}
              {showSwitcher && (
                <li className="md:ml-auto">
                  <BoardSwitcher onSelected={closeMenu} />
                </li>
              )}
              {/* The avatar opens the account menu (account, appearance, Log out). Mobile: in the nav row, on the right */}
              {userName ? (
                <li key="profile" className={`hidden md:block ${showSwitcher ? '' : 'md:ml-auto'}`}>
                  <AccountMenu username={userName} />
                </li>
              ) : (
                <li key="logout" className={`self-end md:self-auto ${showSwitcher ? '' : 'md:ml-auto'}`}>
                  <button onClick={handleLogout} className={NAV_LINK_CLASS}>
                    <ArrowRightStartOnRectangleIcon className={NAV_ICON_CLASS} aria-hidden />
                    {t('Log out')}
                  </button>
                </li>
              )}
            </>
          ) : (
            <>
              {isOn('register') && (
                <li key="register" onClick={closeMenu}>
                  <Link href={ROUTES.register} className={NAV_LINK_CLASS}>{t('Register User')}</Link>
                </li>
              )}
              <li key="login" onClick={closeMenu}>
                <Link href={ROUTES.login} className={NAV_LINK_CLASS}>{t('Login')}</Link>
              </li>
            </>
          )}
        </ul>
      </nav>

      {/* Row two (desktop), on the board, the backlog and Issue types: opens the page's form. Slightly darker than the row above.
          On mobile the buttons are in the hamburger menu instead */}
      {subActions.length > 0 && (
        <div
          className={`hidden items-center bg-nav-sub py-1.5 pr-[2%] text-base text-nav-text md:flex ${subRowStart === null ? 'pl-[3%]' : ''}`}
        >
          {/* The left edge lines up with the link's left edge */}
          <div
            className="flex w-fit shrink-0 items-center gap-4"
            style={subRowStart === null ? undefined : { marginLeft: subRowStart }}
          >
            {subActions.map(({ label, action, Icon }) => (
              <button key={action} type="button" className={NAV_SUB_ROW_BUTTON_CLASS} onClick={() => requestBoardAction(action)}>
                <Icon className={NAV_ICON_SUB_CLASS} aria-hidden />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Read-only mode: everyone sees it; the site admin can still make changes */}
      {readOnly && (
        <div
          role="status"
          className={`px-[3%] py-1 text-center font-jira text-sm ${siteAdmin ? 'bg-[#e9f2ff] text-[#0055cc]' : 'bg-[#fff7d6] text-[#7f5f01]'}`}
        >
          {siteAdmin
            ? t('Read-only mode is on for everyone else. You can still make changes.')
            : t('AurellTodo is in read-only mode. You can look around, but changes are paused for now.')}
        </div>
      )}

      {isLoggedIn && board && <ShareBoardDialog board={board} open={shareOpen} onClose={() => setShareOpen(false)} />}
    </header>
  );
};

export default Navbar;
