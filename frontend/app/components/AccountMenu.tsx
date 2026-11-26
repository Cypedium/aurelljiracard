'use client';
import Image from 'next/image';
import { useState, type ComponentType, type ReactNode, type SVGProps } from 'react';
import { toast } from 'sonner';
import { ArrowRightStartOnRectangleIcon, Bars2Icon, ChevronRightIcon, LinkIcon, PhotoIcon, UserIcon } from '@heroicons/react/24/outline';
import logo from '../icon.png';
import { connectGoogle } from '../api/endpoints';
import { useFeatures } from '../hooks/useFeatures';
import { useLanguage } from '../hooks/useLanguage';
import { apiErrorMessage } from '../utils/apiError';
import { msg } from '../utils/i18n';
import { backgroundSwatch, boardBackground, type Appearance } from '../utils/appearance';
import { loadAppearance, saveAppearance } from '../utils/appearanceStore';
import { avatarInitials } from '../utils/avatar';
import { GOOGLE_CLIENT_ID } from '../utils/google';
import { handleLogout } from '../utils/logout';
import { AppearancePicker, CloseButton, NavbarPreview, PanelHeader, type AppearanceView } from './AppearancePicker';
import GoogleButton from './GoogleButton';
import LanguageSwitch from './LanguageSwitch';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { ACCOUNT_AVATAR_CLASS, ACCOUNT_MENU_ACTIVE_ITEM_CLASS, ACCOUNT_MENU_ALIGN_OFFSET, ACCOUNT_MENU_CLASS, ACCOUNT_MENU_HEADING_CLASS, ACCOUNT_MENU_ITEM_CLASS, NAV_ACCOUNT_BUTTON_CLASS, NAV_ICON_SUB_CLASS } from '../utils/styles';

// The panel open next to the menu: one of the colour pickers or the Google connection
type Panel = AppearanceView | 'google';

type MenuItemProps = {
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  end?: ReactNode;
  active?: boolean;
  onClick: () => void;
};

const MenuItem = ({ Icon, label, end, active = false, onClick }: MenuItemProps) => (
  <button type="button" onClick={onClick} aria-expanded={active} className={`${ACCOUNT_MENU_ITEM_CLASS} ${active ? ACCOUNT_MENU_ACTIVE_ITEM_CLASS : ''}`}>
    <Icon className="size-5 shrink-0 text-jira-secondary" aria-hidden />
    <span className="flex-1">{label}</span>
    {end}
    <ChevronRightIcon className="size-4 shrink-0 text-jira-secondary" aria-hidden />
  </button>
);

