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
import ConfirmDialog from '../components/ConfirmDialog';
import { useLanguage } from '../hooks/useLanguage';
import { msg } from '../utils/i18n';

const ROW_CLASS = 'grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 border-b border-jira-neutral px-4 py-3 last:border-b-0';

// The site admin: switch features off for everyone else, or the whole site (read-only). Saved at once (PUT /feature/{key})
export default function Features() {
  const { state } = useFeatures();
  const [saving, setSaving] = useState<SwitchKey | null>(null);
  const [confirmReadOnly, setConfirmReadOnly] = useState(false);
  const { t } = useLanguage();

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
        ? (enabled ? t('Read-only mode is on.') : t('Read-only mode is off.'))
        : enabled
          ? t('{name} turned on.', { name: t(info.name) })
          : t('{name} turned off.', { name: t(info.name) }));
    } catch (err) {
      reportError('Error saving feature', err, msg('Could not save the switch.'));
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
          <h2 className="text-xs font-semibold uppercase tracking-wide">{t('Read-only mode')}</h2>
        </div>
        <div className={ROW_CLASS}>
          <div>
            <h3 className="font-semibold text-jira-text">{t(READ_ONLY_INFO.name)}</h3>
            <p className="text-sm text-jira-secondary">{t('{hides}. Blocks: {blocks}.', { hides: t(READ_ONLY_INFO.hides), blocks: t(READ_ONLY_INFO.blocks) })}</p>
            <Changed sw={readOnly} />
          </div>
          <Toggle
            label={t(READ_ONLY_INFO.name)}
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
            <h2 className="text-xs font-semibold uppercase tracking-wide">{t(group.title)}</h2>
            {group.uiOnly && (
              <>
                <span className="rounded-sm bg-white/20 px-1.5 text-[11px] font-semibold uppercase">{t('Hides only')}</span>
                <span className="text-xs text-white/80">{t('Not a security control: the API still answers, only the UI hides it.')}</span>
              </>
            )}
          </div>
          {group.features.map((info) => {
            const sw = byKey.get(info.key);
            const paused = !group.uiOnly && readOnly?.enabled && sw?.enabled;
            const parts = { hides: t(info.hides), blocks: t(info.blocks) };
            return (
              <div key={info.key} className={ROW_CLASS}>
                <div className="min-w-0">
                  <h3 className="font-medium text-jira-text">{t(info.name)}</h3>
                  <p className="text-sm text-jira-secondary">
                    {(group.uiOnly ? t('Hides: {hides}. Still works: {blocks}.', parts) : t('Hides: {hides}. Blocks (503): {blocks}.', parts))}
                  </p>
                  <Changed sw={sw} />
                </div>
                <div className="flex items-center gap-2 text-sm text-jira-secondary">
                  <span className="max-sm:hidden">
                    {paused ? t('Paused by read-only') : group.uiOnly ? (sw?.enabled ? t('Shown') : t('Hidden')) : sw?.enabled ? t('On') : t('Off')}
                  </span>
                  <Toggle label={t(info.name)} sw={sw} disabled={saving !== null} onChange={(on) => change(info, on)} />
                </div>
              </div>
            );
          })}
        </section>
      ))}

      <ConfirmDialog
        open={confirmReadOnly}
        onClose={() => setConfirmReadOnly(false)}
        title={t('Turn on read-only mode?')}
        description={t('Everyone except site admins can only look: creating, editing, deleting and moving stop at once. Users stay logged in.')}
        confirmLabel={t('Turn on')}
        onConfirm={() => change(READ_ONLY_INFO, true)}
      />
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
  const { language, t } = useLanguage();
  const label = featureChangedLabel(sw, language === 'sv' ? 'sv-SE' : 'en-GB', t);
  return label ? <p className="col-span-2 text-xs text-jira-subtle">{label}</p> : null;
}
