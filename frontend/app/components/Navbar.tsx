'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { handleLogout } from '../utils/logout';
import { getUsername, hasSession, isAdmin } from '../utils/session';
import { BOARD_ACTIONS, requestBoardAction } from '../utils/boardActions';
import {
  ArrowRightStartOnRectangleIcon,
  Bars3Icon,
  HomeIcon,
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
// Länk med ikon före texten (som Trellos sidomeny)
const NAV_LINK_CLASS = 'flex items-center gap-2';
const NAV_ICON_CLASS = 'size-5 shrink-0';
const NAV_ICON_SUB_CLASS = 'size-4 shrink-0';
const SUB_ROW_BUTTON_CLASS = 'flex items-center gap-1.5 rounded-md px-2 py-0.5 hover:bg-white/10';

const Navbar = () => {
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [admin, setAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Re-check on every navigation so login/logout is reflected immediately
  useEffect(() => {
    setIsLoggedIn(hasSession());
    setUserName(getUsername());
    setAdmin(isAdmin());
  }, [pathname]);

  const onBoard = isLoggedIn && pathname === BOARD_PATH;
  const onBacklog = isLoggedIn && pathname === BACKLOG_PATH;
  const onIssueTypes = isLoggedIn && admin && pathname === ISSUE_TYPES_PATH;

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
    <header ref={headerRef} className="fixed z-[1000] w-full font-brand">
      {/* z-10: mobilmenyn hamnar över raden under */}
      <nav className="relative z-10 flex w-full items-center justify-between bg-gray-600 py-[0.5%] pr-[2%] pl-[3%]">
        <button
          className="block text-white md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <XMarkIcon className="size-8" aria-hidden /> : <Bars3Icon className="size-8" aria-hidden />}
        </button>

        {/* Mobil: dold tills menyn öppnas. Desktop: alltid synlig på en rad */}
        <ul
          className={`${menuOpen ? 'flex' : 'hidden'} absolute top-[50px] w-full flex-col gap-4 rounded-lg bg-brand p-8 text-2xl text-white md:static md:flex md:flex-1 md:flex-row md:items-center md:gap-10 md:bg-transparent md:p-0`}
        >
          {isLoggedIn && (
            <>
              <li onClick={() => setMenuOpen(false)}>
                <Link href="/cards" className={NAV_LINK_CLASS}>
                  <HomeIcon className={NAV_ICON_CLASS} aria-hidden />
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
                  The Board
                </Link>
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
                  <span>{userName}</span>
                </li>
              )}
              <li key="logout" className={userName ? undefined : 'md:ml-auto'}>
                <button onClick={handleLogout} className="flex items-center gap-2">
                  <ArrowRightStartOnRectangleIcon className={NAV_ICON_CLASS} aria-hidden />
                  Logout
                </button>
              </li>
            </>
          ) : (
            <>
              <li key="register" onClick={() => setMenuOpen(false)}>
                <Link href="/register">Register User</Link>
              </li>
              <li key="login" onClick={() => setMenuOpen(false)}>
                <Link href="/login">Login</Link>
              </li>
            </>
          )}
        </ul>
      </nav>

      {/* Rad två, på boarden, backloggen och Issue types: öppnar sidans formulär. Lite mörkare än raden ovanför */}
      {(onBoard || onBacklog || onIssueTypes) && (
        <div
          className={`flex items-center bg-gray-700 py-1.5 pr-[2%] text-base text-white ${subRowCenter === null ? 'pl-[3%]' : ''}`}
        >
          {/* Mittpunkten läggs på länkens mitt; translate flyttar tillbaka halva bredden */}
          <div
            className={`flex w-fit shrink-0 items-center gap-4 ${subRowCenter === null ? '' : '-translate-x-1/2'}`}
            style={subRowCenter === null ? undefined : { marginLeft: subRowCenter }}
          >
            {(onBoard || onBacklog) && (
              <button type="button" className={SUB_ROW_BUTTON_CLASS} onClick={() => requestBoardAction(BOARD_ACTIONS.createCard)}>
                <PlusIcon className={NAV_ICON_SUB_CLASS} aria-hidden />
                Create card
              </button>
            )}
            {/* Bara admin kan lägga till listor (backend nekar andra) */}
            {onBoard && admin && (
              <button type="button" className={SUB_ROW_BUTTON_CLASS} onClick={() => requestBoardAction(BOARD_ACTIONS.createColumn)}>
                <PlusIcon className={NAV_ICON_SUB_CLASS} aria-hidden />
                Create column
              </button>
            )}
            {onIssueTypes && (
              <button
                type="button"
                className={SUB_ROW_BUTTON_CLASS}
                onClick={() => requestBoardAction(BOARD_ACTIONS.createIssueType)}
              >
                <PlusIcon className={NAV_ICON_SUB_CLASS} aria-hidden />
                Create Issue type
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
