import { avatarColor, avatarInitials } from '../utils/avatar';

// Tailwind needs whole class names, so the sizes are listed here
const SIZE_CLASS = {
  xs: 'size-6 text-[10px]', // board card, backlog
  sm: 'size-7 text-xs', // board members
  md: 'size-8 text-xs', // users table
} as const;

type Props = {
  username: string;
  size?: keyof typeof SIZE_CLASS;
  // Shown on hover and read by screen readers; without it the avatar is decoration (the name is next to it)
  title?: string;
};

// A round avatar with the user's initials, in a colour picked from the username
export default function Avatar({ username, size = 'xs', title }: Props) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${SIZE_CLASS[size]}`}
      style={{ background: avatarColor(username) }}
      title={title}
      aria-hidden={title ? undefined : true}
    >
      {avatarInitials(username)}
    </span>
  );
}
