export const mockUpdateService = jest.fn();
export const mockCreateService = jest.fn();
export const mockGetService = jest.fn();
export const mockGetServices = jest.fn();
export const mockDeployService = jest.fn();
export const mockStopService = jest.fn();
export const mockDeleteService = jest.fn();

export const servicesServiceMock = {
  ServicesService: {
    updateService: mockUpdateService,
    createService: mockCreateService,
    getService: mockGetService,
    getServices: mockGetServices,
    deployService: mockDeployService,
    stopService: mockStopService,
    deleteService: mockDeleteService,
  },
};
