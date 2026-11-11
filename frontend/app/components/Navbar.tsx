'use client';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import logo from '../icon.png';
import { avatarColor, avatarInitials } from '../utils/avatar';
import { handleLogout } from '../utils/logout';
import { getUsername, hasSession, isAdmin } from '../utils/session';
import { BOARD_ACTIONS, requestBoardAction, type BoardAction } from '../utils/boardActions';
import AccountDialog from './AccountDialog';
import {
  ArrowRightStartOnRectangleIcon,
  Bars3Icon,
  PlusIcon,
  QueueListIcon,
  TagIcon,
  UsersIcon,
  ViewColumnsIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const BOARD_PATH = '/cards';
const BACKLOG_PATH = '/backlog';
const ISSUE_TYPES_PATH = '/issue-types';
// Länk med ikon före texten (som Trellos sidomeny); ljusare grå bakgrund vid hovring, som knapparna i rad två
const NAV_LINK_CLASS =
  'flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-white/10 focus-visible:bg-white/10';
const NAV_ICON_CLASS = 'size-5 shrink-0';
const NAV_ICON_SUB_CLASS = 'size-4 shrink-0';
const SUB_ROW_BUTTON_CLASS = 'flex items-center gap-1.5 rounded-md px-2 py-0.5 hover:bg-white/10';
// Mobil: rad tvås knappar visas i hamburgermenyn, indragna under sidans länk
const MOBILE_SUB_LIST_CLASS = 'mt-2 ml-7 flex flex-col gap-2 text-lg md:hidden';

type SubAction = { label: string; action: BoardAction; icon?: boolean };

const MobileSubActions = ({ actions }: { actions: SubAction[] }) =>
  actions.length > 0 && (
    <ul className={MOBILE_SUB_LIST_CLASS}>
      {actions.map(({ label, action }) => (
        <li key={action}>
          {/* Klicket bubblar till länkens <li>, som stänger menyn */}
          <button type="button" className={SUB_ROW_BUTTON_CLASS} onClick={() => requestBoardAction(action)}>
            {label}
          </button>
        </li>
      ))}
    </ul>
  );

const Navbar = () => {
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [admin, setAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  // Re-check on every navigation so login/logout is reflected immediately
  useEffect(() => {
    setIsLoggedIn(hasSession());
    setUserName(getUsername());
    setAdmin(isAdmin());
  }, [pathname]);

  const onBoard = isLoggedIn && pathname === BOARD_PATH;
  const onBacklog = isLoggedIn && pathname === BACKLOG_PATH;
  const onIssueTypes = isLoggedIn && admin && pathname === ISSUE_TYPES_PATH;

  // Rad tvås knappar för aktuell sida. Bara admin kan lägga till / ta bort kolumner (backend nekar andra)
  const subActions: SubAction[] = [
    ...(onBoard || onBacklog ? [{ label: 'Create card', action: BOARD_ACTIONS.createCard }] : []),
    ...(onBoard && admin
      ? [
          { label: 'Create column', action: BOARD_ACTIONS.createColumn },
          { label: 'Delete column', action: BOARD_ACTIONS.deleteColumn },
        ]
      : []),
    ...(onIssueTypes ? [{ label: 'Create Issue type', action: BOARD_ACTIONS.createIssueType, icon: true }] : []),
  ];

  // Rad två centreras under sin länk (The Board / Backlog / Issue types). null = vänsterställd (mobil, där länken är dold)
  const headerRef = useRef<HTMLElement>(null);
  const boardLinkRef = useRef<HTMLAnchorElement>(null);
  const backlogLinkRef = useRef<HTMLAnchorElement>(null);
  const issueTypesLinkRef = useRef<HTMLAnchorElement>(null);
  const [subRowCenter, setSubRowCenter] = useState<number | null>(null);

  useLayoutEffect(() => {
    const link = onBoard
      ? boardLinkRef.current
      : onBacklog
        ? backlogLinkRef.current
        : onIssueTypes
          ? issueTypesLinkRef.current
          : null;
    const header = headerRef.current;
    if (!link || !header) {
      setSubRowCenter(null);
      return;
    }
    const measure = () => {
      const rect = link.getBoundingClientRect();
      setSubRowCenter(rect.width ? rect.left + rect.width / 2 - header.getBoundingClientRect().left : null);
    };
    measure();
    // Bredden ändras med fönstret, typsnittsladdning och när menyn byter läge
    const observer = new ResizeObserver(measure);
    observer.observe(link);
    observer.observe(header);
    return () => observer.disconnect();
  }, [onBoard, onBacklog, onIssueTypes, admin, userName]);

  return (
    <header ref={headerRef} className="fixed z-1000 w-full font-brand">
      {/* z-10: mobilmenyn hamnar över raden under */}
      <nav className="relative z-10 flex w-full items-center justify-between bg-gray-600 py-[0.5%] pr-[2%] pl-[3%]">
        {/* Mobil: logga och namn till vänster i raden, hamburgaren till höger. Desktop: loggan ligger i listan */}
        {isLoggedIn && (
          <Link href={BOARD_PATH} className={`${NAV_LINK_CLASS} -ml-2 text-xl text-white md:hidden`}>
            <Image src={logo} alt="" className="size-7 shrink-0" priority />
            Aurello
          </Link>
        )}
        <button
          className="ml-auto block text-white md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <XMarkIcon className="size-8" aria-hidden /> : <Bars3Icon className="size-8" aria-hidden />}
        </button>

        {/* Mobil: dold tills menyn öppnas. Desktop: alltid synlig på en rad */}
        <ul
          className={`${menuOpen ? 'flex' : 'hidden'} absolute top-full left-0 max-h-[calc(100dvh-4rem)] w-full flex-col overflow-y-auto gap-4 rounded-lg bg-brand p-8 text-2xl text-white md:static md:flex md:max-h-none md:overflow-visible md:flex-1 md:flex-row md:items-center md:gap-10 md:bg-transparent md:p-0`}
        >
          {isLoggedIn && (
            <>
              <li className="hidden md:block">
                <Link href={BOARD_PATH} className={NAV_LINK_CLASS}>
                  {/* Samma bild som favicon (app/icon.png) */}
                  <Image src={logo} alt="" className="size-7 shrink-0" priority />
                  Aurello
                </Link>
              </li>
              <li onClick={() => setMenuOpen(false)}>
                <Link
                  ref={boardLinkRef}
                  href={BOARD_PATH}
                  aria-current={pathname === BOARD_PATH ? 'page' : undefined}
                  className={`${NAV_LINK_CLASS} underline-offset-8 aria-[current=page]:underline`}
                >
                  <ViewColumnsIcon className={NAV_ICON_CLASS} aria-hidden />
                  Board
                </Link>
                {onBoard && <MobileSubActions actions={subActions} />}
              </li>
              <li onClick={() => setMenuOpen(false)}>
                <Link
                  ref={backlogLinkRef}
                  href={BACKLOG_PATH}
                  aria-current={pathname === BACKLOG_PATH ? 'page' : undefined}
                  className={`${NAV_LINK_CLASS} underline-offset-8 aria-[current=page]:underline`}
                >
                  <QueueListIcon className={NAV_ICON_CLASS} aria-hidden />
                  Backlog
                </Link>
                {onBacklog && <MobileSubActions actions={subActions} />}
              </li>
              {/* Bara för admin; backend nekar andra (403) */}
              {admin && (
                <>
                  <li onClick={() => setMenuOpen(false)}>
                    <Link href="/users" className={NAV_LINK_CLASS}>
                      <UsersIcon className={NAV_ICON_CLASS} aria-hidden />
                      Users
                    </Link>
                  </li>
                  <li onClick={() => setMenuOpen(false)}>
                    <Link
                      ref={issueTypesLinkRef}
                      href={ISSUE_TYPES_PATH}
                      aria-current={pathname === ISSUE_TYPES_PATH ? 'page' : undefined}
                      className={`${NAV_LINK_CLASS} underline-offset-8 aria-[current=page]:underline`}
                    >
                      <TagIcon className={NAV_ICON_CLASS} aria-hidden />
                      Issue types
                    </Link>
                    {onIssueTypes && <MobileSubActions actions={subActions} />}
                  </li>
                </>
              )}
            </>
          )}

          {isLoggedIn ? (
            <>
              {/* Desktop: användare och logout längst till höger */}
              {userName && (
                <li key="profile" className="md:ml-auto">
                  {/* Samma avatar som på korten; namnet visas vid hovring. Öppnar kontodialogen (koppla Google) */}
                  <button
                    type="button"
                    aria-label={`Account (logged in as ${userName})`}
                    title={userName}
                    onClick={() => {
                      setMenuOpen(false);
                      setAccountOpen(true);
                    }}
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-full font-jira text-xs font-semibold text-white"
                    style={{ background: avatarColor(userName) }}
                  >
                    {avatarInitials(userName)}
                  </button>
                </li>
              )}
              <li key="logout" className={userName ? undefined : 'md:ml-auto'}>
                <button onClick={handleLogout} className={NAV_LINK_CLASS}>
                  <ArrowRightStartOnRectangleIcon className={NAV_ICON_CLASS} aria-hidden />
                  Logout
                </button>
              </li>
            </>
          ) : (
            <>
              <li key="register" onClick={() => setMenuOpen(false)}>
                <Link href="/register" className={NAV_LINK_CLASS}>Register User</Link>
              </li>
              <li key="login" onClick={() => setMenuOpen(false)}>
                <Link href="/login" className={NAV_LINK_CLASS}>Login</Link>
              </li>
            </>
          )}
        </ul>
      </nav>

      {/* Rad två (desktop), på boarden, backloggen och Issue types: öppnar sidans formulär. Lite mörkare än raden ovanför.
          På mobil ligger knapparna i hamburgermenyn i stället */}
      {subActions.length > 0 && (
        <div
          className={`hidden items-center bg-gray-700 py-1.5 pr-[2%] text-base text-white md:flex ${subRowCenter === null ? 'pl-[3%]' : ''}`}
        >
          {/* Mittpunkten läggs på länkens mitt; translate flyttar tillbaka halva bredden */}
          <div
            className={`flex w-fit shrink-0 items-center gap-4 ${subRowCenter === null ? '' : '-translate-x-1/2'}`}
            style={subRowCenter === null ? undefined : { marginLeft: subRowCenter }}
          >
            {subActions.map(({ label, action, icon }) => (
              <button key={action} type="button" className={SUB_ROW_BUTTON_CLASS} onClick={() => requestBoardAction(action)}>
                {icon && <PlusIcon className={NAV_ICON_SUB_CLASS} aria-hidden />}
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {isLoggedIn && <AccountDialog open={accountOpen} onClose={() => setAccountOpen(false)} username={userName} />}
    </header>
  );
};

export default Navbar;
