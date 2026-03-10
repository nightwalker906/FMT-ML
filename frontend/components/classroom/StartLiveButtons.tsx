'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type MouseEvent, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2, PlayCircle } from 'lucide-react';

type StartInstantSessionButtonProps = {
  className?: string;
  label?: string;
  loadingLabel?: string;
};

export function StartInstantSessionButton({
  className = '',
  label = 'Start Live Now',
  loadingLabel = 'Starting...',
}: StartInstantSessionButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium disabled:opacity-70 disabled:cursor-not-allowed ${className}`}
    >
      {pending ? <Loader2 size={16} className="animate-spin" /> : <PlayCircle size={16} />}
      {pending ? loadingLabel : label}
    </button>
  );
}

type StartLiveClassLinkProps = {
  href: string;
  className?: string;
  label?: string;
  loadingLabel?: string;
};

export function StartLiveClassLink({
  href,
  className = '',
  label = 'Start Live Class',
  loadingLabel = 'Starting...',
}: StartLiveClassLinkProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (isPending) return;
    startTransition(() => {
      router.push(href);
    });
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      aria-busy={isPending}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium ${isPending ? 'pointer-events-none opacity-80' : ''} ${className}`}
    >
      {isPending ? <Loader2 size={16} className="animate-spin" /> : <PlayCircle size={16} />}
      {isPending ? loadingLabel : label}
    </Link>
  );
}
