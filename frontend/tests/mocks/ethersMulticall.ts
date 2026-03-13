export const mockSetMulticallAddress = jest.fn();
export const mockMulticallProvider = jest.fn().mockImplementation(() => ({}));
export const mockMulticallContract = jest.fn().mockImplementation(() => ({}));

export const ethersMulticallMock = {
  setMulticallAddress: mockSetMulticallAddress,
  Provider: mockMulticallProvider,
  Contract: mockMulticallContract,
};
