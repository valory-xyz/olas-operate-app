export const mockSetMulticallAddress = jest.fn();
export const mockMulticallProvider = jest.fn().mockImplementation(() => ({}));
// like the real Contract, it knows the address it was built with
export const mockMulticallContract = jest
  .fn()
  .mockImplementation((address: string) => ({ address }));

export const ethersMulticallMock = {
  setMulticallAddress: mockSetMulticallAddress,
  Provider: mockMulticallProvider,
  Contract: mockMulticallContract,
};
