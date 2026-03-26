import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import './FlowingMenu.css';

function MenuIcon({ kind, className }) {
  if (kind === 'context') {
    return (
      <svg className={className} viewBox="0 0 20 20" aria-hidden="true">
        <rect x="3" y="3.5" width="8" height="5" rx="1.6" />
        <rect x="12" y="3.5" width="5" height="5" rx="1.6" />
        <rect x="3" y="10.5" width="14" height="6" rx="1.8" />
      </svg>
    );
  }

  if (kind === 'scoring') {
    return (
      <svg className={className} viewBox="0 0 20 20" aria-hidden="true">
        <path d="M3.5 13.8l4.2-4.1l3 2.1l5.1-5.3" />
        <circle cx="15.8" cy="6.5" r="1.35" />
      </svg>
    );
  }

  if (kind === 'action') {
    return (
      <svg className={className} viewBox="0 0 20 20" aria-hidden="true">
        <rect x="3.2" y="4.2" width="13.6" height="9.2" rx="2" />
        <path d="M7 13.4v3.2l3.4-3.2" />
      </svg>
    );
  }

  if (kind === 'history') {
    return (
      <svg className={className} viewBox="0 0 20 20" aria-hidden="true">
        <path d="M10 3.7a6.3 6.3 0 1 1-5.4 3.1" />
        <path d="M4.6 3.7v3.3h3.2" />
        <path d="M10 6.8v3.1l2.4 1.5" />
      </svg>
    );
  }

  return (
    <svg className={className} viewBox="0 0 20 20" aria-hidden="true">
      <path d="M3.3 10h9.2" />
      <path d="M10.1 6.4L13.9 10l-3.8 3.6" />
      <circle cx="16.1" cy="10" r="1.35" />
    </svg>
  );
}

function distMetric(x, y, x2, y2) {
  const xDiff = x - x2;
  const yDiff = y - y2;
  return xDiff * xDiff + yDiff * yDiff;
}

function findClosestEdge(mouseX, mouseY, width, height) {
  const topEdgeDist = distMetric(mouseX, mouseY, width / 2, 0);
  const bottomEdgeDist = distMetric(mouseX, mouseY, width / 2, height);
  return topEdgeDist < bottomEdgeDist ? 'top' : 'bottom';
}

