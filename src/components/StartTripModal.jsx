import { useMemo, useState } from "react"
import { Alert, Input, Modal, Typography } from "antd"
import { startTrip } from "../services/tripLogService"

const { Text } = Typography

const formatDateTime = (value) => {
    if (!value) return "--"
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return "--"
    return date.toLocaleString("vi-VN")
}

export default function StartTripModal({ open, onCancel, onSuccess, transfer }) {
    const [loading, setLoading] = useState(false)
    const [note, setNote] = useState("")

    const isLate = useMemo(() => {
        if (!transfer?.plannedDepartureDate) return false
        return new Date() > new Date(transfer.plannedDepartureDate)
    }, [transfer, open])

    const handleOk = async () => {
        if (!transfer?.transferPlanId) return
        if (isLate && !note.trim()) {
            Modal.warning({ title: "Vui lòng nhập lý do trễ", content: "Bắt đầu chuyến đã quá thời gian dự kiến. Bắt buộc nhập lý do giải trình." })
            return
        }
        setLoading(true)
        try {
            await startTrip({
                transferPlanId: transfer.transferPlanId,
                note: isLate ? note.trim() : null,
            })
            setNote("")
            onSuccess?.()
        } catch (error) {
            const message = error?.response?.data?.message || "Không thể bắt đầu chuyến."
            Modal.error({ title: "Bắt đầu chuyến thất bại", content: message })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Modal
            open={open}
            onCancel={() => { setNote(""); onCancel?.() }}
            onOk={handleOk}
            okText="Xác nhận bắt đầu chuyến"
            cancelText="Hủy"
            confirmLoading={loading}
            okButtonProps={{ disabled: !transfer?.transferPlanId }}
            title="Xác nhận bắt đầu chuyến điều chuyển"
            destroyOnClose
        >
            <div style={{ padding: 16, background: "#f6f8fa", borderRadius: 8 }}>
                <div style={{ marginBottom: 10 }}>
                    <Text strong>Biển số: </Text>
                    <Text>{transfer?.licensePlate || "--"}</Text>
                </div>
                <div style={{ marginBottom: 10 }}>
                    <Text strong>Tài xế: </Text>
                    <Text>{transfer?.driverName || "Chưa có tài xế"}</Text>
                </div>
                <div style={{ marginBottom: 10 }}>
                    <Text strong>Lộ trình: </Text>
                    <Text>{transfer?.fromBranchName || "--"} → {transfer?.toBranchName || "--"}</Text>
                </div>
                <div style={{ marginBottom: 10 }}>
                    <Text strong>Số km hiện tại: </Text>
                    <Text>{transfer?.currentMileage != null ? `${transfer.currentMileage} km` : "--"}</Text>
                </div>
                <div style={{ marginBottom: 10 }}>
                    <Text strong>Khởi hành dự kiến: </Text>
                    <Text>{formatDateTime(transfer?.plannedDepartureDate)}</Text>
                </div>
                <div>
                    <Text strong>Đến nơi dự kiến: </Text>
                    <Text>{formatDateTime(transfer?.plannedArrivalDate)}</Text>
                </div>
            </div>

            {isLate && (
                <>
                    <Alert
                        type="error"
                        message="Đã quá thời gian khởi hành dự kiến!"
                        description="Bạn cần nhập lý do giải trình bên dưới."
                        showIcon
                        style={{ marginTop: 16 }}
                    />
                    <div style={{ marginTop: 12 }}>
                        <Text strong>Lý do trễ <span style={{ color: "red" }}>*</span></Text>
                        <Input.TextArea
                            rows={3}
                            placeholder="Nhập lý do trễ khởi hành..."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            style={{ marginTop: 6 }}
                        />
                    </div>
                </>
            )}

            {!isLate && (
                <div style={{ marginTop: 12, color: "#64748b", fontSize: 13 }}>
                    Số km bắt đầu sẽ được lấy tự động từ thông tin xe.
                </div>
            )}
        </Modal>
    )
}
