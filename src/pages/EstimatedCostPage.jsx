import { useEffect, useState } from 'react';
import { Card, Col, Row, Space, Spin, Statistic, Table, message } from 'antd';
import reportApi from '../api/reportApi';

const currencyFormat = (value) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);

export default function EstimatedCostPage() {
  const [loading, setLoading] = useState(false);
  const [branchRows, setBranchRows] = useState([]);
  const [total, setTotal] = useState(null);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const { data } = await reportApi.getEstimatedCostsByBranch();
      setBranchRows(data?.branches || []);
      setTotal(data?.total || null);
    } catch (err) {
      message.error(err?.response?.data?.message || 'Không thể tải tổng chi phí dự kiến');
      setBranchRows([]);
      setTotal(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSummary();
  }, []);

  const columns = [
    { title: 'Chi nhánh', dataIndex: 'branchName', key: 'branchName', render: (v) => v || '-' },
    { title: 'Bảo trì', dataIndex: 'maintenanceCost', key: 'maintenanceCost', render: currencyFormat },
    { title: 'Mua xe', dataIndex: 'vehiclePurchaseCost', key: 'vehiclePurchaseCost', render: currencyFormat },
    { title: 'Mua linh kiện', dataIndex: 'accessoryPurchaseCost', key: 'accessoryPurchaseCost', render: currencyFormat },
    { title: 'Thanh lý', dataIndex: 'disposalCost', key: 'disposalCost', render: currencyFormat },
    { title: 'Tổng', dataIndex: 'totalCost', key: 'totalCost', render: currencyFormat },
  ];

  return (
    <div>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Spin spinning={loading}>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Card>
                <Statistic
                  title="Chi phí bảo trì dự kiến"
                  value={total?.maintenanceCost || 0}
                  formatter={currencyFormat}
                />
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card>
                <Statistic
                  title="Chi phí đề xuất mua xe"
                  value={total?.vehiclePurchaseCost || 0}
                  formatter={currencyFormat}
                />
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card>
                <Statistic
                  title="Chi phí mua linh kiện"
                  value={total?.accessoryPurchaseCost || 0}
                  formatter={currencyFormat}
                />
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card>
                <Statistic
                  title="Chi phí thanh lý"
                  value={total?.disposalCost || 0}
                  formatter={currencyFormat}
                />
              </Card>
            </Col>
            <Col xs={24}>
              <Card>
                <Statistic
                  title="Tổng chi phí dự kiến"
                  value={total?.totalCost || 0}
                  formatter={currencyFormat}
                />
              </Card>
            </Col>
          </Row>

          <Card style={{ marginTop: 16 }}>
            <Table
              rowKey={(r) => r.branchId}
              columns={columns}
              dataSource={branchRows}
              pagination={{ pageSize: 10, showSizeChanger: true }}
            />
          </Card>
        </Spin>
      </Space>
    </div>
  );
}
