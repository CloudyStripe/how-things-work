import type { RouteObject } from 'react-router';
import { AppShell } from '@/engine/AppShell';
import { LessonPage } from '@/engine/lesson/LessonPage';
import { MapPage } from '@/engine/MapPage';
import { ModulePage } from '@/engine/ModulePage';
import { NotFoundPage } from '@/engine/NotFoundPage';
import { GlossaryPage } from '@/glossary/GlossaryPage';
import { ReviewPage } from '@/review/ReviewPage';

export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <MapPage /> },
      { path: '/module/:moduleId', element: <ModulePage /> },
      { path: '/module/:moduleId/lesson/:lessonId', element: <LessonPage /> },
      { path: '/glossary', element: <GlossaryPage /> },
      { path: '/review', element: <ReviewPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
