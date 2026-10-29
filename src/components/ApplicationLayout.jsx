import React from 'react';

const classNames = (...values) => values.filter(Boolean).join(' ');

export default function ApplicationLayout({ header, sidebar, children, contentClassName = '' }) {
  return (
    <div className="somane-app-shell">
      {sidebar}
      <div className="somane-app-shell__workspace">
        <div className="somane-app-shell__header">{header}</div>
        <main className={classNames('somane-app-shell__main', contentClassName)}>
          {children}
        </main>
      </div>
    </div>
  );
}
