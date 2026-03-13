import { ServiceTemplate } from '../../types/Service';
import { getXUsername } from '../../utils/x';

type ServiceLike = Pick<ServiceTemplate, 'description'>;

describe('getXUsername', () => {
  it('extracts username from description containing @username', () => {
    const service: ServiceLike = { description: 'Agents.Fun @exampleUser' };
    expect(getXUsername(service as ServiceTemplate)).toBe('exampleUser');
  });

  it('extracts first username when multiple @ mentions exist', () => {
    const service: ServiceLike = { description: 'By @first and @second' };
    expect(getXUsername(service as ServiceTemplate)).toBe('first');
  });

  it('returns null when no @ mention exists', () => {
    const service: ServiceLike = { description: 'No username here' };
    expect(getXUsername(service as ServiceTemplate)).toBeNull();
  });

  it('returns null when service is undefined', () => {
    expect(getXUsername(undefined)).toBeNull();
  });

  it('handles @ at beginning of description', () => {
    const service: ServiceLike = {
      description: '@leadingUser does stuff',
    };
    expect(getXUsername(service as ServiceTemplate)).toBe('leadingUser');
  });

  it('extracts only word characters for username', () => {
    const service: ServiceLike = { description: 'Follow @user_123!' };
    expect(getXUsername(service as ServiceTemplate)).toBe('user_123');
  });
});
