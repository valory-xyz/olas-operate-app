import { ServiceTemplate } from '@/client';
import { StakingProgramId } from '@/enums/StakingProgram';
import { ServicesService } from '@/service/Services';

export const onDummyServiceCreation = async (
  stakingProgramId: StakingProgramId,
  serviceTemplateConfig: ServiceTemplate,
) => {
  await ServicesService.createService({
    serviceTemplate: serviceTemplateConfig,
    deploy: true,
    stakingProgramId,
  });
};
