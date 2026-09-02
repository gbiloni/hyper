"use client";
import React from 'react';
import packageInfo from '../../package.json';

/**
 * Footer that displays the current build version (taken from package.json)
 * and a copyright line. This component is lightweight and can be placed
 * at the bottom of the main layout.
 */
export default function Footer() {
  const { version } = packageInfo;
  const year = new Date().getFullYear();
  return (
    <footer className="flex w-full items-center justify-center border-t border-white/10 bg-black/30 py-2 text-xs text-gray-400">
      © {year} Hyper ISP – Build v{version}
    </footer>
  );
}
