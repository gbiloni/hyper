"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MapPin, MessageSquare, ArrowRight } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();


  return (
    <div className="min-h-full p-6 md:p-10 space-y-8 relative">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-neon-cyan/5 rounded-full mix-blend-screen filter blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-neon-magenta/5 rounded-full mix-blend-screen filter blur-[100px] pointer-events-none" />

      {/* ─── HERO / BRANDING ─── */}
      <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6 bg-background-panel/60 border border-[var(--primary)]/20 rounded-2xl p-8 backdrop-blur-xl shadow-[0_0_40px_rgba(var(--accent-rgb),0.1)]">
        {/* Logo */}
        <div className="relative flex-shrink-0">
          <div className="absolute inset-0 rounded-full bg-neon-cyan/20 blur-2xl scale-125 pointer-events-none" />
          <img
            src="/hyper.ico"
            alt="HyperCRM Logo"
            className="h-16 w-auto object-contain filter drop-shadow-[0_0_8px_var(--neon-cyan)] transition-transform duration-300 hover:scale-105"
          />
        </div>

        {/* Title block */}
        <div className="flex flex-col justify-center text-center md:text-left">
          <h1 className="m-0 text-3xl font-extrabold tracking-widest text-[var(--foreground)] uppercase leading-none font-mono">
            Hyper
            {' '}
            <span className="text-[var(--neon-cyan)] drop-shadow-[0_0_20px_var(--neon-cyan)]">CRM</span>
          </h1>
          <p className="text-xs md:text-sm text-matrix font-mono tracking-[0.3em] uppercase mt-2 opacity-80">
            PORTAL OMNICANAL DE GESTIÓN
          </p>
        </div>
      </div>


    </div>
  );
}
