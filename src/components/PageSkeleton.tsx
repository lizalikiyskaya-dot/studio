import type { ReactNode } from "react";

export function PageSkeleton() {
  return (
    <div className="page-skeleton" aria-busy="true">
      <p className="sr-only">Загрузка</p>
      <div className="skel skel-title" />
      <div className="skel-stats">
        <div className="skel skel-stat" />
        <div className="skel skel-stat" />
        <div className="skel skel-stat" />
        <div className="skel skel-stat" />
      </div>
      <div className="skel skel-block" />
      <div className="skel skel-block" />
      <div className="skel skel-block" />
      <div className="skel skel-block" />
    </div>
  );
}

export function AuthCardSkeleton() {
  return (
    <div className="auth-skeleton" aria-busy="true">
      <p className="sr-only">Загрузка</p>
      <div className="skel skel-auth-title" />
      <div className="skel skel-auth-line" />
      <div className="skel skel-auth-line" />
      <div className="skel skel-auth-btn" />
    </div>
  );
}

export function AuthShellSkeleton() {
  return (
    <div className="auth-shell" aria-busy="true">
      <div className="auth-hero" aria-hidden="true">
        <div className="skel skel-auth-hero" />
      </div>
      <div className="auth-panel">
        <div className="auth-card">
          <AuthCardSkeleton />
        </div>
      </div>
    </div>
  );
}

export function CabinetFrame({ children }: { children: ReactNode }) {
  return (
    <div className="studio-shell" aria-busy="true">
      <div className="studio-chrome">
        <div className="studio-topbar">
          <div className="skel skel-logo" />
          <div className="skel skel-nav" />
        </div>
      </div>
      <div className="studio-body">
        <div className="studio-sidebar" aria-hidden="true">
          <div className="skel skel-side-line" />
          <div className="skel skel-side-line" />
          <div className="skel skel-side-line" />
          <div className="skel skel-side-line" />
          <div className="skel skel-side-block" />
        </div>
        <main className="studio-content">{children}</main>
      </div>
    </div>
  );
}
