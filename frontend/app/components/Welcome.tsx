import { CheckCircleIcon } from '@heroicons/react/24/outline';

// Det man kan göra i appen; visas i välkomsttexten
const FEATURES = [
  'Boards with your own lists: add, rename, colour, reorder and hide them',
  'Cards with issue keys, priority, assignee and issue types like Task, Bug and Story',
  'A backlog for work that is not planned yet',
  'Invite others with a link and work on the same board together',
];

// Välkomsttext på startsidan (Login och Register). Mobil/surfplatta: ovanför formuläret och lika bred
// (samma mx-4 w-full max-w-md). Stor skärm (lg): bredvid formuläret. Texten växer med skärmen
export default function Welcome() {
  return (
    <section className="mx-4 w-full max-w-md font-jira text-white">
      <h1 className="text-2xl font-semibold sm:text-3xl lg:text-4xl">Welcome to AURELLO</h1>
      <p className="mt-2 text-sm text-white/85 sm:mt-3 sm:text-base">
        A free board for your to-dos and projects. As simple as a to-do list, with the tools you know from Jira.
      </p>
      <ul className="mt-4 flex flex-col gap-2 text-sm text-white/85 sm:mt-5 sm:gap-2.5">
        {FEATURES.map((feature) => (
          <li key={feature} className="flex gap-2">
            <CheckCircleIcon className="size-5 shrink-0" aria-hidden />
            {feature}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-white/85 sm:mt-5">Free to use. Create an account to get your own board.</p>
    </section>
  );
}
