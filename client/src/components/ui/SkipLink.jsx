export default function SkipLink({ targetId = 'main-content', children = 'Skip to content' }) {
  return (
    <a
      href={`#${targetId}`}
      className="fixed left-4 top-4 z-[100] -translate-y-[200%] rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-transform focus:translate-y-0 dark:bg-white dark:text-slate-900"
    >
      {children}
    </a>
  );
}
