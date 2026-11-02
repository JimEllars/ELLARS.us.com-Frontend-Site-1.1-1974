import React from 'react';
import {
  FiActivity,
  FiAlertCircle,
  FiAlertTriangle,
  FiArchive,
  FiArrowLeft,
  FiArrowRight,
  FiBell,
  FiBriefcase,
  FiCpu,
  FiDownload,
  FiEdit,
  FiExternalLink,
  FiFileText,
  FiGlobe,
  FiHome,
  FiLink,
  FiLinkedin,
  FiMail,
  FiMapPin,
  FiMenu,
  FiMessageSquare,
  FiMic,
  FiMoreVertical,
  FiPause,
  FiPlay,
  FiRefreshCw,
  FiSearch,
  FiSend,
  FiShare2,
  FiShield,
  FiSun,
  FiTarget,
  FiTrash2,
  FiTrendingUp,
  FiTwitter,
  FiVideo,
  FiVolumeX,
  FiX,
  FiYoutube,
  FiZap,
} from 'react-icons/fi';

/**
 * Explicit icon registry.
 *
 * This module used to do `import * as FiIcons from 'react-icons/fi'`, which
 * defeats tree-shaking: the whole feather set (thousands of components) was
 * bundled so that a string lookup could find one of them. Every icon is now
 * imported by name, so the bundler ships only what is used.
 *
 * Adding an icon is a two-line change: import it, add it to ICONS. A missing
 * entry renders the warning triangle instead of throwing, and logs in dev so the
 * gap is not silent in a console nobody reads.
 */

const ICONS = {
  Activity: FiActivity,
  AlertCircle: FiAlertCircle,
  AlertTriangle: FiAlertTriangle,
  Archive: FiArchive,
  ArrowLeft: FiArrowLeft,
  ArrowRight: FiArrowRight,
  Bell: FiBell,
  Briefcase: FiBriefcase,
  Cpu: FiCpu,
  Download: FiDownload,
  Edit: FiEdit,
  ExternalLink: FiExternalLink,
  FileText: FiFileText,
  Globe: FiGlobe,
  Home: FiHome,
  Link: FiLink,
  Linkedin: FiLinkedin,
  Mail: FiMail,
  MapPin: FiMapPin,
  Menu: FiMenu,
  MessageSquare: FiMessageSquare,
  Mic: FiMic,
  MoreVertical: FiMoreVertical,
  Pause: FiPause,
  Play: FiPlay,
  RefreshCw: FiRefreshCw,
  Search: FiSearch,
  Send: FiSend,
  Share2: FiShare2,
  Shield: FiShield,
  Sun: FiSun,
  Target: FiTarget,
  Trash2: FiTrash2,
  TrendingUp: FiTrendingUp,
  Twitter: FiTwitter,
  Video: FiVideo,
  VolumeX: FiVolumeX,
  X: FiX,
  Youtube: FiYoutube,
  Zap: FiZap,
  Vote: FiTarget,
};

export const ICON_NAMES = Object.keys(ICONS);

const SafeIcon = ({ icon, name, ...props }) => {
  const IconComponent = icon || (name ? ICONS[name] : null);

  if (!IconComponent) {
    if (import.meta.env.DEV && name) {
      console.warn(`[SafeIcon] "${name}" is not in the icon registry. Add it to src/common/SafeIcon.jsx.`);
    }
    return <FiAlertTriangle aria-hidden="true" {...props} />;
  }

  return React.createElement(IconComponent, { 'aria-hidden': 'true', ...props });
};

export default SafeIcon;
