import { ActionIcon, TextInput, Tooltip } from '@mantine/core';
import { IconBell, IconSearch } from '@tabler/icons-react';

type TopbarProps = { query: string; onQueryChange: (query: string) => void };

export function Topbar({ query, onQueryChange }: TopbarProps) {
  return (
    <header className="topbar">
      <div className="breadcrumbs"><span>PAFHub</span><span className="crumb-divider">/</span><strong>Discover</strong></div>
      <div className="top-actions">
        <TextInput className="search-input" leftSection={<IconSearch size={17} />} placeholder="Search games..." value={query} onChange={(event) => onQueryChange(event.currentTarget.value)} />
        <Tooltip label="Notifications"><ActionIcon className="notification-button" variant="subtle" size={38}><IconBell size={19} /></ActionIcon></Tooltip>
        <span className="top-avatar">T</span>
      </div>
    </header>
  );
}
