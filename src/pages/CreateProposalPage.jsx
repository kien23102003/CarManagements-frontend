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
import proposalApi from '../api/proposalApi';

const { TextArea } = Input;
const { Title } = Typography;

export default function CreateProposalPage() {

    const [form] = Form.useForm();
    const navigate = useNavigate();

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
                        { quantity: 1, unitPrice: 0, seats: null, manufacturer: '', notes: '' },
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

                <Title level={5}>Chi tiết cấu hình xe đề xuất (Dành cho Chi nhánh của bạn)</Title>

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
                                        <Col span={5}>
                                            <Form.Item
                                                {...restField}
                                                label="Nhãn hiệu xe"
                                                name={[name, 'manufacturer']}
                                                rules={[{ required: true, message: 'Nhập nhãn hiệu' }]}
                                            >
                                                <Input placeholder="VD: Toyota, Ford..." />
                                            </Form.Item>
                                        </Col>

                                        <Col span={4}>
                                            <Form.Item
                                                {...restField}
                                                label="Số chỗ ngồi"
                                                name={[name, 'seats']}
                                            >
                                                <Select
                                                    placeholder="Chọn"
                                                    options={[
                                                        { value: 4, label: '4 chỗ' },
                                                        { value: 5, label: '5 chỗ' },
                                                        { value: 7, label: '7 chỗ' },
                                                        { value: 16, label: '16 chỗ' },
                                                    ]}
                                                />
                                            </Form.Item>
                                        </Col>

                                        <Col span={3}>
                                            <Form.Item
                                                {...restField}
                                                label="Số lượng"
                                                name={[name, 'quantity']}
                                                rules={[{ required: true, message: 'Nhập số lượng' }]}
                                            >
                                                <InputNumber min={1} max={10000} style={{ width: '100%' }} />
                                            </Form.Item>
                                        </Col>

                                        <Col span={5}>
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
                                                    max={9999999999999}
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

                                        <Col span={5}>
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
                                            quantity: 1,
                                            unitPrice: 0,
                                            seats: null,
                                            manufacturer: '',
                                            notes: '',
                                        })
                                    }
                                    block
                                    icon={<PlusOutlined />}
                                    style={{ borderRadius: 8 }}
                                >
                                    Thêm xe
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