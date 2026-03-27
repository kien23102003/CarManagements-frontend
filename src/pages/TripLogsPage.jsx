import { useEffect, useState } from "react"
import { Badge, Button, Empty, Modal, Select, Spin, Table, Tabs, Tag, Typography } from "antd"
import toast from "react-hot-toast"
import StartTripModal from "../components/StartTripModal"
import EndTripModal from "../components/EndTripModal"
import { getManageVehicles, getTripHistoryByVehicle, getPendingTransfers, getInTransitTransfers } from "../services/tripLogService"
import "../styles/tripLogs.css"

const { Title, Text } = Typography

const formatDateTime = (value) => {
    if (!value) return "--"
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return "--"
    return date.toLocaleString("vi-VN")
}

export default function TripLogsPage() {
    const [activeMainTab, setActiveMainTab] = useState("manage")
    const [manageTab, setManageTab] = useState("pending")
    const [pendingTransfers, setPendingTransfers] = useState([])
    const [inTransitTransfers, setInTransitTransfers] = useState([])
    const [manageLoading, setManageLoading] = useState(false)
    const [allVehicles, setAllVehicles] = useState([])

    const [historyVehicleId, setHistoryVehicleId] = useState(null)
    const [historyData, setHistoryData] = useState(null)
    const [historyLoading, setHistoryLoading] = useState(false)

    const [startModalOpen, setStartModalOpen] = useState(false)
    const [endModalOpen, setEndModalOpen] = useState(false)
    const [selectedTransfer, setSelectedTransfer] = useState(null)
    const [selectedTrip, setSelectedTrip] = useState(null)
    const [selectedStartMileage, setSelectedStartMileage] = useState(null)
    const [selectedPlannedArrivalDate, setSelectedPlannedArrivalDate] = useState(null)

    const loadPendingTransfers = async () => {
        setManageLoading(true)
        try {
            const res = await getPendingTransfers()
            const list = res?.data ?? res ?? []
            setPendingTransfers(Array.isArray(list) ? list : [])
        } catch (error) {
            console.error("Failed to load pending transfers", error)
            toast.error("Không thể tải danh sách chờ điều chuyển.")
            setPendingTransfers([])
        } finally {
            setManageLoading(false)
        }
    }

    const loadInTransitTransfers = async () => {
        setManageLoading(true)
        try {
            const res = await getInTransitTransfers()
            const list = res?.data ?? res ?? []
            setInTransitTransfers(Array.isArray(list) ? list : [])
        } catch (error) {
            console.error("Failed to load in-transit transfers", error)
            toast.error("Không thể tải danh sách đang di chuyển.")
            setInTransitTransfers([])
        } finally {
            setManageLoading(false)
        }
    }

    const loadAllVehicles = async () => {
        try {
            const res = await getManageVehicles("all")
            const list = res?.data ?? res ?? []
            setAllVehicles(Array.isArray(list) ? list : [])
        } catch {
            setAllVehicles([])
        }
    }

    const loadTripHistory = async (vehicleId) => {
        if (!vehicleId) return
        setHistoryLoading(true)
        try {
            const res = await getTripHistoryByVehicle(vehicleId)
            const data = res?.data ?? res
            setHistoryData(data || null)
        } catch (error) {
            console.error("Failed to load trip history", error)
            toast.error("Không thể tải lịch sử chuyến.")
            setHistoryData(null)
        } finally {
            setHistoryLoading(false)
        }
    }

    useEffect(() => {
        if (manageTab === "pending") {
            loadPendingTransfers()
        } else if (manageTab === "moving") {
            loadInTransitTransfers()
        }
    }, [manageTab])

    useEffect(() => {
        loadAllVehicles()
    }, [])

    const handleStartTrip = (transfer) => {
        // Check if today is before the planned departure date
        if (transfer.plannedDepartureDate) {
            const today = new Date(); today.setHours(0,0,0,0)
            const planned = new Date(transfer.plannedDepartureDate)
            const plannedDay = new Date(planned.getFullYear(), planned.getMonth(), planned.getDate())
            if (today < plannedDay) {
                Modal.warning({
                    title: "Chưa đến ngày điều chuyển",
                    content: `Ngày khởi hành dự kiến là ${planned.toLocaleDateString("vi-VN")}. Vui lòng chờ đến ngày dự kiến để bắt đầu chuyến.`,
                })
                return
            }
        }
        setSelectedTransfer(transfer)
        setStartModalOpen(true)
    }

    const handleEndTrip = (transfer) => {
        setSelectedTrip(transfer?.tripId)
        setSelectedStartMileage(transfer?.currentMileage ?? null)
        setSelectedPlannedArrivalDate(transfer?.plannedArrivalDate ?? null)
        setEndModalOpen(true)
    }

    // Columns for pending transfers tab
    const pendingColumns = [
        {
            title: "Biển số",
            dataIndex: "licensePlate",
            key: "licensePlate",
            render: (value) => value || "--",
        },
        {
            title: "Tài xế",
            dataIndex: "driverName",
            key: "driverName",
            render: (value) => value || "Chưa có",
        },
        {
            title: "Lộ trình",
            key: "route",
            render: (_, record) => (
                <span>
                    {record.fromBranchName || "--"} → {record.toBranchName || "--"}
                </span>
            ),
        },
        {
            title: "Khởi hành dự kiến",
            dataIndex: "plannedDepartureDate",
            key: "plannedDepartureDate",
            render: (value) => formatDateTime(value),
        },
        {
            title: "Đến nơi dự kiến",
            dataIndex: "plannedArrivalDate",
            key: "plannedArrivalDate",
            render: (value) => formatDateTime(value),
        },
        {
            title: "Vai trò",
            key: "role",
            render: (_, record) => (
                <Tag color={record.isSourceBranch ? "blue" : "orange"}>
                    {record.isSourceBranch ? "Chi nhánh gốc" : "Chi nhánh đích"}
                </Tag>
            ),
        },
        {
            title: "Thao tác",
            key: "actions",
            render: (_, record) => (
                record.isSourceBranch ? (
                    <Button type="primary" onClick={() => handleStartTrip(record)}>
                        Bắt đầu chuyến
                    </Button>
                ) : (
                    <Text type="secondary">Chờ chi nhánh gốc</Text>
                )
            ),
        },
    ]

    // Columns for in-transit tab
    const inTransitColumns = [
        {
            title: "Biển số",
            dataIndex: "licensePlate",
            key: "licensePlate",
            render: (value) => value || "--",
        },
        {
            title: "Tài xế",
            dataIndex: "driverName",
            key: "driverName",
            render: (value) => value || "--",
        },
        {
            title: "Lộ trình",
            key: "route",
            render: (_, record) => (
                <span>
                    {record.fromBranchName || "--"} → {record.toBranchName || "--"}
                </span>
            ),
        },
        {
            title: "Km bắt đầu",
            dataIndex: "currentMileage",
            key: "currentMileage",
            render: (value) => value != null ? `${value} km` : "--",
        },
        {
            title: "Vai trò",
            key: "role",
            render: (_, record) => (
                <Tag color={record.isSourceBranch ? "blue" : "orange"}>
                    {record.isSourceBranch ? "Chi nhánh gốc" : "Chi nhánh đích"}
                </Tag>
            ),
        },
        {
            title: "Thao tác",
            key: "actions",
            render: (_, record) => (
                !record.isSourceBranch ? (
                    <Button danger onClick={() => handleEndTrip(record)}>
                        Kết thúc chuyến
                    </Button>
                ) : (
                    <Text type="secondary">Chờ chi nhánh đích</Text>
                )
            ),
        },
    ]

    const historyColumns = [
        {
            title: "Mã trip",
            dataIndex: "tripId",
            key: "tripId",
        },
        {
            title: "Tài xế",
            dataIndex: "driverName",
            key: "driverName",
            render: (value) => value || "--",
        },
        {
            title: "Bắt đầu",
            dataIndex: "startTime",
            key: "startTime",
            render: (value) => formatDateTime(value),
        },
        {
            title: "Kết thúc",
            dataIndex: "endTime",
            key: "endTime",
            render: (value) => value ? formatDateTime(value) : "Đang chạy",
        },
        {
            title: "Lộ trình",
            key: "route",
            render: (_, record) => `${record.origin || "--"} → ${record.destination || "--"}`,
        },
        {
            title: "Số km",
            key: "mileage",
            render: (_, record) => `${record.startMileage ?? "--"} → ${record.endMileage ?? "--"}`,
        },
        {
            title: "Điều chuyển",
            key: "transfer",
            render: (_, record) => {
                if (!record.fromBranchName && !record.toBranchName) return "--"
                return `${record.fromBranchName || "--"} → ${record.toBranchName || "--"}`
            },
        },
    ]

    const historyTrips = historyData?.trips || []

    return (
        <div className="trip-module">
            <div className="trip-header">
                <div>
                    <Title level={3}>Quản lý vận hành điều chuyển</Title>
                    <Text type="secondary">Theo dõi và vận hành chuyến xe điều chuyển giữa các chi nhánh.</Text>
                </div>
            </div>

            <Tabs
                activeKey={activeMainTab}
                onChange={setActiveMainTab}
                items={[
                    {
                        key: "manage",
                        label: "Quản lý vận hành",
                        children: (
                            <div className="trip-card">
                                <Tabs
                                    activeKey={manageTab}
                                    onChange={setManageTab}
                                    items={[
                                        { key: "pending", label: `Chờ điều chuyển (${pendingTransfers.length})` },
                                        { key: "moving", label: `Đang di chuyển (${inTransitTransfers.length})` },
                                    ]}
                                />

                                {manageTab === "pending" ? (
                                    <Table
                                        rowKey={(record) => record.transferPlanId}
                                        columns={pendingColumns}
                                        dataSource={pendingTransfers}
                                        loading={manageLoading}
                                        locale={{ emptyText: manageLoading ? <Spin /> : <Empty description="Không có kế hoạch điều chuyển nào đang chờ" /> }}
                                        pagination={{ pageSize: 10 }}
                                    />
                                ) : (
                                    <Table
                                        rowKey={(record) => record.transferPlanId}
                                        columns={inTransitColumns}
                                        dataSource={inTransitTransfers}
                                        loading={manageLoading}
                                        locale={{ emptyText: manageLoading ? <Spin /> : <Empty description="Không có xe đang di chuyển" /> }}
                                        pagination={{ pageSize: 10 }}
                                    />
                                )}
                            </div>
                        ),
                    },
                    {
                        key: "history",
                        label: "Lịch sử chuyến",
                        children: (
                            <div className="trip-card">
                                <div className="history-toolbar">
                                    <Select
                                        showSearch
                                        optionFilterProp="label"
                                        placeholder="Chọn xe để xem lịch sử"
                                        value={historyVehicleId ?? undefined}
                                        onChange={(value) => {
                                            setHistoryVehicleId(value)
                                            loadTripHistory(value)
                                        }}
                                        options={allVehicles.map((vehicle) => ({
                                            label: vehicle.licensePlate || `Xe #${vehicle.vehicleId}`,
                                            value: vehicle.vehicleId,
                                        }))}
                                        style={{ minWidth: 240 }}
                                    />
                                </div>

                                {historyLoading ? (
                                    <div className="center-loading">
                                        <Spin />
                                    </div>
                                ) : !historyData ? (
                                    <Empty description="Chọn xe để xem lịch sử chuyến" />
                                ) : (
                                    <div className="history-panel">
                                        <div className="history-info">
                                            <div className="history-info-header">Thông tin xe</div>
                                            <div className="history-info-grid">
                                                <div className="history-info-row">
                                                    <div className="history-info-label">Biển số</div>
                                                    <div className="history-info-value">{historyData.licensePlate || `Xe #${historyData.vehicleId}`}</div>
                                                </div>
                                                <div className="history-info-row">
                                                    <div className="history-info-label">Trạng thái</div>
                                                    <div className="history-info-value">{historyData.status || "--"}</div>
                                                </div>
                                                <div className="history-info-row">
                                                    <div className="history-info-label">Chi nhánh</div>
                                                    <div className="history-info-value">{historyData.currentBranchName || "--"}</div>
                                                </div>
                                                <div className="history-info-row">
                                                    <div className="history-info-label">Tài xế</div>
                                                    <div className="history-info-value">{historyData.currentDriverName || "--"}</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="history-table">
                                            <Table
                                                rowKey={(record) => record.tripId}
                                                columns={historyColumns}
                                                dataSource={historyTrips}
                                                locale={{ emptyText: <Empty description="Chưa có chuyến nào" /> }}
                                                pagination={{ pageSize: 8 }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ),
                    },
                ]}
            />

            <StartTripModal
                open={startModalOpen}
                transfer={selectedTransfer}
                onCancel={() => setStartModalOpen(false)}
                onSuccess={() => {
                    setStartModalOpen(false)
                    loadPendingTransfers()
                    toast.success("Bắt đầu chuyến điều chuyển thành công.")
                }}
            />

            <EndTripModal
                open={endModalOpen}
                tripId={selectedTrip}
                startMileage={selectedStartMileage}
                plannedArrivalDate={selectedPlannedArrivalDate}
                onCancel={() => setEndModalOpen(false)}
                onSuccess={() => {
                    setEndModalOpen(false)
                    loadInTransitTransfers()
                    toast.success("Kết thúc chuyến thành công. Xe đã được chuyển chi nhánh.")
                }}
            />
        </div>
    )
}
