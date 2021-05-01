import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

export default function formatShortDate(date: string): string {
  const formatedDate = format(new Date(date), 'dd MMM yyyy', {
    locale: ptBR,
  });

  return formatedDate;
}

export function formatHour(date: string): string {
  const formatedHour = format(new Date(date), 'HH:mm', {
    locale: ptBR,
  });

  return formatedHour;
}