// The avatar in the navbar opens the account menu (like Trello's): account, appearance and logout.
// Desktop: the panels open to the left of the menu. Mobile: in place of the menu, with a back arrow
export default function AccountMenu({ username }: { username: string }) {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel | null>(null);
  // Switched-off settings are hidden (the site admin sees everything)
  const { isOn } = useFeatures();
  const [appearance, setAppearance] = useState<Appearance>(loadAppearance);
  const { t } = useLanguage();

  const changeAppearance = (next: Appearance) => {
    setAppearance(next);
    saveAppearance(next);
  };
  const close = () => {
    setOpen(false);
    setPanel(null);
  };
  const togglePanel = (next: Panel) => setPanel((current) => (current === next ? null : next));

  const handleConnect = async (credential: string) => {
    try {
      await connectGoogle(credential);
      toast.success(t('Google account connected. You can now sign in with Google.'));
      close();
    } catch (error) {
      // E.g. 409: the Google account already belongs to another user
      toast.error(apiErrorMessage(error, msg('Could not connect the Google account.')));
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) setPanel(null);
      }}
    >
      <PopoverTrigger
        aria-label={t('Account (logged in as {username})', { username })}
        title={username}
        className={NAV_ACCOUNT_BUTTON_CLASS}
      >
        <UserIcon className={`${NAV_ICON_SUB_CLASS} max-md:size-5`} aria-hidden />
        {/* Mobile: only the icon */}
        <span className="hidden md:inline">{avatarInitials(username)}</span>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        alignOffset={ACCOUNT_MENU_ALIGN_OFFSET}
        collisionPadding={0}
        sideOffset={8}
        aria-label={t('Account menu')}
        className={ACCOUNT_MENU_CLASS}
      >
        <div className={`${panel ? 'hidden md:block' : ''} py-2`}>
          <div className="flex items-start justify-between pr-2">
            <h2 className={ACCOUNT_MENU_HEADING_CLASS}>{t('Account')}</h2>
            <CloseButton onClose={close} className="mt-1" />
          </div>
          <div className="flex items-center gap-3 px-4 py-2">
            <span className={`${ACCOUNT_AVATAR_CLASS} size-10 text-sm`} aria-hidden>
              {avatarInitials(username)}
            </span>
            <span className="min-w-0 truncate text-sm font-medium">{username}</span>
          </div>
          {isOn('googleConnect') && (
            <MenuItem
              Icon={LinkIcon}
              label={t('Google sign-in')}
              active={panel === 'google'}
              onClick={() => togglePanel('google')}
            />
          )}

          {/* The section disappears when both settings are switched off */}
          {(isOn('boardBackground') || isOn('navbarColour')) && (
            <>
              <hr className="my-2 border-jira-neutral" />
              <h2 className={`${ACCOUNT_MENU_HEADING_CLASS} flex items-center gap-1.5`}>
                <Image src={logo} alt="" className="size-4" />
                AurellTodo
              </h2>
            </>
          )}
          {isOn('boardBackground') && (
          <MenuItem
            Icon={PhotoIcon}
            label={t('Board background')}
            active={panel === 'background'}
            end={
              <span
                className="h-5 w-8 shrink-0 rounded"
                style={{ background: backgroundSwatch(boardBackground(appearance.background)) }}
                aria-hidden
              />
            }
            onClick={() => togglePanel('background')}
          />
          )}
          {isOn('navbarColour') && (
          <MenuItem
            Icon={Bars2Icon}
            label={t('Navbar colour')}
            active={panel === 'navbar'}
            end={<NavbarPreview appearance={appearance} themeKey={appearance.navbar} />}
            onClick={() => togglePanel('navbar')}
          />
          )}

          {/* The UI language: saved on the account */}
          <hr className="my-2 border-jira-neutral" />
          <LanguageSwitch />

          {/* Log out on its own at the bottom */}
          <hr className="mt-6 mb-2 border-jira-neutral" />
          <button type="button" onClick={handleLogout} className={ACCOUNT_MENU_ITEM_CLASS}>
            <ArrowRightStartOnRectangleIcon className="size-5 shrink-0 text-jira-secondary" aria-hidden />
            {t('Log out')}
          </button>
        </div>

        {panel && (
          <div className="max-h-[calc(100dvh-6rem)] overflow-y-auto p-4 md:absolute md:top-0 md:right-full md:mr-2 md:w-[340px] md:rounded-md md:border md:border-border md:bg-popover md:shadow-md">
            {panel === 'google' ? (
              <div className="flex flex-col gap-3">
                <PanelHeader title={t('Google sign-in')} onBack={() => setPanel(null)} onClose={close} />
                <p className="text-sm text-jira-secondary">
                  {t('Connect your Google account to sign in with Google instead of your password.')}
                </p>
                {GOOGLE_CLIENT_ID ? (
                  <GoogleButton text="continue_with" onCredential={handleConnect} />
                ) : (
                  <p className="text-sm text-jira-subtle">{t('Google sign-in is not configured.')}</p>
                )}
              </div>
            ) : (
              <AppearancePicker view={panel} appearance={appearance} onChange={changeAppearance} onBack={() => setPanel(null)} onClose={close} />
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

