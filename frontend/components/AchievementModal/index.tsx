import { useAchievements } from './useAchievements';

export const AchievementModal = () => {
  const { achievements } = useAchievements();

  return (
    <div>
      <h1>Achievement Modal</h1>
    </div>
  );
};
