interface Props {
  /** True when the on-screen pending state already matches what's been
   * applied — the action becomes a re-run rather than a fresh apply. */
  isApplied: boolean;
  /** Label when there's an actual change to commit. */
  applyLabel: string;
  /** Label when re-running. Defaults to "Rerun". */
  rerunLabel?: string;
  onClick: () => void;
  disabled?: boolean;
}

export function ApplyButton({
  isApplied,
  applyLabel,
  rerunLabel = 'Rerun',
  onClick,
  disabled,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      class={`flex-1 px-3 py-1.5 text-sm rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        isApplied
          ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
          : 'bg-zinc-100 text-zinc-900 hover:bg-white'
      }`}
      title={isApplied ? 'Re-encode with these settings' : undefined}
    >
      {isApplied ? rerunLabel : applyLabel}
    </button>
  );
}
