import {
  Card,
  Form,
  Input,
  Button,
  message,
  Row,
  Col,
  Select,
  InputNumber,
  Divider,
  Typography,
} from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import proposalApi from '../api/proposalApi';

const { TextArea } = Input;
const { Title } = Typography;

export default function CreateProposalPage() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await proposalApi.getBranches();
        setBranches(res.data.data || []);
      } catch (error) {
        message.error('Không tải được danh sách chi nhánh');
      }
    };
    fetchBranches();
  }, []);

  const handleSubmit = async (values) => {
    try {
      const payload = {
        proposerId: 1,
        description: values.description,
        details: values.details,
      };

      await proposalApi.create(payload);
      message.success('Tạo đề xuất thành công');
      navigate('/proposals');
    } catch (err) {
      message.error('Tạo đề xuất thất bại');
    }
  };

  return (
    <Card
      title={<Title level={4} style={{ margin: 0 }}>Tạo kế hoạch mua xe</Title>}
      style={{
        maxWidth: 1000,
        margin: '0 auto',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        borderRadius: 12,
      }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          details: [
            { branchId: null, quantity: 1, unitPrice: 0, notes: '' },
          ],
        }}
      >
        {/* Description */}
        <Form.Item
          label="Lý do / Mô tả kế hoạch"
          name="description"
          rules={[
            { required: true, message: 'Vui lòng nhập lý do' },
            { min: 5, message: 'Tối thiểu 5 ký tự' },
          ]}
        >
          <TextArea rows={4} placeholder="Nhập lý do đề xuất..." />
        </Form.Item>

        <Divider />

        <Title level={5}>Danh sách chi nhánh đề xuất</Title>

        <Form.List name="details">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }, index) => (
                <Card
                  key={key}
                  size="small"
                  style={{
                    marginBottom: 16,
                    borderRadius: 8,
                    background: '#fafafa',
                  }}
                >
                  <Row gutter={16}>
                    <Col span={6}>
                      <Form.Item
                        {...restField}
                        label="Chi nhánh"
                        name={[name, 'branchId']}
                        rules={[{ required: true, message: 'Chọn chi nhánh' }]}
                      >
                        <Select
                          placeholder="Chọn chi nhánh"
                          options={branches}
                        />
                      </Form.Item>
                    </Col>

                    <Col span={4}>
                      <Form.Item
                        {...restField}
                        label="Số lượng"
                        name={[name, 'quantity']}
                        rules={[{ required: true, message: 'Nhập số lượng' }]}
                      >
                        <InputNumber min={1} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>

                    <Col span={6}>
                      <Form.Item
                        {...restField}
                        label="Đơn giá (VNĐ)"
                        name={[name, 'unitPrice']}
                        rules={[
                          { required: true, message: 'Nhập đơn giá' },
                          {
                            validator: (_, value) =>
                              value > 0
                                ? Promise.resolve()
                                : Promise.reject(
                                    new Error('Đơn giá phải > 0')
                                  ),
                          },
                        ]}
                      >
                        <InputNumber
                          min={0}
                          style={{ width: '100%' }}
                          formatter={(value) =>
                            `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                          }
                          parser={(value) =>
                            value.replace(/\$\s?|(,*)/g, '')
                          }
                        />
                      </Form.Item>
                    </Col>

                    <Col span={6}>
                      <Form.Item
                        {...restField}
                        label="Ghi chú"
                        name={[name, 'notes']}
                      >
                        <Input placeholder="Ghi chú thêm..." />
                      </Form.Item>
                    </Col>

                    <Col
                      span={2}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <MinusCircleOutlined
                        style={{ color: 'red', fontSize: 18 }}
                        onClick={() => remove(name)}
                      />
                    </Col>
                  </Row>
                </Card>
              ))}

              <Form.Item>
                <Button
                  type="dashed"
                  onClick={() =>
                    add({
                      branchId: null,
                      quantity: 1,
                      unitPrice: 0,
                      notes: '',
                    })
                  }
                  block
                  icon={<PlusOutlined />}
                  style={{ borderRadius: 8 }}
                >
                  Thêm chi nhánh
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>

        <Divider />

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            style={{ borderRadius: 8 }}
          >
            Tạo đề xuất
          </Button>

          <Button
            size="large"
            style={{ marginLeft: 12, borderRadius: 8 }}
            onClick={() => navigate('/proposals')}
          >
            Huỷ
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}