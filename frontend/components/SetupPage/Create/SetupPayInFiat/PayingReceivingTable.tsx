import { Table, type TableProps } from 'antd';
import { useMemo } from 'react';

type DataType = {
  key: string;
  paying: string;
  receiving: string;
};

export const PayingReceivingTable = () => {
  const columns = useMemo<TableProps<DataType>['columns']>(
    () => [
      {
        title: 'Paying', // TODO: add icon
        dataIndex: 'paying',
        key: 'paying',
        width: '50%',
      },
      {
        title: 'Receiving',
        dataIndex: 'receiving',
        key: 'receiving',
        width: '50%',
      },
    ],
    [],
  );

  const data = useMemo<DataType[]>(
    () => [
      {
        key: '1',
        paying: '~35.39 USD for 0.06 ETH',
        receiving: '~35.39 USD for 0.06 ETH',
      },
    ],
    [],
  );

  return (
    <Table
      columns={columns}
      dataSource={data}
      pagination={false}
      bordered
      style={{ width: '100%' }}
    />
  );
};
