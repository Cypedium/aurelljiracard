'use client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { setFeature } from '../api/endpoints';
import { reloadFeatures, useFeatures } from '../hooks/useFeatures';
import { reportError } from '../utils/apiError';
import {
  FEATURE_GROUPS,
  READ_ONLY_INFO,
  READ_ONLY_KEY,
  featureChangedLabel,
  type FeatureInfo,
  type FeatureSwitch,
  type SwitchKey,
} from '../utils/features';
import { TABLE_WRAPPER_CLASS } from '../utils/styles';
import TableSkeleton from '../components/TableSkeleton';
import { Switch } from '../components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';

const ROW_CLASS = 'grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 border-b border-jira-neutral px-4 py-3 last:border-b-0';

// The site admin: switch features off for everyone else, or the whole site (read-only). Saved at once (PUT /feature/{key})
export default function Features() {
  const { state } = useFeatures();
  const [saving, setSaving] = useState<SwitchKey | null>(null);
  const [confirmReadOnly, setConfirmReadOnly] = useState(false);

  // The shared fetch may have happened before login (without the switches, which only admins get)
  useEffect(() => {
    reloadFeatures();
  }, []);

  const switches = state.switches;
  if (!switches) return <TableSkeleton rows={6} />;
  const byKey = new Map(switches.map((s) => [s.key, s]));

  const change = async (info: FeatureInfo, enabled: boolean) => {
    setSaving(info.key);
    try {
      await setFeature(info.key, enabled);
      await reloadFeatures();
      toast.success(info.key === READ_ONLY_KEY
        ? `Read-only mode ${enabled ? 'is on' : 'is off'}.`
        : `${info.name} ${enabled ? 'turned on' : 'turned off'}.`);
    } catch (err) {
      reportError('Error saving feature', err, 'Could not save the switch.');
    } finally {
      setSaving(null);
    }
  };

  const readOnly = byKey.get(READ_ONLY_KEY);

  return (
    <>
      {/* Read-only mode at the top, as a dangerous switch; turning it on asks first */}
      <section className={TABLE_WRAPPER_CLASS}>
        {/* The same heading row as the groups below, but red: it applies to the whole site */}
        <div className="bg-[#c9372c] px-4 py-2 text-white">
          <h2 className="text-xs font-semibold uppercase tracking-wide">Read-only mode</h2>
        </div>
        <div className={ROW_CLASS}>
          <div>
            <h3 className="font-semibold text-jira-text">{READ_ONLY_INFO.name}</h3>
            <p className="text-sm text-jira-secondary">{READ_ONLY_INFO.hides}. Blocks: {READ_ONLY_INFO.blocks}.</p>
            <Changed sw={readOnly} />
          </div>
          <Toggle
            label={READ_ONLY_INFO.name}
            sw={readOnly}
            danger
            disabled={saving !== null}
            onChange={(on) => (on ? setConfirmReadOnly(true) : change(READ_ONLY_INFO, false))}
          />
        </div>
      </section>

      {FEATURE_GROUPS.map((group) => (
        <section key={group.title} className={TABLE_WRAPPER_CLASS}>
          <div className="flex flex-wrap items-baseline gap-2 bg-gray-600 px-4 py-2 text-white">
            <h2 className="text-xs font-semibold uppercase tracking-wide">{group.title}</h2>
            {group.uiOnly && (
              <>
                <span className="rounded-sm bg-white/20 px-1.5 text-[11px] font-semibold uppercase">Hides only</span>
                <span className="text-xs text-white/80">Not a security control: the API still answers, only the UI hides it.</span>
              </>
            )}
          </div>
          {group.features.map((info) => {
            const sw = byKey.get(info.key);
            const paused = !group.uiOnly && readOnly?.enabled && sw?.enabled;
            return (
              <div key={info.key} className={ROW_CLASS}>
                <div className="min-w-0">
                  <h3 className="font-medium text-jira-text">{info.name}</h3>
                  <p className="text-sm text-jira-secondary">
                    Hides: {info.hides}. {group.uiOnly ? 'Still works' : 'Blocks (503)'}: {info.blocks}.
                  </p>
                  <Changed sw={sw} />
                </div>
                <div className="flex items-center gap-2 text-sm text-jira-secondary">
                  <span className="max-sm:hidden">
                    {paused ? 'Paused by read-only' : group.uiOnly ? (sw?.enabled ? 'Shown' : 'Hidden') : sw?.enabled ? 'On' : 'Off'}
                  </span>
                  <Toggle label={info.name} sw={sw} disabled={saving !== null} onChange={(on) => change(info, on)} />
                </div>
              </div>
            );
          })}
        </section>
      ))}

      <AlertDialog open={confirmReadOnly} onOpenChange={setConfirmReadOnly}>
        <AlertDialogContent className="font-jira text-jira-text">
          <AlertDialogHeader>
            <AlertDialogTitle>Turn on read-only mode?</AlertDialogTitle>
            <AlertDialogDescription>
              Everyone except site admins can only look: creating, editing, deleting and moving stop at once.
              Users stay logged in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => change(READ_ONLY_INFO, true)}>
              Turn on
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Toggle({ label, sw, danger, disabled, onChange }: {
  label: string;
  sw: FeatureSwitch | undefined;
  danger?: boolean;
  disabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <Switch
      aria-label={label}
      checked={sw?.enabled ?? !danger}
      danger={danger}
      disabled={disabled || !sw}
      onCheckedChange={onChange}
    />
  );
}

function Changed({ sw }: { sw: FeatureSwitch | undefined }) {
  const label = featureChangedLabel(sw);
  return label ? <p className="col-span-2 text-xs text-jira-subtle">{label}</p> : null;
}
