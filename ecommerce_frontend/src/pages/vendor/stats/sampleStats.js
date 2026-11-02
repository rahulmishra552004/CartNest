//static sample data for the stats page.
//replace it with the response from your stats endpoint; the components only read these fields.
//all money is in cents, the same as the rest of the API.
export const SAMPLE_STATS = {
  summary: {
    totalRevenueCents: 1284950,
    unitsSold: 342,
    //distinct orders: one order can contain several of the vendor's items
    orderCount: 152,
    averageOrderValueCents: 8454,
    //% change vs the previous period of the same length; leave a field out (or null) to hide it
    revenueChangePercent: 12.4,
    unitsSoldChangePercent: 9.8,
    orderCountChangePercent: 15.0,
    averageOrderValueChangePercent: -2.3,
  },

  //order items by deliveryStatus
  statusCounts: {
    preparing: 9,
    shipping: 14,
    delivered: 164,
  },
  //items not delivered whose estimatedDeliveryTimeMs has passed
  overdueCount: 3,

  revenueByDay: [
    { date: '2026-10-03', revenueCents: 39222 },
    { date: '2026-10-04', revenueCents: 27886 },
    { date: '2026-10-05', revenueCents: 49875 },
    { date: '2026-10-06', revenueCents: 60659 },
    { date: '2026-10-07', revenueCents: 21164 },
    { date: '2026-10-08', revenueCents: 28747 },
    { date: '2026-10-09', revenueCents: 53119 },
    { date: '2026-10-10', revenueCents: 24168 },
    { date: '2026-10-11', revenueCents: 41965 },
    { date: '2026-10-12', revenueCents: 62193 },
    { date: '2026-10-13', revenueCents: 21801 },
    { date: '2026-10-14', revenueCents: 51255 },
    { date: '2026-10-15', revenueCents: 32070 },
    { date: '2026-10-16', revenueCents: 26457 },
    { date: '2026-10-17', revenueCents: 23632 },
    { date: '2026-10-18', revenueCents: 46419 },
    { date: '2026-10-19', revenueCents: 45405 },
    { date: '2026-10-20', revenueCents: 28578 },
    { date: '2026-10-21', revenueCents: 33772 },
    { date: '2026-10-22', revenueCents: 23944 },
    { date: '2026-10-23', revenueCents: 60113 },
    { date: '2026-10-24', revenueCents: 45821 },
    { date: '2026-10-25', revenueCents: 81240 },
    { date: '2026-10-26', revenueCents: 55057 },
    { date: '2026-10-27', revenueCents: 26113 },
    { date: '2026-10-28', revenueCents: 38630 },
    { date: '2026-10-29', revenueCents: 59328 },
    { date: '2026-10-30', revenueCents: 59119 },
    { date: '2026-10-31', revenueCents: 56207 },
    { date: '2026-11-01', revenueCents: 60991 },
  ],

  //sorted by revenue, highest first
  topProducts: [
    {
      id: '77a845b1-16ed-4eac-bdf9-5b591882113d',
      name: 'Countertop Push Blender - Black',
      image: '/media/products/countertop-push-blender-black.jpg',
      unitsSold: 21,
      revenueCents: 225687,
    },
    {
      id: '4e37dd03-3b23-4bc6-9ff8-44e112a92c64',
      name: 'Non-Stick Cook Set With Lids - 4 Pieces',
      image: '/media/products/non-stick-cooking-set-4-pieces.jpg',
      unitsSold: 26,
      revenueCents: 176722,
    },
    {
      id: '58b4fc92-e98c-42aa-8c55-b6b79996769a',
      name: 'Waterproof Knit Athletic Sneakers - Gray',
      image: '/media/products/knit-athletic-sneakers-gray.jpg',
      unitsSold: 29,
      revenueCents: 156310,
    },
    {
      id: '19c6a64a-5463-4d45-9af8-e41140a4100c',
      name: 'Duvet Cover Set, Diamond Pattern',
      image: '/media/products/duvet-cover-set-gray-queen.jpg',
      unitsSold: 31,
      revenueCents: 136369,
    },
    {
      id: '4df68c27-fd59-4a6a-bbd1-e754ddb6d53c',
      name: "Men's Navigator Sunglasses",
      image: '/media/products/men-navigator-sunglasses-black.jpg',
      unitsSold: 33,
      revenueCents: 121770,
    },
  ],

  lowStockThreshold: 5,
  //products with inventoryStock <= lowStockThreshold, lowest first
  lowStockProducts: [
    {
      id: '10ed8504-57db-433c-b0a3-fc71a35c88a1',
      name: 'Athletic Skateboard Shoes - Gray',
      image: '/media/products/athletic-skateboard-shoes-gray.jpg',
      inventoryStock: 0,
    },
    {
      id: '3ebe75dc-64d2-4137-8860-1f5a963e534b',
      name: '2 Piece White Dinner Plate Set',
      image: '/media/products/elegant-white-dinner-plate-set.jpg',
      inventoryStock: 2,
    },
    {
      id: '3fdfe8d6-9a15-4979-b459-585b0d0545b9',
      name: 'Laundry Detergent Tabs, 50 Loads',
      image: '/media/products/laundry-detergent-tabs.jpg',
      inventoryStock: 4,
    },
    {
      id: '82bb68d7-ebc9-476a-989c-c78a40ee5cd9',
      name: "Women's Summer Jean Shorts",
      image: '/media/products/women-summer-jean-shorts.jpg',
      inventoryStock: 5,
    },
  ],
};
