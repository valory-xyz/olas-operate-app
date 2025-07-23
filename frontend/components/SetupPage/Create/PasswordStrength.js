import { Typography } from 'antd';

import { COLOR } from '@/constants/colors';

const { Text } = Typography;

export const PasswordStrength = ({ score }) => {
  const strength = [
    'Too weak',
    'Weak',
    'Moderate',
    'Strong',
    'Very strong! Nice job!',
  ];
  const colors = [
    COLOR.RED,
    COLOR.WARNING,
    COLOR.SUCCESS,
    COLOR.SUCCESS,
    COLOR.PURPLE,
  ];
  return (
    <Text style={{ color: COLOR.GRAY_2 }}>
      Password strength:{' '}
      <span style={{ color: colors[score] }}>{strength[score]}</span>
    </Text>
  );
};
