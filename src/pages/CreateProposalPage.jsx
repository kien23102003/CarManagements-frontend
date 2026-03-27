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
    Checkbox,
    Space,
    DatePicker,
} from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import proposalApi from '../api/proposalApi';

const { TextArea } = Input;
const { Title } = Typography;

export default function CreateProposalPage() {
    const { id } = useParams();
    const isEditMode = !!id;
    const [loading, setLoading] = useState(false);

    const [form] = Form.useForm();
    const navigate = useNavigate();

    useEffect(() => {
        if (isEditMode) {
            loadProposal();
        }
    }, [id]);

    const loadProposal = async () => {
        try {
            setLoading(true);
            const res = await proposalApi.getById(id);
            const existing = res?.data?.data || res?.data;
            if (existing) {
                form.setFieldsValue({
                    description: existing.description,
                    details: (existing.bulkPurchaseDetails || []).map(d => ({
                        branchId: d.branchId,
                        quantity: d.proposedQuantity,
                        unitPrice: d.unitPrice,
                        seats: d.seats,
                        manufacturer: d.manufacturer,
                        version: d.version,
                        notes: d.branchNotes,
                        registrationTax: d.registrationTax,
                        roadMaintenanceFee: d.roadMaintenanceFee,
                        licensePlateFee: d.licensePlateFee,
                        insuranceFee: d.insuranceFee,
                        hasCamera158: d.hasCamera158 ?? false,
                        hasGsht: d.hasGsht ?? false,
                        fuelNorm: d.fuelNorm,
                        acquisitionMethod: d.acquisitionMethod || 'Ownership',
                    })),
                    completionDeadline: existing.completionDeadline ? dayjs(existing.completionDeadline) : null,
                });
            } else {
                message.error('Không tìm thấy đề xuất!');
                navigate('/proposals');
            }
        } catch (error) {
            message.error('Lỗi khi tải thông tin đề xuất');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (values) => {
        try {
            setLoading(true);
            const payload = {
                proposerId: 1,
                description: values.description,
                completionDeadline: values.completionDeadline ? values.completionDeadline.toISOString() : null,
                details: values.details.map(d => ({
                    branchId: d.branchId || 1, // Mặc định cho form
                    quantity: d.quantity,
                    unitPrice: d.unitPrice,
                    seats: d.seats,
                    manufacturer: d.manufacturer,
                    version: d.version,
                    notes: d.notes,
                    registrationTax: d.registrationTax,
                    roadMaintenanceFee: d.roadMaintenanceFee,
                    licensePlateFee: d.licensePlateFee,
                    insuranceFee: d.insuranceFee,
                    hasCamera158: d.hasCamera158,
                    hasGsht: d.hasGsht,
                    fuelNorm: d.fuelNorm,
                    acquisitionMethod: d.acquisitionMethod || 'Ownership',
                })),
            };

            if (isEditMode) {
                await proposalApi.update(id, payload);
                message.success('Cập nhật đề xuất thành công');
            } else {
                await proposalApi.create(payload);
                message.success('Tạo đề xuất thành công');
            }
            navigate('/proposals');
        } catch (err) {
            message.error(isEditMode ? 'Cập nhật đề xuất thất bại' : 'Tạo đề xuất thất bại');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card
            title={<Title level={4} style={{ margin: 0 }}>{isEditMode ? `Cập nhật kế hoạch mua xe #${id}` : 'Tạo kế hoạch mua xe'}</Title>}
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
                validateTrigger="onBlur"
                initialValues={{
                    details: [
                        { 
                            quantity: 1, 
                            unitPrice: 0, 
                            seats: null, 
                            manufacturer: '', 
                            notes: '',
                            registrationTax: 0,
                            roadMaintenanceFee: 0,
                            licensePlateFee: 0,
                            insuranceFee: 0,
                            hasCamera158: false,
                            hasGsht: false,
                            acquisitionMethod: 'Ownership'
                        },
                    ],
                }}
            >
                {/* Description */}
                <Form.Item
                    label="Lý do / Mô tả kế hoạch"
                    name="description"
                    rules={[{ required: true, message: 'Vui lòng nhập lý do' }]}
                >
                    <TextArea rows={3} placeholder="Mục đích mua sắm, đối tượng sử dụng..." />
                </Form.Item>

                <Form.Item
                    label="Hạn hoàn thành"
                    name="completionDeadline"
                    rules={[{ required: true, message: 'Vui lòng chọn hạn hoàn thành' }]}
                    extra="Ngày dự kiến hoàn tất toàn bộ quá trình mua sắm và bàn giao xe"
                >
                    <DatePicker 
                        style={{ width: '100%' }} 
                        format="DD/MM/YYYY" 
                        placeholder="Chọn ngày hạn..." 
                        disabledDate={(current) => current && current < dayjs().startOf('day')}
                    />
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
                                    <Row gutter={[16, 16]}>
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
                                        <Col span={5}>
                                            <Form.Item
                                                {...restField}
                                                label="Phiên bản xe (Version)"
                                                name={[name, 'version']}
                                            >
                                                <Input placeholder="VD: 2.0 AT Premium" />
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
                                                        { value: 29, label: '29 chỗ' },
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
                                                <InputNumber min={1} max={100} style={{ width: '100%' }} />
                                            </Form.Item>
                                        </Col>
                                        <Col span={4}>
                                            <Form.Item
                                                {...restField}
                                                label="Phương thức"
                                                name={[name, 'acquisitionMethod']}
                                            >
                                                <Select
                                                    options={[
                                                        { value: 'Ownership', label: 'Mua đứt' },
                                                        { value: 'Lease', label: 'Thuê dài hạn' },
                                                        { value: 'Finance', label: 'Thuê tài chính' },
                                                    ]}
                                                />
                                            </Form.Item>
                                        </Col>
                                        <Col span={3}>
                                            <Form.Item
                                                {...restField}
                                                label="Giá xe gốc (VNĐ)"
                                                name={[name, 'unitPrice']}
                                                rules={[{ required: true, message: 'Nhập đơn giá' }]}
                                            >
                                                <InputNumber min={0} style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={(v) => v.replace(/\$\s?|(,*)/g, '')} />
                                            </Form.Item>
                                        </Col>
                                        
                                        {/* Chi tiết TCO */}
                                        <Col span={6}>
                                            <Form.Item {...restField} label="Phí trước bạ" name={[name, 'registrationTax']}>
                                                <InputNumber min={0} style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={(v) => v.replace(/\$\s?|(,*)/g, '')} />
                                            </Form.Item>
                                        </Col>
                                        <Col span={5}>
                                            <Form.Item {...restField} label="Phí đường bộ" name={[name, 'roadMaintenanceFee']}>
                                                <InputNumber min={0} style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={(v) => v.replace(/\$\s?|(,*)/g, '')} />
                                            </Form.Item>
                                        </Col>
                                        <Col span={4}>
                                            <Form.Item {...restField} label="Phí biển số" name={[name, 'licensePlateFee']}>
                                                <InputNumber min={0} style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={(v) => v.replace(/\$\s?|(,*)/g, '')} />
                                            </Form.Item>
                                        </Col>
                                        <Col span={5}>
                                            <Form.Item {...restField} label="Phí bảo hiểm" name={[name, 'insuranceFee']}>
                                                <InputNumber min={0} style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={(v) => v.replace(/\$\s?|(,*)/g, '')} />
                                            </Form.Item>
                                        </Col>

                                        {/* NĐ 158 Compliance */}
                                        <Col span={4}>
                                            <Space direction="vertical" style={{ marginTop: 30 }}>
                                                <Form.Item {...restField} name={[name, 'hasCamera158']} valuePropName="checked" noStyle>
                                                    <Checkbox>Camera NĐ 158</Checkbox>
                                                </Form.Item>
                                                <Form.Item {...restField} name={[name, 'hasGsht']} valuePropName="checked" noStyle>
                                                    <Checkbox>Thiết bị GSHT</Checkbox>
                                                </Form.Item>
                                            </Space>
                                        </Col>
                                        <Col span={4}>
                                            <Form.Item
                                                {...restField}
                                                label="Định mức NL (L/100km)"
                                                name={[name, 'fuelNorm']}
                                            >
                                                <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
                                            </Form.Item>
                                        </Col>
                                        
                                        {/* TCO Realtime Total & Remove */}
                                        <Col span={21}>
                                            <Form.Item noStyle shouldUpdate={(prev, curr) => prev.details !== curr.details}>
                                                {() => {
                                                    const details = form.getFieldValue('details') || [];
                                                    const current = details[name] || {};
                                                    const q = current.quantity || 0;
                                                    const cost = (current.unitPrice || 0) + (current.registrationTax || 0) + (current.roadMaintenanceFee || 0) + (current.licensePlateFee || 0) + (current.insuranceFee || 0);
                                                    const total = q * cost;
                                                    const seatsAlert = current.seats >= 8 && (!current.hasCamera158 || !current.hasGsht);
                                                    return (
                                                        <div style={{ background: '#e6f7ff', padding: '10px 15px', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <div>
                                                                <strong style={{ fontSize: 16 }}>Tổng TCO ước tính: </strong>
                                                                <span style={{ color: '#1890ff', fontSize: 16, fontWeight: 'bold' }}>
                                                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(total)}
                                                                </span>
                                                                {seatsAlert && <span style={{ color: 'red', marginLeft: 15, fontSize: 13 }}>⚠️ Lỗi: Xe trên 8 chỗ yêu cầu bắt buộc tích Camera & GSHT.</span>}
                                                            </div>
                                                        </div>
                                                    );
                                                }}
                                            </Form.Item>
                                        </Col>
                                        <Col span={3} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                            <Button danger icon={<MinusCircleOutlined />} onClick={() => remove(name)}>Xoá xe</Button>
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
                        loading={loading}
                        style={{ borderRadius: 8 }}
                    >
                        {isEditMode ? 'Lưu cập nhật' : 'Tạo đề xuất'}
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