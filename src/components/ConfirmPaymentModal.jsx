import React, { useState, useEffect, useMemo } from 'react';
import {
    Modal,
    Form,
    Input,
    InputNumber,
    Table,
    Button,
    message,
    Space,
    Typography,
    Divider,
    Alert,
    Row,
    Col,
    Tag
} from 'antd';
import { 
    DollarOutlined, 
    CalculatorOutlined,
    CheckCircleOutlined
} from '@ant-design/icons';
import proposalApi from '../api/proposalApi';

const { Text, Title } = Typography;

export default function ConfirmPaymentModal({
    proposal,
    open,
    onCancel,
    onSuccess,
    readOnly = false
}) {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [tableData, setTableData] = useState([]);
    const [totalActualCost, setTotalActualCost] = useState(0);

    // Khởi tạo dữ liệu khi mở Modal
    useEffect(() => {
        if (open && proposal) {
            const initialDetails = proposal.branchDetails?.map(d => ({
                detailId: d.id || d.detailId,
                branchId: d.branchId,
                branchName: d.branchName || d.proposerBranchName,
                manufacturer: d.manufacturer,
                version: d.version,
                proposedQuantity: d.proposedQuantity,
                unitPrice: d.unitPrice || 0,
                registrationTax: d.registrationTax || 0,
                roadMaintenanceFee: d.roadMaintenanceFee || 0,
                licensePlateFee: d.licensePlateFee || 0,
                insuranceFee: d.insuranceFee || 0,
                total: d.proposedQuantity * (
                    (d.unitPrice || 0) + 
                    (d.registrationTax || 0) + 
                    (d.roadMaintenanceFee || 0) + 
                    (d.licensePlateFee || 0) + 
                    (d.insuranceFee || 0)
                )
            })) || [];

            setTableData(initialDetails);
            form.setFieldsValue({
                details: initialDetails,
                accountantNote: '',
                actualCost: initialDetails.reduce((sum, d) => sum + (d.total || 0), 0)
            });

            const total = initialDetails.reduce((sum, d) => sum + (d.total || 0), 0);
            setTotalActualCost(total);
        }
    }, [open, proposal, form]);

    const handleValuesChange = (changedValues, allValues) => {
        if (changedValues.details) {
            const updatedDetails = allValues.details.map(d => {
                const qty = Number(d?.proposedQuantity) || 0;
                const price = Number(d?.unitPrice) || 0;
                const tax = Number(d?.registrationTax) || 0;
                const road = Number(d?.roadMaintenanceFee) || 0;
                const plate = Number(d?.licensePlateFee) || 0;
                const ins = Number(d?.insuranceFee) || 0;

                return {
                    ...d,
                    total: qty * (price + tax + road + plate + ins)
                };
            });
            setTableData(updatedDetails);
            const total = updatedDetails.reduce((sum, d) => sum + (d.total || 0), 0);
            setTotalActualCost(total);
            form.setFieldValue('actualCost', total);
        }
    };

    const columns = [
        {
            title: 'Chi nhánh / Mẫu xe',
            key: 'info',
            render: (_, r, index) => (
                <div>
                    {/* Hidden fields to preserve metadata in form values */}
                    <Form.Item name={['details', index, 'detailId']} noStyle hidden><InputNumber /></Form.Item>
                    <Form.Item name={['details', index, 'branchId']} noStyle hidden><InputNumber /></Form.Item>
                    <Form.Item name={['details', index, 'branchName']} noStyle hidden><Input /></Form.Item>
                    <Form.Item name={['details', index, 'manufacturer']} noStyle hidden><Input /></Form.Item>
                    <Form.Item name={['details', index, 'version']} noStyle hidden><Input /></Form.Item>
                    <Form.Item name={['details', index, 'proposedQuantity']} noStyle hidden><InputNumber /></Form.Item>
                    
                    <div style={{ fontWeight: 'bold' }}>{r.branchName}</div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                        {r.manufacturer} {r.version || ''} (SL: {r.proposedQuantity})
                    </Text>
                </div>
            )
        },
        {
            title: 'Đơn giá',
            dataIndex: 'unitPrice',
            width: 150,
            render: (_, __, index) => (
                <Form.Item name={['details', index, 'unitPrice']} noStyle>
                    <InputNumber 
                        formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={value => value.replace(/\$\s?|(,*)/g, '')}
                        style={{ width: '100%' }}
                        disabled={readOnly}
                    />
                </Form.Item>
            )
        },
        {
            title: 'Lệ phí (Thuế/Biển/Đường/BH)',
            key: 'fees',
            width: 400,
            render: (_, __, index) => {
                const row = tableData[index] || {};
                const isZero = (val) => !val || val === 0;
                
                return (
                    <Space direction="vertical" style={{ width: '100%' }} size={2}>
                        <Space>
                            <div style={{ width: 85 }}>
                                <Text style={{ fontSize: 12 }}>Trước bạ:</Text>
                                {isZero(row.registrationTax) && <div style={{ fontSize: 10, color: '#ff4d4f' }}>Cần hoàn thiện</div>}
                            </div>
                            <Form.Item name={['details', index, 'registrationTax']} noStyle>
                                <InputNumber 
                                    size="small" 
                                    style={{ width: 100, border: !readOnly && isZero(row.registrationTax) ? '1px solid #ff4d4f' : '' }} 
                                    disabled={readOnly}
                                />
                            </Form.Item>
                            
                            <div style={{ width: 85, marginLeft: 10 }}>
                                <Text style={{ fontSize: 12 }}>Biển số:</Text>
                                {!readOnly && isZero(row.licensePlateFee) && <div style={{ fontSize: 10, color: '#ff4d4f' }}>Cần hoàn thiện</div>}
                            </div>
                            <Form.Item name={['details', index, 'licensePlateFee']} noStyle>
                                <InputNumber 
                                    size="small" 
                                    style={{ width: 100, border: !readOnly && isZero(row.licensePlateFee) ? '1px solid #ff4d4f' : '' }} 
                                    disabled={readOnly}
                                />
                            </Form.Item>
                        </Space>
                        <Space>
                            <div style={{ width: 85 }}>
                                <Text style={{ fontSize: 12 }}>Đường bộ:</Text>
                                {!readOnly && isZero(row.roadMaintenanceFee) && <div style={{ fontSize: 10, color: '#ff4d4f' }}>Cần hoàn thiện</div>}
                            </div>
                            <Form.Item name={['details', index, 'roadMaintenanceFee']} noStyle>
                                <InputNumber 
                                    size="small" 
                                    style={{ width: 100, border: !readOnly && isZero(row.roadMaintenanceFee) ? '1px solid #ff4d4f' : '' }} 
                                    disabled={readOnly}
                                />
                            </Form.Item>
                            
                            <div style={{ width: 85, marginLeft: 10 }}>
                                <Text style={{ fontSize: 12 }}>Bảo hiểm:</Text>
                                {!readOnly && isZero(row.insuranceFee) && <div style={{ fontSize: 10, color: '#ff4d4f' }}>Cần hoàn thiện</div>}
                            </div>
                            <Form.Item name={['details', index, 'insuranceFee']} noStyle>
                                <InputNumber 
                                    size="small" 
                                    style={{ width: 100, border: !readOnly && isZero(row.insuranceFee) ? '1px solid #ff4d4f' : '' }} 
                                    disabled={readOnly}
                                />
                            </Form.Item>
                        </Space>
                    </Space>
                );
            }
        },
        {
            title: 'Thành tiền',
            dataIndex: 'total',
            align: 'right',
            render: (val) => <Text strong>{val?.toLocaleString()} VNĐ</Text>
        }
    ];

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            
            // Validation: Kiểm tra các khoản chi phí bằng 0
            const incompleteDetails = values.details.filter(d => 
                !d.unitPrice || !d.registrationTax || !d.roadMaintenanceFee || 
                !d.licensePlateFee || !d.insuranceFee
            );

            if (incompleteDetails.length > 0) {
                Modal.confirm({
                    title: 'Cần hoàn thiện chi phí?',
                    content: `Có ${incompleteDetails.length} dòng xe đang có chi phí bằng 0. Bạn có chắc chắn muốn tiếp tục xác nhận không?`,
                    okText: 'Vẫn xác nhận',
                    cancelText: 'Quay lại nhập liệu',
                    onOk: () => executeSubmit(values)
                });
            } else {
                executeSubmit(values);
            }
        } catch (error) {
            console.error(error);
            message.error('Vui lòng kiểm tra lại thông tin nhập liệu.');
        }
    };

    const executeSubmit = async (values) => {
        try {
            setLoading(true);
            const payload = {
                actualCost: values.actualCost,
                accountantNote: values.accountantNote,
                detailUpdates: values.details.map(d => ({
                    detailId: d.detailId,
                    unitPrice: d.unitPrice,
                    registrationTax: d.registrationTax,
                    roadMaintenanceFee: d.roadMaintenanceFee,
                    licensePlateFee: d.licensePlateFee,
                    insuranceFee: d.insuranceFee
                }))
            };

            const res = await proposalApi.confirmPayment(proposal.proposalId, payload);
            if (res.status === 200 || res.status === 201) {
                message.success('Xác nhận thanh toán và hoàn tất đề xuất thành công!');
                onSuccess?.();
            } else {
                message.error(res.data?.message || 'Có lỗi xảy ra khi xác nhận thanh toán.');
            }
        } catch (error) {
            console.error(error);
            message.error(error.response?.data?.message || 'Lỗi hệ thống khi xác nhận thanh toán.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title={
                <Space>
                    <DollarOutlined style={{ color: '#52c41a' }} />
                    <span>{readOnly ? 'Chi tiết Thanh toán - Đề xuất' : 'Xác nhận Thanh toán Đề xuất'} #{proposal?.proposalId}</span>
                </Space>
            }
            open={open}
            onCancel={onCancel}
            onOk={readOnly ? onCancel : handleSubmit}
            confirmLoading={loading}
            width={1100}
            okText={readOnly ? "Đóng" : "Xác nhận & Hoàn tất"}
            cancelButtonProps={readOnly ? { style: { display: 'none' } } : {}}
            cancelText="Hủy"
        >
            {!readOnly && (
                <Alert 
                    title="Lưu ý dành cho Kế toán"
                    message="Lưu ý dành cho Kế toán"
                    description="Vui lòng kiểm tra và điền nốt các khoản thuế phí thực tế (nếu có thay đổi so với dự kiến). Tổng tiền thực chi sẽ được dùng để quyết toán đề xuất."
                    type="info"
                    showIcon
                    style={{ marginBottom: 20 }}
                />
            )}
            {readOnly && (
                <Alert
                    message="Dữ liệu lịch sử"
                    description="Đây là thông tin thực chi đã được Kế toán xác nhận và hoàn tất. Bạn không thể chỉnh sửa dữ liệu này."
                    type="success"
                    showIcon
                    style={{ marginBottom: 20 }}
                />
            )}

            <Form 
                form={form} 
                layout="vertical"
                onValuesChange={handleValuesChange}
            >
                <div style={{ marginBottom: 16 }}>
                    <Table
                        dataSource={tableData}
                        columns={columns}
                        pagination={false}
                        size="small"
                        rowKey="detailId"
                        bordered
                        expandable={{
                            expandedRowRender: (record) => {
                                const matchedReceptions = proposal?.receptions?.filter(r => 
                                    r.branchId === record.branchId &&
                                    r.manufacturer === record.manufacturer &&
                                    r.version === record.version
                                ) || [];

                                if (matchedReceptions.length === 0) return <Text type="secondary">Chưa có thông tin xe đối chiếu cụ thể.</Text>;

                                return (
                                    <div style={{ padding: '0 50px' }}>
                                        <Text strong>Danh sách xe đã đối chiếu:</Text>
                                        <Table 
                                            size="small"
                                            pagination={false}
                                            dataSource={matchedReceptions}
                                            rowKey="id"
                                            columns={[
                                                { title: 'Biển số', dataIndex: 'licensePlate', key: 'licensePlate' },
                                                { title: 'Số VIN', dataIndex: 'vin', key: 'vin' },
                                                { title: 'Số khung', dataIndex: 'chassisNumber', key: 'chassisNumber' },
                                                { title: 'Trạng thái', dataIndex: 'status', key: 'status', render: (s) => <Tag color="green">{s}</Tag> },
                                                { title: 'Ngày nhận', dataIndex: 'receivedDate', key: 'receivedDate', render: (d) => d || '-' }
                                            ]}
                                        />
                                    </div>
                                );
                            },
                        }}
                    />
                </div>

                <div style={{ background: '#f6ffed', padding: 16, borderRadius: 8, border: '1px solid #b7eb8f', marginBottom: 20 }}>
                    <Row align="middle" gutter={16}>
                        <Col span={12}>
                            <Title level={5} style={{ margin: 0 }}>
                                TỔNG CỘNG THỰC CHI:
                            </Title>
                        </Col>
                        <Col span={12} style={{ textAlign: 'right' }}>
                            <Title level={3} style={{ margin: 0, color: '#52c41a' }}>
                                {totalActualCost.toLocaleString()} VNĐ
                            </Title>
                        </Col>
                    </Row>
                    <Divider style={{ margin: '12px 0' }} />
                    <Row>
                        <Col span={24}>
                            <Text type="secondary">
                                (Dự kiến ban đầu: {proposal?.proposedCost?.toLocaleString()} VNĐ
                                {totalActualCost !== proposal?.proposedCost && (
                                    <Text type="danger" style={{ marginLeft: 8 }}>
                                        - Sai lệch: {(totalActualCost - proposal?.proposedCost).toLocaleString()} VNĐ
                                    </Text>
                                )})
                            </Text>
                        </Col>
                    </Row>
                </div>

                <Form.Item 
                    label="Ghi chú xác nhận / Lý do sai lệch (nếu có)" 
                    name="accountantNote"
                >
                    <Input.TextArea 
                        rows={3} 
                        placeholder="Nhập số hóa đơn, ngày thanh toán hoặc giải trình sai lệch chi phí..." 
                        disabled={readOnly}
                    />
                </Form.Item>

                <Form.Item name="actualCost" hidden>
                    <InputNumber />
                </Form.Item>
            </Form>
        </Modal>
    );
}
