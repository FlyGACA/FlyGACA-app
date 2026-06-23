import { useTranslation } from 'react-i18next';
import styles from './CaptainAvatar.module.css';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';
/** Generated expression variants (256px) that map to specific UI states. */
export type AvatarPose = 'default' | 'wave' | 'thinking' | 'hold' | 'smile';

const sizeClass: Record<AvatarSize, string> = {
  sm: styles.sm,
  md: styles.md,
  lg: styles.lg,
  xl: styles.xl,
};

const poseSrc: Record<Exclude<AvatarPose, 'default'>, string> = {
  wave: '/img/captain/wave-256.png',
  thinking: '/img/captain/thinking-256.png',
  hold: '/img/captain/hold-256.png',
  smile: '/img/captain/smile-256.png',
};

interface CaptainAvatarProps {
  /** Visual footprint: sm (chat reply), md (cards), lg/xl (hero/welcome). */
  size?: AvatarSize;
  /** Expression variant. `default` is the canonical neutral portrait. */
  pose?: AvatarPose;
  /** Adds the live "online" ring glow — for surfaces that present him as active. */
  glow?: boolean;
  /** Presents him as live: a subtle idle "breathing" motion + an online status dot. */
  live?: boolean;
  /** Decorative use (label already supplied by adjacent text) hides it from AT. */
  decorative?: boolean;
  className?: string;
}

/**
 * Captain Adel's portrait — the one place his face is wired in, so every surface
 * (chat welcome, each reply, the home hero) draws from the same official art.
 * `pose` swaps in a generated expression (wave/thinking/hold/smile) for stateful
 * surfaces; `default` uses the canonical neutral portrait (256px inline, the full
 * 500px render at hero sizes). All ship under `public/img/captain/`. The brand
 * ring is token-driven and the glow honours reduced-motion via CSS.
 */
export function CaptainAvatar({
  size = 'md',
  pose = 'default',
  glow = false,
  live = false,
  decorative = false,
  className,
}: CaptainAvatarProps) {
  const { t } = useTranslation();
  const src =
    pose !== 'default'
      ? poseSrc[pose]
      : size === 'lg' || size === 'xl'
        ? '/img/captain/avatar.png'
        : '/img/captain/avatar-256.png';
  const alt = decorative ? '' : t('chat.avatarAlt');

  const img = (
    <img
      src={src}
      alt={alt}
      aria-hidden={decorative || undefined}
      width={256}
      height={256}
      loading="lazy"
      decoding="async"
      draggable={false}
      className={`${styles.avatar} ${sizeClass[size]} ${glow ? styles.glow : ''} ${
        live ? styles.alive : ''
      } ${live ? '' : (className ?? '')}`}
    />
  );

  // When live, wrap so we can anchor an "online" status dot in the corner; the
  // wrapper carries the caller's layout className so existing margins still apply.
  if (live) {
    return (
      <span className={`${styles.liveWrap} ${sizeClass[size]} ${className ?? ''}`}>
        {img}
        <span className={styles.statusDot} aria-hidden="true" />
      </span>
    );
  }

  return img;
}
