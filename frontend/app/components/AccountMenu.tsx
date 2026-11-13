'use client';
import Image from 'next/image';
import { useState, type ComponentType, type ReactNode, type SVGProps } from 'react';
import { toast } from 'sonner';
import { ArrowRightStartOnRectangleIcon, Bars2Icon, ChevronRightIcon, LinkIcon, PhotoIcon } from '@heroicons/react/24/outline';
import logo from '../icon.png';
import { connectGoogle } from '../api/endpoints';
import { apiErrorMessage } from '../utils/apiError';
import { backgroundSwatch, boardBackground, type Appearance } from '../utils/appearance';
import { loadAppearance, saveAppearance } from '../utils/appearanceStore';
import { avatarInitials } from '../utils/avatar';
import { GOOGLE_CLIENT_ID } from '../utils/google';
import { handleLogout } from '../utils/logout';
import { AppearancePicker, CloseButton, NavbarPreview, PanelHeader, type AppearanceView } from './AppearancePicker';
import GoogleButton from './GoogleButton';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { ACCOUNT_AVATAR_CLASS, ACCOUNT_MENU_ACTIVE_ITEM_CLASS, ACCOUNT_MENU_HEADING_CLASS, ACCOUNT_MENU_ITEM_CLASS } from '../utils/styles';

// Panelen som är öppen bredvid menyn: en av färgväljarna eller Google-kopplingen
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

// Avataren i navbaren öppnar kontomenyn (som Trellos): konto, utseende och utloggning.
// Desktop: panelerna öppnas till vänster om menyn. Mobil: i menyns ställe, med tillbaka-pil
export default function AccountMenu({ username }: { username: string }) {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [appearance, setAppearance] = useState<Appearance>(loadAppearance);

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
      toast.success('Google account connected. You can now sign in with Google.');
      close();
    } catch (error) {
      // T.ex. 409: Google-kontot hör redan till en annan användare
      toast.error(apiErrorMessage(error, 'Could not connect the Google account.'));
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
        aria-label={`Account (logged in as ${username})`}
        title={username}
        className={`${ACCOUNT_AVATAR_CLASS} size-8 text-xs`}
      >
        {avatarInitials(username)}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        aria-label="Account menu"
        className="relative w-[min(300px,calc(100vw-24px))] p-0 font-jira text-jira-text"
      >
        <div className={`${panel ? 'hidden md:block' : ''} py-2`}>
          <div className="flex items-start justify-between pr-2">
            <h2 className={ACCOUNT_MENU_HEADING_CLASS}>Account</h2>
            <CloseButton onClose={close} className="mt-1" />
          </div>
          <div className="flex items-center gap-3 px-4 py-2">
            <span className={`${ACCOUNT_AVATAR_CLASS} size-10 text-sm`} aria-hidden>
              {avatarInitials(username)}
            </span>
            <span className="min-w-0 truncate text-sm font-medium">{username}</span>
          </div>
          <MenuItem
            Icon={LinkIcon}
            label="Google sign-in"
            active={panel === 'google'}
            onClick={() => togglePanel('google')}
          />

          <hr className="my-2 border-jira-neutral" />
          <h2 className={`${ACCOUNT_MENU_HEADING_CLASS} flex items-center gap-1.5`}>
            <Image src={logo} alt="" className="size-4" />
            Aurello
          </h2>
          <MenuItem
            Icon={PhotoIcon}
            label="Board background"
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
          <MenuItem
            Icon={Bars2Icon}
            label="Navbar colour"
            active={panel === 'navbar'}
            end={<NavbarPreview appearance={appearance} themeKey={appearance.navbar} />}
            onClick={() => togglePanel('navbar')}
          />

          <hr className="my-2 border-jira-neutral" />
          <button type="button" onClick={handleLogout} className={ACCOUNT_MENU_ITEM_CLASS}>
            <ArrowRightStartOnRectangleIcon className="size-5 shrink-0 text-jira-secondary" aria-hidden />
            Log out
          </button>
        </div>

        {panel && (
          <div className="max-h-[calc(100dvh-6rem)] overflow-y-auto p-4 md:absolute md:top-0 md:right-full md:mr-2 md:w-[340px] md:rounded-md md:border md:bg-popover md:shadow-md">
            {panel === 'google' ? (
              <div className="flex flex-col gap-3">
                <PanelHeader title="Google sign-in" onBack={() => setPanel(null)} onClose={close} />
                <p className="text-sm text-jira-secondary">
                  Connect your Google account to sign in with Google instead of your password.
                </p>
                {GOOGLE_CLIENT_ID ? (
                  <GoogleButton text="continue_with" onCredential={handleConnect} />
                ) : (
                  <p className="text-sm text-jira-subtle">Google sign-in is not configured.</p>
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