function MenuItem({
  link,
  text,
  subtext,
  icon,
  speed,
  textColor,
  marqueeBgColor,
  marqueeTextColor,
  borderColor,
  accentColor,
  accentSoftColor,
  accentInkColor,
  surfaceColor,
  hoverSurfaceColor,
  thumbBgColor,
  thumbHoverBgColor,
  thumbBorderColor,
  thumbHoverBorderColor,
  marqueeIconBgColor,
  marqueeIconColor,
}) {
  const itemRef = useRef(null);
  const marqueeRef = useRef(null);
  const marqueeInnerRef = useRef(null);
  const animationRef = useRef(null);
  const [repetitions, setRepetitions] = useState(4);

  const animationDefaults = { duration: 0.6, ease: 'expo' };
  const hoverSpeedMultiplier = 2.8;

  useEffect(() => {
    const calculateRepetitions = () => {
      if (!marqueeInnerRef.current) return;
      const marqueeContent = marqueeInnerRef.current.querySelector('.marquee__part');
      if (!marqueeContent) return;

      const contentWidth = marqueeContent.offsetWidth;
      if (!contentWidth) return;

      const viewportWidth = window.innerWidth;
      const needed = Math.ceil(viewportWidth / contentWidth) + 2;
      setRepetitions(Math.max(4, needed));
    };

    calculateRepetitions();
    window.addEventListener('resize', calculateRepetitions);
    return () => window.removeEventListener('resize', calculateRepetitions);
  }, [text, subtext, icon]);

  useEffect(() => {
    const setupMarquee = () => {
      if (!marqueeInnerRef.current) return;
      const marqueeContent = marqueeInnerRef.current.querySelector('.marquee__part');
      if (!marqueeContent) return;

      const contentWidth = marqueeContent.offsetWidth;
      if (!contentWidth) return;

      if (animationRef.current) {
        animationRef.current.kill();
      }

      animationRef.current = gsap.to(marqueeInnerRef.current, {
        x: -contentWidth,
        duration: speed,
        ease: 'none',
        repeat: -1,
      });
    };

    const timer = setTimeout(setupMarquee, 50);
    return () => {
      clearTimeout(timer);
      if (animationRef.current) animationRef.current.kill();
    };
  }, [text, subtext, icon, repetitions, speed]);

  const handleMouseEnter = (event) => {
    if (!itemRef.current || !marqueeRef.current || !marqueeInnerRef.current) return;
    const rect = itemRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const edge = findClosestEdge(x, y, rect.width, rect.height);

    gsap
      .timeline({ defaults: animationDefaults })
      .set(marqueeRef.current, { y: edge === 'top' ? '-101%' : '101%' }, 0)
      .set(marqueeInnerRef.current, { y: edge === 'top' ? '101%' : '-101%' }, 0)
      .to([marqueeRef.current, marqueeInnerRef.current], { y: '0%' }, 0);

    if (animationRef.current) {
      gsap.killTweensOf(animationRef.current);
      gsap.to(animationRef.current, {
        timeScale: hoverSpeedMultiplier,
        duration: 0.28,
        ease: 'power2.out',
      });
    }
  };

  const handleMouseLeave = (event) => {
    if (!itemRef.current || !marqueeRef.current || !marqueeInnerRef.current) return;
    const rect = itemRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const edge = findClosestEdge(x, y, rect.width, rect.height);

    gsap
      .timeline({ defaults: animationDefaults })
      .to(marqueeRef.current, { y: edge === 'top' ? '-101%' : '101%' }, 0)
      .to(marqueeInnerRef.current, { y: edge === 'top' ? '101%' : '-101%' }, 0);

    if (animationRef.current) {
      gsap.killTweensOf(animationRef.current);
      gsap.to(animationRef.current, {
        timeScale: 1,
        duration: 0.35,
        ease: 'power2.out',
      });
    }
  };

  const handleLinkClick = (event) => {
    if (!link || link === '#') event.preventDefault();
  };

  return (
    <div
      className="menu__item"
      ref={itemRef}
      style={{
        '--menu-border': borderColor,
        '--menu-accent': accentColor,
        '--menu-accent-soft': accentSoftColor,
        '--menu-accent-ink': accentInkColor,
        '--menu-surface': surfaceColor,
        '--menu-surface-hover': hoverSurfaceColor,
        '--menu-thumb-bg': thumbBgColor,
        '--menu-thumb-hover-bg': thumbHoverBgColor,
        '--menu-thumb-border': thumbBorderColor,
        '--menu-thumb-hover-border': thumbHoverBorderColor,
        '--menu-marquee-icon-bg': marqueeIconBgColor,
        '--menu-marquee-icon-color': marqueeIconColor,
      }}
    >
      <a
        className="menu__item-link"
        href={link || '#'}
        onClick={handleLinkClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ '--menu-text': textColor }}
      >
        <span className="menu__item-copy">
          <span className="menu__item-label">{text}</span>
          {subtext ? <span className="menu__item-subtext">{subtext}</span> : null}
        </span>
        <span className="menu__item-thumb" aria-hidden="true">
          <MenuIcon kind={icon} className="menu__icon menu__icon--thumb" />
        </span>
      </a>

      <div className="marquee" ref={marqueeRef} style={{ backgroundColor: marqueeBgColor }}>
        <div className="marquee__inner-wrap">
          <div className="marquee__inner" ref={marqueeInnerRef} aria-hidden="true">
            {[...Array(repetitions)].map((_, index) => (
              <div className="marquee__part" key={index} style={{ color: marqueeTextColor }}>
                <span>{text}</span>
                <div className="marquee__img">
                  <MenuIcon kind={icon} className="menu__icon menu__icon--marquee" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FlowingMenu({
  items = [],
  speed = 15,
  textColor = '#0F172A',
  bgColor = 'transparent',
  marqueeBgColor = '#EFF6FF',
  marqueeTextColor = '#0C447C',
  borderColor = '#CBD5E1',
  accentColor = '#185FA5',
  accentSoftColor = 'rgba(24, 95, 165, 0.14)',
  accentInkColor = '#0C447C',
  surfaceColor = '#F7FBFF',
  hoverSurfaceColor = '#ECF5FF',
  thumbBgColor = '#EAF3FF',
  thumbHoverBgColor = '#DAEBFF',
  thumbBorderColor = '#BDD7F4',
  thumbHoverBorderColor = '#6BA6DD',
  marqueeIconBgColor = 'rgba(24, 95, 165, 0.12)',
  marqueeIconColor = '#0C447C',
}) {
  return (
    <div className="menu-wrap" style={{ backgroundColor: bgColor }}>
      <nav className="menu">
        {items.map((item, index) => (
          <MenuItem
            key={index}
            {...item}
            speed={speed}
            textColor={item.textColor || textColor}
            marqueeBgColor={item.marqueeBgColor || marqueeBgColor}
            marqueeTextColor={item.marqueeTextColor || marqueeTextColor}
            borderColor={item.borderColor || borderColor}
            accentColor={item.accentColor || accentColor}
            accentSoftColor={item.accentSoftColor || accentSoftColor}
            accentInkColor={item.accentInkColor || accentInkColor}
            surfaceColor={item.surfaceColor || surfaceColor}
            hoverSurfaceColor={item.hoverSurfaceColor || hoverSurfaceColor}
            thumbBgColor={item.thumbBgColor || thumbBgColor}
            thumbHoverBgColor={item.thumbHoverBgColor || thumbHoverBgColor}
            thumbBorderColor={item.thumbBorderColor || thumbBorderColor}
            thumbHoverBorderColor={item.thumbHoverBorderColor || thumbHoverBorderColor}
            marqueeIconBgColor={item.marqueeIconBgColor || marqueeIconBgColor}
            marqueeIconColor={item.marqueeIconColor || marqueeIconColor}
          />
        ))}
      </nav>
    </div>
  );
}
