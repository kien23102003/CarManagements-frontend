import { useMemo, useState } from "react"
import { Alert, Form, Input, InputNumber, Modal, Typography } from "antd"
import { endTrip } from "../services/tripLogService"

const { Text } = Typography

const formatDateTime = (value) => {
    if (!value) return "--"
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return "--"
    return date.toLocaleString("vi-VN")
}

export default function EndTripModal({ open, tripId, startMileage, plannedArrivalDate, onCancel, onSuccess }) {
    const [form] = Form.useForm()
    const [loading, setLoading] = useState(false)

    const isLate = useMemo(() => {
        if (!plannedArrivalDate) return false
        return new Date() > new Date(plannedArrivalDate)
    }, [plannedArrivalDate, open])

    const handleFinish = async (values) => {
        if (!tripId) {
            Modal.error({ title: "Thiếu thông tin chuyến", content: "Không tìm thấy chuyến để kết thúc." })
            return
        }
        if (isLate && !values.note?.trim()) {
            Modal.warning({ title: "Vui lòng nhập lý do trễ", content: "Kết thúc chuyến đã quá thời gian dự kiến. Bắt buộc nhập lý do giải trình." })
            return
        }
        Modal.confirm({
            title: "Xác nhận kết thúc chuyến?",
            content: isLate
                ? "Chuyến này đã quá thời gian dự kiến. Bạn có chắc chắn muốn kết thúc?"
                : "Vui lòng xác nhận kết thúc chuyến.",
            okText: "Xác nhận",
            cancelText: "Hủy",
            onOk: async () => {
                setLoading(true)
                try {
                    await endTrip(tripId, {
                        endMileage: values.endMileage,
                        note: isLate ? values.note?.trim() : null,
                    })
                    form.resetFields()
                    onSuccess?.()
                } catch (error) {
                    Modal.error({
                        title: "Kết thúc chuyến thất bại",
                        content: error?.response?.data?.message || "Không thể kết thúc chuyến.",
                    })
                } finally {
                    setLoading(false)
                }
            },
        })
    }

    return (
        <Modal
            open={open}
            onCancel={onCancel}
            onOk={() => form.submit()}
            okText="Kết thúc chuyến"
            cancelText="Hủy"
            confirmLoading={loading}
            okButtonProps={{ disabled: !tripId }}
            title="Kết thúc chuyến"
            destroyOnClose
        >
            {plannedArrivalDate && (
                <div style={{ padding: 12, background: "#f6f8fa", borderRadius: 8, marginBottom: 16 }}>
                    <Text strong>Đến nơi dự kiến: </Text>
                    <Text>{formatDateTime(plannedArrivalDate)}</Text>
                </div>
            )}

            {isLate && (
                <Alert
                    type="error"
                    message="Đã quá thời gian đến nơi dự kiến!"
                    description="Bạn cần nhập lý do giải trình bên dưới."
                    showIcon
                    style={{ marginBottom: 16 }}
                />
            )}

            <Form form={form} layout="vertical" onFinish={handleFinish}>
                <Form.Item
                    label="Số km kết thúc"
                    name="endMileage"
                    rules={[
                        { required: true, message: "Vui lòng nhập số km kết thúc" },
                        () => ({
                            validator(_, value) {
                                if (value == null || value === "") return Promise.resolve()
                                if (Number(value) < 1) {
                                    return Promise.reject(new Error("Số km kết thúc không hợp lệ"))
                                }
                                if (startMileage != null && Number(value) < Number(startMileage)) {
                                    return Promise.reject(new Error("Số km kết thúc phải lớn hơn hoặc bằng số km bắt đầu"))
                                }
                                return Promise.resolve()
                            },
                        }),
                    ]}
                >
                    <InputNumber min={1} style={{ width: "100%" }} placeholder="Nhập số km kết thúc" />
                </Form.Item>

                {isLate && (
                    <Form.Item
                        label={<span>Lý do trễ <span style={{ color: "red" }}>*</span></span>}
                        name="note"
                        rules={[{ required: true, message: "Vui lòng nhập lý do trễ" }]}
                    >
                        <Input.TextArea rows={3} placeholder="Nhập lý do trễ đến nơi..." />
                    </Form.Item>
                )}
            </Form>
        </Modal>
    )
}
