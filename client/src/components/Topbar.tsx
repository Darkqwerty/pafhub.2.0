import { TextInput } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { HintButton } from './HintButton';

type TopbarProps = { query: string; onQueryChange: (query: string) => void };

export function Topbar({ query, onQueryChange }: TopbarProps) {
  return (
    <header className="topbar">
      <div className="breadcrumbs">
        <span className="crumb-name">pafhub</span>
        <span className="crumb-sep">│</span>
        <span className="crumb-host">tony@pafhub</span>
        <span className="crumb-sep">│</span>
        <span className="crumb-hint"><b>?</b>:Help <b>/</b>:Search</span>
      </div>
      <div className="top-actions">
        <TextInput className="search-input" leftSection={<IconSearch size={16} />} placeholder="grep games…" value={query} onChange={(event) => onQueryChange(event.currentTarget.value)} />
        <HintButton keyLabel="n" title="Notifications">Notifications</HintButton>
      </div>
    </header>
  );
}
