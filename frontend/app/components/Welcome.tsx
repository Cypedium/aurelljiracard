import { CheckCircleIcon } from '@heroicons/react/24/outline';

// Det man kan göra i appen; visas i välkomsttexten
const FEATURES = [
  'Boards with your own lists: add, rename, colour, reorder and hide them',
  'Cards with issue keys, priority, assignee and issue types like Task, Bug and Story',
  'A backlog for work that is not planned yet',
  'Invite others with a link and work on the same board together',
];

// Välkomsttext på startsidan (Login och Register): bredvid formuläret på desktop, ovanför på mobil
export default function Welcome() {
  return (
    <section className="mx-4 max-w-md font-jira text-white">
      <h1 className="text-3xl font-semibold">Welcome to AURELLO</h1>
      <p className="mt-3 text-base text-white/85">
        A free board for your to-dos and projects. As simple as a to-do list, with the tools you know from Jira.
      </p>
      <ul className="mt-5 flex flex-col gap-2.5 text-sm text-white/85">
        {FEATURES.map((feature) => (
          <li key={feature} className="flex gap-2">
            <CheckCircleIcon className="size-5 shrink-0" aria-hidden />
            {feature}
          </li>
        ))}
      </ul>
      <p className="mt-5 text-sm text-white/85">Free to use. Create an account to get your own board.</p>
    </section>
  );
}
