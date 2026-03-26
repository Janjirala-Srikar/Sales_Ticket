import {
  LuTicket,
  LuActivity,
  LuSignalHigh,
  LuClock3,
  LuBookOpenCheck,
  LuLightbulb,
  LuBellDot,
  LuMic2,
  LuSettings,
  LuUserPlus,
  LuUserCog,
} from 'react-icons/lu';

export const DASH_LINKS = [
  { key: 'all-tickets', label: 'All tickets', path: '/dashboard/all-tickets', Icon: LuTicket },
  { key: 'health', label: 'Account health score', path: '/dashboard/health', Icon: LuActivity },
  { key: 'signals', label: 'Signals feed', path: '/dashboard/signals', Icon: LuSignalHigh },
  { key: 'memory', label: 'Account memory and timeline', path: '/dashboard/memory', Icon: LuClock3 },
  { key: 'playbooks', label: 'AI-generated playbooks and drafts', path: '/dashboard/playbooks', Icon: LuBookOpenCheck },
  { key: 'ask-intel', label: 'The ask intelligence layer', path: '/dashboard/ask-intel', Icon: LuLightbulb },
  { key: 'digest', label: 'Automated digest and proactive nudges', path: '/dashboard/digest', Icon: LuBellDot },
  { key: 'voice', label: 'Voice of customer reporting', path: '/dashboard/voice', Icon: LuMic2 },
];

export const SETTINGS_LINK = { key: 'settings', label: 'Settings', path: '/dashboard/settings', Icon: LuSettings };
export const SETTINGS_GROUP_LINKS = [
  { key: 'add-team', label: 'Add Team', path: '/dashboard/settings/add-team', Icon: LuUserPlus },
  { key: 'edit-details', label: 'Edit Details', path: '/dashboard/settings/edit-details', Icon: LuUserCog },
];
