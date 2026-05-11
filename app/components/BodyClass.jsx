'use client';

import { useEffect } from 'react';

export default function BodyClass({ className = '' }) {
  useEffect(() => {
    document.body.className = className;
    return () => {
      document.body.className = '';
    };
  }, [className]);

  return null;
}
