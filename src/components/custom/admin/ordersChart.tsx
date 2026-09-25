import { AreaChart } from '@tremor/react';

const OrdersAreaChart = ({ data }: { data: { date: string; Bookings: number }[] }) => {
  return (
    <div className='rounded-lg border text-card-foreground shadow-sm p-3'>
      <h3 className="text-sm font-semibold tracking-widest text-tremor-content-strong">New bookings, last 14 days</h3>
      <AreaChart
        className="mt-4 h-40"
        data={data}
        index="date"
        categories={['Bookings']}
        colors={['blue']}
        yAxisWidth={30}
        allowDecimals={false}
        showLegend={false}
      />
    </div>
  );
}

export default OrdersAreaChart;
