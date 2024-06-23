import { AreaChart, Card, Title } from '@tremor/react';

const chartdata = [
  {
    date: 'Sat',
    Orders: 1,
  },
  {
    date: 'Sun',
    Orders: 2,
  },
  {
    date: 'Mon',
    Orders: 4,
  },
  {
    date: 'Tue',
    Orders: 3,
  },
  {
    date: 'Wed',
    Orders: 8,
  },
  {
    date: 'Thur',
    Orders: 9,
  },
  {
    date: 'Fri',
    Orders: 9,
  }
];

const OrdersAreaChart = () => {
  const customTooltip = (props:any) => {
    const { payload, active } = props;
    if (!active || !payload) return null;
    return (
      <div className="w-56 rounded-tremor-default border border-tremor-border bg-tremor-background p-2 text-tremor-default shadow-tremor-dropdown">
        {payload.map((category:any, idx:number) => (
          <div key={idx} className="flex flex-1 space-x-2.5">
            <div
              className={`flex w-1 flex-col bg-${category.color}-500 rounded`}
            />
            <div className="space-y-1">
              <p className="text-tremor-content">{category.dataKey}</p>
              <p className="font-medium text-tremor-content-emphasis">
                {category.value} Bookings
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  };
  return (
    <div className='rounded-lg border text-card-foreground shadow-sm p-3'>
      <h3 className="text-sm font-semibold tracking-widest text-tremor-content-strong dark:text-dark-tremor-content-strong">Total Orders</h3>
      <AreaChart
        className="mt-4 h-32"
        data={chartdata}
        index="date"
        categories={['Orders']}
        colors={['blue']}
        yAxisWidth={30}
        customTooltip={customTooltip}
        showLegend={false}
      />
    </div>
  );
}

export default OrdersAreaChart;