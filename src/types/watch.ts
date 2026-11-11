export interface ActivityItem {
  id: number;
  number: number;
  name: string;
  shortName: string;
  iconName: string;
  color: string;
  bgColor: string;
  description: string;
}

export const ACTIVITIES: ActivityItem[] = [
  {
    id: 1,
    number: 1,
    name: 'Проект',
    shortName: 'Проект',
    iconName: 'FolderKanban',
    color: '#38bdf8', // Sky 400
    bgColor: 'rgba(56, 189, 248, 0.15)',
    description: 'Основная рабочая или личная проектная деятельность'
  },
  {
    id: 2,
    number: 2,
    name: 'Изучение программирования',
    shortName: 'Кодинг',
    iconName: 'Code2',
    color: '#a855f7', // Purple 500
    bgColor: 'rgba(168, 85, 247, 0.15)',
    description: 'Изучение языков, алгоритмов, написание кода и архитектура'
  },
  {
    id: 3,
    number: 3,
    name: 'Изучение ин. языка',
    shortName: 'Языки',
    iconName: 'Languages',
    color: '#06b6d4', // Cyan 500
    bgColor: 'rgba(6, 182, 212, 0.15)',
    description: 'Слова, грамматика, аудирование, чтение или разговорная практика'
  },
  {
    id: 4,
    number: 4,
    name: 'Поиск работы',
    shortName: 'Поиск работы',
    iconName: 'Briefcase',
    color: '#f59e0b', // Amber 500
    bgColor: 'rgba(245, 158, 11, 0.15)',
    description: 'Резюме, отклики, вакансии, тестовые задания, собеседования'
  },
  {
    id: 5,
    number: 5,
    name: 'Подработка',
    shortName: 'Подработка',
    iconName: 'Coins',
    color: '#10b981', // Emerald 500
    bgColor: 'rgba(16, 185, 129, 0.15)',
    description: 'Фриланс, разовые заказы, консультации и сайд-доход'
  },
  {
    id: 6,
    number: 6,
    name: 'Кулинария',
    shortName: 'Кулинария',
    iconName: 'Utensils',
    color: '#f97316', // Orange 500
    bgColor: 'rgba(249, 115, 22, 0.15)',
    description: 'Приготовление еды, выпечка, планирование рациона'
  },
  {
    id: 7,
    number: 7,
    name: 'Спорт',
    shortName: 'Спорт',
    iconName: 'Dumbbell',
    color: '#ef4444', // Red 500
    bgColor: 'rgba(239, 68, 68, 0.15)',
    description: 'Тренировка, бег, растяжка, разминка, фитнес'
  },
  {
    id: 8,
    number: 8,
    name: 'Отдых',
    shortName: 'Отдых',
    iconName: 'Coffee',
    color: '#8b5cf6', // Violet 500
    bgColor: 'rgba(139, 92, 246, 0.15)',
    description: 'Перерыв, прогулка, медитация, чтение для души, сон'
  },
  {
    id: 9,
    number: 9,
    name: 'Быт',
    shortName: 'Быт',
    iconName: 'Home',
    color: '#64748b', // Slate 500
    bgColor: 'rgba(100, 116, 139, 0.15)',
    description: 'Уборка, покупки, домашние дела, стирка, организация пространства'
  },
  {
    id: 10,
    number: 10,
    name: 'Другое',
    shortName: 'Другое',
    iconName: 'Sparkles',
    color: '#ec4899', // Pink 500
    bgColor: 'rgba(236, 72, 153, 0.15)',
    description: 'Любая иная активность вне основного списка'
  }
];

export interface ActivityLogEntry {
  id: string;
  timestamp: string; // ISO string
  formattedTime: string;
  activityId: number;
  activityName: string;
  color: string;
  intervalMinutes: number;
}
