'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { handleLogout } from '../utils/logout';
import { getUsername, hasSession, isAdmin } from '../utils/session';
import { BOARD_ACTIONS, requestBoardAction } from '../utils/boardActions';
import { ArrowRightStartOnRectangleIcon, Bars3Icon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';

const BOARD_PATH = '/cards';
const BACKLOG_PATH = '/backlog';
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

  return (
    <header className="fixed z-[1000] w-full font-brand">
      {/* z-10: mobilmenyn hamnar över raden under */}
      <nav className="relative z-10 flex w-full items-center justify-between border bg-gray-600 py-[0.5%] pr-[2%] pl-[3%]">
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
                <Link href="/cards">Aurell Jira Board</Link>
              </li>
              <li onClick={() => setMenuOpen(false)}>
                <Link
                  href={BOARD_PATH}
                  aria-current={pathname === BOARD_PATH ? 'page' : undefined}
                  className="underline-offset-8 aria-[current=page]:underline"
                >
                  The Board
                </Link>
              </li>
              <li onClick={() => setMenuOpen(false)}>
                <Link
                  href={BACKLOG_PATH}
                  aria-current={pathname === BACKLOG_PATH ? 'page' : undefined}
                  className="underline-offset-8 aria-[current=page]:underline"
                >
                  Backlog
                </Link>
              </li>
              {/* Bara för admin; backend nekar andra (403) */}
              {admin && (
                <li onClick={() => setMenuOpen(false)}>
                  <Link href="/users">Users</Link>
                </li>
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
                  <ArrowRightStartOnRectangleIcon className="size-7" aria-hidden />
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

      {/* Rad två, på boarden och backloggen: öppnar sidans formulär. Lite mörkare än raden ovanför */}
      {(onBoard || onBacklog) && (
        <div className="flex items-center gap-4 bg-gray-700 py-1.5 pr-[2%] pl-[3%] text-base text-white">
          <button type="button" className={SUB_ROW_BUTTON_CLASS} onClick={() => requestBoardAction(BOARD_ACTIONS.createCard)}>
            Create card
          </button>
          {/* Bara admin kan lägga till listor (backend nekar andra) */}
          {onBoard && admin && (
            <button type="button" className={SUB_ROW_BUTTON_CLASS} onClick={() => requestBoardAction(BOARD_ACTIONS.createColumn)}>
              Create column
            </button>
          )}
        </div>
      )}
    </header>
  );
};

export default Navbar;
