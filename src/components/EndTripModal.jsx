import { useState } from "react"
import { Alert, Form, InputNumber, Modal } from "antd"
import { endTrip } from "../services/tripLogService"

export default function EndTripModal({ open, tripId, isOverDuration, startMileage, onCancel, onSuccess }) {
    const [form] = Form.useForm()
    const [loading, setLoading] = useState(false)

    const handleFinish = async (values) => {
        if (!tripId) {
            Modal.error({
                title: "Thiếu thông tin chuyến",
                content: "Không tìm thấy chuyến để kết thúc.",
            })
            return
        }
        Modal.confirm({
            title: "Xác nhận kết thúc chuyến?",
            content: isOverDuration
                ? "Chuyến này đã vượt quá thời gian cho phép. Bạn có chắc chắn muốn kết thúc?"
                : "Vui lòng xác nhận kết thúc chuyến.",
            okText: "Xác nhận",
            cancelText: "Hủy",
            onOk: async () => {
                setLoading(true)
                try {
                    await endTrip(tripId, { endMileage: values.endMileage })
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
            {isOverDuration && (
                <Alert
                    type="error"
                    message="Chuyến đi đã vượt thời gian cho phép"
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
            </Form>
        </Modal>
    )
}
