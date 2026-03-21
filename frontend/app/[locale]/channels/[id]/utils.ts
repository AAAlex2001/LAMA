export function formatMembers(count: number): string {
  const formatted = count.toLocaleString('ru-RU');
  const lastTwo = count % 100;
  const lastOne = count % 10;
  let word: string;
  if (lastTwo >= 11 && lastTwo <= 19) word = 'пользователей';
  else if (lastOne === 1) word = 'пользователь';
  else if (lastOne >= 2 && lastOne <= 4) word = 'пользователя';
  else word = 'пользователей';
  return `${formatted} ${word}`;
}
