import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
  import { FaLongArrowAltUp } from "react-icons/fa";
  import { FaLongArrowAltDown } from "react-icons/fa";

interface revenueCard {
    earning: number,
    newBookingToday: number,
    completedServiceToday: number
}

const revenue:revenueCard = {
    earning: 1000,
    newBookingToday: 2,
    completedServiceToday: 1
}

const RevenueCard = () => {
    return (
        <div className="mb-3">
            <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
                <Card x-chunk="dashboard-01-chunk-0" className={`${revenue.earning>0? 'bg-green-200': 'bg-amber-200'}`}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex justify-between">
                            <span>Today Revenue</span>
                            <span className="flex items-center">₹ {revenue.earning} <FaLongArrowAltUp className="text-green-500"/></span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                            <div className="text-sm font-medium flex justify-between pb-2">
                                <span>Today New Bookings</span>
                                <span className="flex items-center">{revenue.newBookingToday} <FaLongArrowAltUp className="text-green-500"/></span>
                            </div>
                            <div className="text-sm font-medium flex justify-between pb-2">
                                <span>Today Completed Service</span>
                                <span className="flex items-center">{revenue.completedServiceToday} <FaLongArrowAltUp className="text-green-500"/></span>
                            </div>
                    </CardContent>
                </Card>
          </div>
        </div>
    )
}

export default RevenueCard