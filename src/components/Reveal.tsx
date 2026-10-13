'use client';

import { useEffect, useRef } from 'react';

export default function Reveal({ children, className, id }: { children: React.ReactNode; className: string; id?: string }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      element.dataset.visible = 'true';
      return;
    }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        element.dataset.visible = 'true';
        observer.disconnect();
      }
    }, { threshold: .12 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return <section ref={ref} id={id} className={`${className} reveal`}>{children}</section>;
}
